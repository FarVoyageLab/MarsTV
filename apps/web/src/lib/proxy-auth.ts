// HMAC proxy URL generation for Vite SPA.
// PROXY_SECRET is only used server-side (API routes), never exposed to client.
// The client uses pre-signed URLs from the API.

export interface SignedUrl {
	token: string;
	expiresAt: number;
}

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
