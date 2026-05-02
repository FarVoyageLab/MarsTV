// ============================================================================
// @marstv/api — Unified typed API client for all MarsTV apps.
//
// Usage:
//   import { createApiClient, searchCms } from '@marstv/api';
//   const client = createApiClient('');          // same-origin (web)
//   const results = await searchCms(client, 'heimuer', '蝙蝠侠');
// ============================================================================

export {
	ApiClient,
	ApiError,
	ApiTimeoutError,
	createApiClient,
} from "./client.js";
export type { ApiClientOptions } from "./client.js";

export type * from "./types.js";

export * from "./endpoints/index.js";
