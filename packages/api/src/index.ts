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
} from "@marstv/api/client";
export type { ApiClientOptions } from "@marstv/api/client";

export type * from "@marstv/api/types";

export * from "@marstv/api/endpoints/index";
