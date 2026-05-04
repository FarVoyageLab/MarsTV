// ============================================================================
// Auth API endpoint — site-wide password login.
// ============================================================================

import type { ApiClient } from "@marstv/api/client";
import type { LoginRequestBody, LoginResponseData } from "@marstv/api/types";

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
