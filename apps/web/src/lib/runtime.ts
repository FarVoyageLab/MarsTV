import { MarsTvApiClient } from "@marstv/api-client";

const API_ORIGIN_KEY = "marstv.apiOrigin.v1";
const TOKEN_KEY = "marstv.session.v1";

export function apiOrigin(): string {
  return localStorage.getItem(API_ORIGIN_KEY)
    ?? import.meta.env.VITE_MARSTV_API_ORIGIN
    ?? "";
}

export function setApiOrigin(origin: string): void {
  localStorage.setItem(API_ORIGIN_KEY, origin.replace(/\/$/u, ""));
}

export function sessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export const api = new MarsTvApiClient({
  baseUrl: apiOrigin(),
  accessToken: sessionToken
});

export function registerServiceWorker(): void {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }
}
