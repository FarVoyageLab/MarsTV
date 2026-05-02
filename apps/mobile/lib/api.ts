// ============================================================================
// MarsTV mobile API client configuration.
//
// The mobile app connects to a remote MarsTV server. Set EXPO_PUBLIC_API_URL
// at build time to point at your deployment, e.g.:
//   EXPO_PUBLIC_API_URL=https://marstv.example.com
// Defaults to localhost:3100 (the web dev server port).
// ============================================================================

import { createApiClient } from "@marstv/api";

export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3100";

export const api = createApiClient(API_BASE_URL, {
	timeoutMs: 15000,
});
