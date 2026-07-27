import { randomBytes } from "node:crypto";
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
import type { ServerPrincipal } from "./store";
import { NodeStore } from "./store";

function relyingParty(): { origin: string; id: string } {
  const origin = new URL(process.env.MARSTV_PUBLIC_ORIGIN || "http://localhost:8787");
  return { origin: origin.origin, id: origin.hostname };
}

export async function registrationOptions(store: NodeStore, principal: ServerPrincipal) {
  const user = store.user(principal.userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  const rp = relyingParty();
  const options = await generateRegistrationOptions({
    rpName: "MarsTV",
    rpID: rp.id,
    userName: user.id,
    userDisplayName: user.displayName,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    excludeCredentials: store.listPasskeys(user.id).map((credential) => ({
      id: credential.credentialId,
      transports: credential.transports as AuthenticatorTransportFuture[]
    }))
  });
  store.putChallenge(`register:${user.id}`, options.challenge);
  return options;
}

export async function registerPasskey(
  store: NodeStore,
  principal: ServerPrincipal,
  response: RegistrationResponseJSON
) {
  const challenge = store.takeChallenge(`register:${principal.userId}`);
  if (!challenge) throw new Error("PASSKEY_CHALLENGE_EXPIRED");
  const rp = relyingParty();
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
  store.savePasskey({
    userId: principal.userId,
    credentialId: credential.id,
    publicKey: new Uint8Array(credential.publicKey),
    counter: credential.counter,
    transports: response.response.transports ?? credential.transports ?? []
  });
  return { verified: true, credentialId: credential.id };
}

export async function authenticationOptions(store: NodeStore) {
  const requestId = randomBytes(18).toString("base64url");
  const options = await generateAuthenticationOptions({
    rpID: relyingParty().id,
    userVerification: "required"
  });
  store.putChallenge(`authenticate:${requestId}`, options.challenge);
  return { requestId, options };
}

export async function authenticatePasskey(
  store: NodeStore,
  requestId: string,
  response: AuthenticationResponseJSON
) {
  const challenge = store.takeChallenge(`authenticate:${requestId}`);
  if (!challenge) throw new Error("PASSKEY_CHALLENGE_EXPIRED");
  const credential = store.passkey(response.id);
  if (!credential) throw new Error("PASSKEY_NOT_FOUND");
  const rp = relyingParty();
  const publicKey = new Uint8Array(credential.publicKey.byteLength);
  publicKey.set(credential.publicKey);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.id,
    credential: {
      id: credential.credentialId,
      publicKey,
      counter: credential.counter,
      transports: credential.transports as AuthenticatorTransportFuture[]
    },
    requireUserVerification: true
  });
  if (!verification.verified) throw new Error("PASSKEY_AUTHENTICATION_REJECTED");
  store.updatePasskeyCounter(credential.id, verification.authenticationInfo.newCounter);
  return store.createSession(credential.userId, credential.householdId, credential.role);
}
