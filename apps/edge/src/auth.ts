import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON
} from "@simplewebauthn/server";
import type { Env, SessionPrincipal } from "./env";
import { relyingParty } from "./origin";
import { Repository } from "./repository";
import { randomToken, sha256 } from "./security";

interface PasskeyRow {
  id: string;
  user_id: string;
  household_id: string;
  role: SessionPrincipal["role"];
  credential_id: string;
  public_key: ArrayBuffer;
  counter: number;
  transports: string;
}

export async function registrationOptions(
  env: Env,
  principal: SessionPrincipal,
  requestUrl: string
): Promise<Awaited<ReturnType<typeof generateRegistrationOptions>>> {
  const user = await env.DB.prepare(
    "SELECT display_name FROM users WHERE id = ?1"
  ).bind(principal.userId).first<{ display_name: string }>();
  if (!user) throw new Error("USER_NOT_FOUND");
  const credentials = await env.DB.prepare(
    "SELECT credential_id, transports FROM passkeys WHERE user_id = ?1"
  ).bind(principal.userId).all<{ credential_id: string; transports: string }>();
  const rp = relyingParty(env, requestUrl);
  const options = await generateRegistrationOptions({
    rpName: "MarsTV",
    rpID: rp.id,
    userName: principal.userId,
    userDisplayName: user.display_name,
    userID: new TextEncoder().encode(principal.userId),
    attestationType: "none",
    timeout: 60_000,
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required"
    },
    excludeCredentials: credentials.results.map((credential) => ({
      id: credential.credential_id,
      transports: JSON.parse(credential.transports) as AuthenticatorTransportFuture[]
    }))
  });
  await env.CACHE.put(`webauthn:register:${principal.userId}`, options.challenge, {
    expirationTtl: 300
  });
  return options;
}

export async function registerPasskey(
  env: Env,
  principal: SessionPrincipal,
  response: RegistrationResponseJSON,
  requestUrl: string
): Promise<{ verified: true; credentialId: string }> {
  const challengeKey = `webauthn:register:${principal.userId}`;
  const challenge = await env.CACHE.get(challengeKey);
  if (!challenge) throw new Error("PASSKEY_CHALLENGE_EXPIRED");
  await env.CACHE.delete(challengeKey);
  const rp = relyingParty(env, requestUrl);
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.id,
    requireUserVerification: true
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("PASSKEY_REGISTRATION_REJECTED");
  }
  const credential = verification.registrationInfo.credential;
  await env.DB.prepare(`
    INSERT INTO passkeys
      (id, user_id, credential_id, public_key, counter, transports, created_at, last_used_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL)
    ON CONFLICT(credential_id) DO UPDATE SET
      public_key = excluded.public_key,
      counter = excluded.counter,
      transports = excluded.transports
  `).bind(
    crypto.randomUUID(),
    principal.userId,
    credential.id,
    new Uint8Array(credential.publicKey).buffer,
    credential.counter,
    JSON.stringify(response.response.transports ?? credential.transports ?? []),
    new Date().toISOString()
  ).run();
  return { verified: true, credentialId: credential.id };
}

export async function authenticationOptions(
  env: Env,
  requestUrl: string
): Promise<{
  requestId: string;
  options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
}> {
  const requestId = randomToken(18);
  const rp = relyingParty(env, requestUrl);
  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    userVerification: "required",
    timeout: 60_000
  });
  await env.CACHE.put(`webauthn:authenticate:${requestId}`, options.challenge, {
    expirationTtl: 300
  });
  return { requestId, options };
}

export async function authenticatePasskey(
  env: Env,
  requestId: string,
  response: AuthenticationResponseJSON,
  requestUrl: string
): Promise<{ token: string; expiresAt: string }> {
  const challengeKey = `webauthn:authenticate:${requestId}`;
  const challenge = await env.CACHE.get(challengeKey);
  if (!challenge) throw new Error("PASSKEY_CHALLENGE_EXPIRED");
  await env.CACHE.delete(challengeKey);
  const row = await env.DB.prepare(`
    SELECT
      passkeys.id,
      passkeys.user_id,
      users.household_id,
      users.role,
      passkeys.credential_id,
      passkeys.public_key,
      passkeys.counter,
      passkeys.transports
    FROM passkeys
    JOIN users ON users.id = passkeys.user_id
    WHERE passkeys.credential_id = ?1
  `).bind(response.id).first<PasskeyRow>();
  if (!row) throw new Error("PASSKEY_NOT_FOUND");
  const rp = relyingParty(env, requestUrl);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.id,
    credential: {
      id: row.credential_id,
      publicKey: new Uint8Array(row.public_key),
      counter: row.counter,
      transports: JSON.parse(row.transports) as AuthenticatorTransportFuture[]
    },
    requireUserVerification: true
  });
  if (!verification.verified) throw new Error("PASSKEY_AUTHENTICATION_REJECTED");
  await env.DB.prepare(`
    UPDATE passkeys SET counter = ?1, last_used_at = ?2 WHERE id = ?3 AND counter <= ?1
  `).bind(verification.authenticationInfo.newCounter, new Date().toISOString(), row.id).run();
  return new Repository(env).createSession({
    userId: row.user_id,
    householdId: row.household_id,
    role: row.role
  });
}

export async function issueRecoveryCodes(
  env: Env,
  principal: SessionPrincipal
): Promise<string[]> {
  const codes = Array.from({ length: 10 }, () => {
    const raw = randomToken(8).replace(/[^A-Za-z0-9]/gu, "").toUpperCase().padEnd(8, "X").slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  const now = new Date().toISOString();
  const statements = [
    env.DB.prepare("DELETE FROM recovery_codes WHERE user_id = ?1").bind(principal.userId)
  ];
  for (const code of codes) {
    statements.push(env.DB.prepare(`
      INSERT INTO recovery_codes (id, user_id, code_hash, created_at, used_at)
      VALUES (?1, ?2, ?3, ?4, NULL)
    `).bind(crypto.randomUUID(), principal.userId, await sha256(code), now));
  }
  await env.DB.batch(statements);
  return codes;
}

export async function authenticateRecoveryCode(
  env: Env,
  rawCode: string
): Promise<{ token: string; expiresAt: string }> {
  const code = rawCode.trim().toUpperCase();
  const codeHash = await sha256(code);
  const row = await env.DB.prepare(`
    SELECT recovery_codes.id, users.id AS user_id, users.household_id, users.role
    FROM recovery_codes
    JOIN users ON users.id = recovery_codes.user_id
    WHERE recovery_codes.code_hash = ?1 AND recovery_codes.used_at IS NULL
  `).bind(codeHash).first<{
    id: string;
    user_id: string;
    household_id: string;
    role: SessionPrincipal["role"];
  }>();
  if (!row) throw new Error("RECOVERY_CODE_INVALID");
  const claimed = await env.DB.prepare(`
    UPDATE recovery_codes SET used_at = ?1 WHERE id = ?2 AND used_at IS NULL
  `).bind(new Date().toISOString(), row.id).run();
  if (claimed.meta.changes !== 1) throw new Error("RECOVERY_CODE_REPLAYED");
  return new Repository(env).createSession({
    userId: row.user_id,
    householdId: row.household_id,
    role: row.role
  });
}
