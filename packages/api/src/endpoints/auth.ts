// ============================================================================
// Auth API endpoint — site-wide password login.
// ============================================================================

import type { ApiClient } from "../client.js";
import type { LoginRequestBody, LoginResponseData } from "../types.js";

/** Authenticate with the site password. Returns success + sets a session cookie. */
export function login(
	client: ApiClient,
	password: string,
	signal?: AbortSignal,
): Promise<LoginResponseData> {
	return client.post<LoginResponseData>(
		"/api/login",
		{ password } satisfies LoginRequestBody,
		signal,
	);
}
