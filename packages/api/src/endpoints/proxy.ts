// ============================================================================
// Proxy URL builder — constructs signed /api/proxy/m3u8 URLs.
//
// The HMAC signature itself MUST be generated server-side (PROXY_SECRET is
// never exposed to clients). This module only assembles the final URL from
// a pre-signed token provided by the server.
// ============================================================================

import type { ApiClient } from "@marstv/api/client";

export interface SignedUrl {
	token: string;
	expiresAt: number;
}

/**
 * Build a proxy URL that routes an m3u8 stream through the server-side
 * proxy for bandwidth conservation / IP masking.
 *
 * @param upstreamUrl - The original m3u8 URL from the CMS source.
 * @param token - HMAC signature pre-generated server-side.
 * @param expiresAt - Unix-ms timestamp when the signature expires.
 */
export function buildProxyUrl(
	upstreamUrl: string,
	token: string,
	expiresAt: number,
): string {
	const q = new URLSearchParams({
		u: upstreamUrl,
		e: String(expiresAt),
		s: token,
	});
	return `/api/proxy/m3u8?${q.toString()}`;
}

/**
 * Stream raw m3u8 content through the proxy.
 * Unlike other endpoints this returns a Response, not JSON.
 */
export function fetchProxyPlaylist(
	client: ApiClient,
	upstreamUrl: string,
	token: string,
	expiresAt: number,
	signal?: AbortSignal,
): Promise<Response> {
	return client.fetchRaw(
		"/api/proxy/m3u8",
		{
			u: upstreamUrl,
			e: expiresAt,
			s: token,
		},
		signal,
	);
}
