import type { Env } from "./env";

export function resolvePublicOrigin(env: Pick<Env, "MARSTV_PUBLIC_ORIGIN">, requestUrl: string): string {
  const configured = env.MARSTV_PUBLIC_ORIGIN?.trim();
  const origin = new URL(configured || requestUrl);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost" && origin.hostname !== "127.0.0.1") {
    throw new Error("PUBLIC_ORIGIN_HTTPS_REQUIRED");
  }
  return origin.origin;
}

export function relyingParty(
  env: Pick<Env, "MARSTV_PUBLIC_ORIGIN">,
  requestUrl: string
): { origin: string; id: string } {
  const origin = new URL(resolvePublicOrigin(env, requestUrl));
  return { origin: origin.origin, id: origin.hostname };
}
