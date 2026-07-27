const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
}

export function randomToken(bytes = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function keyBytes(secret: string): Uint8Array {
  try {
    const binary = atob(secret.replace(/-/gu, "+").replace(/_/gu, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (bytes.byteLength === 32) return bytes;
  } catch {
    // Derive a stable development key below.
  }
  return encoder.encode(secret.padEnd(32, "0").slice(0, 32));
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

export async function encryptJson(secret: string, value: unknown): Promise<string> {
  const key = await crypto.subtle.importKey("raw", arrayBuffer(keyBytes(secret)), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: arrayBuffer(iv) },
    key,
    arrayBuffer(plaintext)
  ));
  return `${base64Url(iv)}.${base64Url(ciphertext)}`;
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export async function decryptJson<T>(secret: string, value: string): Promise<T> {
  const [rawIv, rawCiphertext] = value.split(".");
  if (!rawIv || !rawCiphertext) throw new Error("INVALID_CIPHERTEXT");
  const key = await crypto.subtle.importKey("raw", arrayBuffer(keyBytes(secret)), "AES-GCM", false, ["decrypt"]);
  const iv = decodeBase64Url(rawIv);
  const ciphertext = decodeBase64Url(rawCiphertext);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: arrayBuffer(iv) },
    key,
    arrayBuffer(ciphertext)
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}

const privateIpv4 = [
  /^0\./u,
  /^10\./u,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./u,
  /^127\./u,
  /^169\.254\./u,
  /^172\.(1[6-9]|2\d|3[01])\./u,
  /^192\.168\./u,
  /^198\.1[89]\./u,
  /^22[4-9]\./u,
  /^23\d\./u,
  /^24\d\./u,
  /^25[0-5]\./u
];

export function isBlockedHostname(hostname: string): boolean {
  const value = hostname.toLocaleLowerCase().replace(/\.$/u, "");
  if (value === "localhost" || value.endsWith(".localhost") || value.endsWith(".local")) return true;
  if (value === "::1" || value === "[::1]" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80")) {
    return true;
  }
  return privateIpv4.some((pattern) => pattern.test(value));
}

export function assertAllowedUrl(rawUrl: string, allowedHosts: readonly string[]): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("SOURCE_HTTPS_REQUIRED");
  if (url.username || url.password) throw new Error("SOURCE_CREDENTIALS_IN_URL");
  if (isBlockedHostname(url.hostname)) throw new Error("SOURCE_PRIVATE_NETWORK_BLOCKED");
  const normalized = new Set(allowedHosts.map((host) => host.toLocaleLowerCase()));
  if (!normalized.has(url.hostname.toLocaleLowerCase())) throw new Error("SOURCE_HOST_NOT_ALLOWED");
  return url;
}

export async function guardedFetch(
  rawUrl: string,
  options: {
    allowedHosts: readonly string[];
    timeoutMs: number;
    headers?: Record<string, string>;
    method?: "GET" | "POST";
    body?: string;
    maxBytes?: number;
  }
): Promise<{ body: string; contentType: string; status: number; finalUrl: string }> {
  let url = assertAllowedUrl(rawUrl, options.allowedHosts);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      const init: RequestInit = {
        method: options.method ?? "GET",
        redirect: "manual",
        signal: controller.signal
      };
      if (options.headers) init.headers = options.headers;
      if (options.body) init.body = options.body;
      const response = await fetch(url, init);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects === 3) throw new Error("SOURCE_REDIRECT_REJECTED");
        url = assertAllowedUrl(new URL(location, url).toString(), options.allowedHosts);
        continue;
      }
      if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
      const maxBytes = options.maxBytes ?? 5_000_000;
      const declared = Number(response.headers.get("content-length") ?? "0");
      if (declared > maxBytes) throw new Error("SOURCE_RESPONSE_TOO_LARGE");
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxBytes) throw new Error("SOURCE_RESPONSE_TOO_LARGE");
      return {
        body: decoder.decode(buffer),
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        status: response.status,
        finalUrl: url.toString()
      };
    }
    throw new Error("SOURCE_REDIRECT_REJECTED");
  } finally {
    clearTimeout(timer);
  }
}

export function redactLog(value: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  const permitted = new Set([
    "requestId",
    "route",
    "method",
    "status",
    "durationMs",
    "sourceId",
    "jobType",
    "errorCode"
  ]);
  for (const [key, entry] of Object.entries(value)) {
    if (permitted.has(key)) safe[key] = entry;
  }
  return safe;
}
