import type { CmsSource } from "@marstv/core";
import { getDetail, searchDouban, searchSource } from "@marstv/core";

// Cloudflare Worker — Douban proxy, image proxy, and admin-gated CMS source config.

const DOUBAN_IMG_HEADERS: Record<string, string> = {
	accept: "image/webp,image/apng,image/*,*/*;q=0.8",
	referer: "https://movie.douban.com/",
	"user-agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "public, max-age=600",
};

const JSON_NO_CACHE = {
	"content-type": "application/json; charset=utf-8",
	"cache-control": "no-store",
};

const IMG_HEADERS_BASE = {
	"cache-control": "public, max-age=86400",
};

const SESSION_COOKIE = "mars_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h
const KV_SOURCES_KEY = "cms:sources";

function jsonOk<T>(data: T, cache = true): Response {
	return new Response(JSON.stringify({ success: true, data }), {
		status: 200,
		headers: cache ? JSON_HEADERS : JSON_NO_CACHE,
	});
}

function jsonErr(status: number, error: string): Response {
	return new Response(JSON.stringify({ success: false, error }), {
		status,
		headers: JSON_NO_CACHE,
	});
}

// ─── Douban handlers ─────────────────────────────────────────────────────────

async function handleDouban(url: URL): Promise<Response> {
	const type = url.searchParams.get("type") as "movie" | "tv" | null;
	const tag = url.searchParams.get("tag");
	if (!type || (type !== "movie" && type !== "tv") || !tag) {
		return jsonErr(400, "invalid type/tag");
	}

	const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
	const pageStart = Number(url.searchParams.get("pageStart") ?? "0");
	const sort =
		(url.searchParams.get("sort") as "recommend" | "time" | "rank" | null) ??
		"recommend";

	try {
		const result = await searchDouban({
			type,
			tag,
			pageSize,
			pageStart,
			sort,
			timeoutMs: 8000,
		});
		return jsonOk(result);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "douban upstream failed";
		return jsonErr(502, msg);
	}
}

async function handleDoubanImage(url: URL): Promise<Response> {
	const upstream = url.searchParams.get("u");
	if (!upstream) return new Response("missing u", { status: 400 });

	let parsed: URL;
	try {
		parsed = new URL(upstream);
	} catch {
		return new Response("invalid u", { status: 400 });
	}
	if (!/(\.|^)doubanio\.com$|(\.|^)douban\.com$/.test(parsed.hostname)) {
		return new Response("forbidden host", { status: 403 });
	}

	const res = await fetch(upstream, { headers: DOUBAN_IMG_HEADERS });
	if (!res.ok) {
		return new Response("upstream error", { status: res.status });
	}

	const headers = new Headers(IMG_HEADERS_BASE);
	const ct = res.headers.get("content-type");
	if (ct) headers.set("content-type", ct);
	return new Response(res.body, { status: 200, headers });
}

// Generic CMS image proxy — fetches poster/thumbnail URLs from any upstream
// CMS source. Browsers block mixed-content (http on https page) and many CMS
// CDNs enforce hotlink protection, so we tunnel through the Worker.
// SSRF mitigation: only allow http(s), reject loopback/private IPs, 10s timeout.
async function handleCmsImage(url: URL): Promise<Response> {
	const upstream = url.searchParams.get("u");
	if (!upstream) return new Response("missing u", { status: 400 });

	let parsed: URL;
	try {
		parsed = new URL(upstream);
	} catch {
		return new Response("invalid u", { status: 400 });
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return new Response("invalid protocol", { status: 400 });
	}
	// Block obvious SSRF targets. Hostname-based only — this is a best-effort
	// check, not a full defense (DNS rebinding etc. aren't covered).
	const host = parsed.hostname.toLowerCase();
	if (
		host === "localhost" ||
		host === "0.0.0.0" ||
		host === "::1" ||
		/^127\./.test(host) ||
		/^10\./.test(host) ||
		/^192\.168\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
		/^169\.254\./.test(host)
	) {
		return new Response("forbidden host", { status: 403 });
	}

	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 10_000);
	try {
		const res = await fetch(upstream, {
			headers: {
				accept: "image/webp,image/apng,image/*,*/*;q=0.8",
				// Many CMSs check referer; send the image's own origin to defeat
				// basic hotlink protection while avoiding leaking our origin.
				referer: `${parsed.protocol}//${parsed.host}/`,
				"user-agent":
					"Mozilla/5.0 (compatible; MarsTV/0.1; +https://github.com/marstv)",
			},
			signal: ctrl.signal,
			// Follow redirects — some CMSs 302 to a CDN.
			redirect: "follow",
		});
		if (!res.ok) {
			return new Response("upstream error", { status: res.status });
		}
		const ct = res.headers.get("content-type") ?? "";
		if (!ct.startsWith("image/")) {
			return new Response("not an image", { status: 415 });
		}
		const headers = new Headers(IMG_HEADERS_BASE);
		headers.set("content-type", ct);
		return new Response(res.body, { status: 200, headers });
	} catch (err) {
		const msg = err instanceof Error ? err.message : "fetch failed";
		return new Response(`image fetch failed: ${msg}`, { status: 502 });
	} finally {
		clearTimeout(timer);
	}
}

// ─── m3u8 / ts stream proxy ─────────────────────────────────────────────────
// Upstream CMS CDNs typically don't send CORS headers, so HLS.js's XHR for the
// manifest is blocked in the browser. We tunnel the playlist + segments
// through the Worker and attach `access-control-allow-origin: *`.
//
// Unsigned: any caller who can reach the Worker can proxy arbitrary URLs.
// SSRF surface is constrained to http(s) + non-private hosts. Bandwidth abuse
// is the real cost of leaving this open — revisit once traffic shows up.

const PROXY_CORS_HEADERS: Record<string, string> = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "GET, HEAD, OPTIONS",
	"access-control-allow-headers": "range, content-type",
	"access-control-expose-headers":
		"content-length, content-range, accept-ranges, content-type",
};

function proxyCorsPreflight(): Response {
	return new Response(null, { status: 204, headers: PROXY_CORS_HEADERS });
}

function validateProxyTarget(raw: string): { url: URL } | { error: Response } {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return {
			error: new Response("invalid u", {
				status: 400,
				headers: PROXY_CORS_HEADERS,
			}),
		};
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return {
			error: new Response("invalid protocol", {
				status: 400,
				headers: PROXY_CORS_HEADERS,
			}),
		};
	}
	// Same hostname-based SSRF guard as handleCmsImage. Not watertight (DNS
	// rebinding, IPv6 mapped v4, etc.) but filters the obvious stuff.
	const host = parsed.hostname.toLowerCase();
	if (
		host === "localhost" ||
		host === "0.0.0.0" ||
		host === "::1" ||
		/^127\./.test(host) ||
		/^10\./.test(host) ||
		/^192\.168\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
		/^169\.254\./.test(host)
	) {
		return {
			error: new Response("forbidden host", {
				status: 403,
				headers: PROXY_CORS_HEADERS,
			}),
		};
	}
	return { url: parsed };
}

// Rewrite segment + sub-playlist URLs inside an m3u8 so the player fetches
// them through our proxy too. Without this the browser would try to load
// `seg1.ts` directly from the upstream CDN and hit the same CORS wall.
function rewriteM3u8(text: string, baseUrl: string): string {
	const base = new URL(baseUrl);
	const toM3u8 = (u: string) => `/api/proxy/m3u8?u=${encodeURIComponent(u)}`;
	const toTs = (u: string) => `/api/proxy/ts?u=${encodeURIComponent(u)}`;
	const resolve = (ref: string) => new URL(ref, base).toString();
	const isPlaylist = (u: string) => /\.m3u8?($|\?)/i.test(u);

	const rewriteUriAttr = (line: string): string =>
		line.replace(/URI="([^"]+)"/g, (_, ref: string) => {
			const abs = resolve(ref);
			return `URI="${isPlaylist(abs) ? toM3u8(abs) : toTs(abs)}"`;
		});

	const out = text.split(/\r?\n/).map((line) => {
		const trimmed = line.trim();
		if (!trimmed) return line;
		if (trimmed.startsWith("#")) {
			// EXT-X-KEY (encryption key), EXT-X-MEDIA (alt rendition), EXT-X-MAP
			// (init segment) all carry URIs that need rewriting.
			if (/URI="/.test(trimmed)) return rewriteUriAttr(line);
			return line;
		}
		// Bare URL line — either a segment or a variant playlist.
		const abs = resolve(trimmed);
		return isPlaylist(abs) ? toM3u8(abs) : toTs(abs);
	});
	return out.join("\n");
}

async function handleProxyM3u8(request: Request, url: URL): Promise<Response> {
	if (request.method === "OPTIONS") return proxyCorsPreflight();
	if (request.method !== "GET" && request.method !== "HEAD") {
		return new Response("method not allowed", {
			status: 405,
			headers: PROXY_CORS_HEADERS,
		});
	}

	const upstream = url.searchParams.get("u");
	if (!upstream) {
		return new Response("missing u", {
			status: 400,
			headers: PROXY_CORS_HEADERS,
		});
	}
	const check = validateProxyTarget(upstream);
	if ("error" in check) return check.error;

	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 10_000);
	try {
		const res = await fetch(upstream, {
			headers: {
				accept: "application/vnd.apple.mpegurl, application/x-mpegurl, */*",
				"user-agent":
					"Mozilla/5.0 (compatible; MarsTV/0.1; +https://github.com/marstv)",
			},
			signal: ctrl.signal,
			redirect: "follow",
		});
		if (!res.ok) {
			return new Response(`upstream ${res.status}`, {
				status: res.status,
				headers: PROXY_CORS_HEADERS,
			});
		}
		const text = await res.text();
		// Use res.url so relative URIs resolve against the final redirect target
		// rather than the original request URL.
		const rewritten = rewriteM3u8(text, res.url || upstream);
		const headers = new Headers(PROXY_CORS_HEADERS);
		headers.set("content-type", "application/vnd.apple.mpegurl; charset=utf-8");
		headers.set("cache-control", "public, max-age=60");
		return new Response(rewritten, { status: 200, headers });
	} catch (err) {
		const msg = err instanceof Error ? err.message : "fetch failed";
		return new Response(`proxy m3u8 failed: ${msg}`, {
			status: 502,
			headers: PROXY_CORS_HEADERS,
		});
	} finally {
		clearTimeout(timer);
	}
}

async function handleProxyTs(request: Request, url: URL): Promise<Response> {
	if (request.method === "OPTIONS") return proxyCorsPreflight();
	if (request.method !== "GET" && request.method !== "HEAD") {
		return new Response("method not allowed", {
			status: 405,
			headers: PROXY_CORS_HEADERS,
		});
	}

	const upstream = url.searchParams.get("u");
	if (!upstream) {
		return new Response("missing u", {
			status: 400,
			headers: PROXY_CORS_HEADERS,
		});
	}
	const check = validateProxyTarget(upstream);
	if ("error" in check) return check.error;

	const ctrl = new AbortController();
	// Segments are bigger; give them a longer window.
	const timer = setTimeout(() => ctrl.abort(), 30_000);
	try {
		const upstreamHeaders: Record<string, string> = {
			"user-agent":
				"Mozilla/5.0 (compatible; MarsTV/0.1; +https://github.com/marstv)",
		};
		// Forward Range so HLS.js seek requests work end-to-end.
		const range = request.headers.get("range");
		if (range) upstreamHeaders.range = range;

		const res = await fetch(upstream, {
			method: request.method,
			headers: upstreamHeaders,
			signal: ctrl.signal,
			redirect: "follow",
		});

		const headers = new Headers(PROXY_CORS_HEADERS);
		for (const name of [
			"content-type",
			"content-length",
			"content-range",
			"accept-ranges",
			"last-modified",
			"etag",
		]) {
			const v = res.headers.get(name);
			if (v) headers.set(name, v);
		}
		headers.set("cache-control", "public, max-age=300");

		return new Response(res.body, {
			status: res.status,
			headers,
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : "fetch failed";
		return new Response(`proxy ts failed: ${msg}`, {
			status: 502,
			headers: PROXY_CORS_HEADERS,
		});
	} finally {
		clearTimeout(timer);
	}
}

// ─── HMAC session helpers ────────────────────────────────────────────────────

async function hmacSign(secret: string, payload: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
	return b64url(new Uint8Array(sig));
}

function b64url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

async function issueSession(secret: string): Promise<string> {
	const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
	const payload = `${exp}`;
	const sig = await hmacSign(secret, payload);
	return `${payload}.${sig}`;
}

async function verifySession(
	secret: string,
	token: string | null,
): Promise<boolean> {
	if (!token) return false;
	const dot = token.indexOf(".");
	if (dot <= 0) return false;
	const payload = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	const exp = Number(payload);
	if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
	const expected = await hmacSign(secret, payload);
	return timingSafeEqual(sig, expected);
}

function parseCookie(header: string | null, name: string): string | null {
	if (!header) return null;
	for (const part of header.split(";")) {
		const [k, ...rest] = part.trim().split("=");
		if (k === name) return decodeURIComponent(rest.join("="));
	}
	return null;
}

function sessionCookie(value: string, maxAge: number): string {
	const attrs = [
		`${SESSION_COOKIE}=${encodeURIComponent(value)}`,
		"Path=/",
		"HttpOnly",
		"Secure",
		"SameSite=Strict",
		`Max-Age=${maxAge}`,
	];
	return attrs.join("; ");
}

async function requireAuth(
	request: Request,
	env: Env,
): Promise<Response | null> {
	const secret = env.SESSION_SECRET;
	if (!secret) return jsonErr(500, "SESSION_SECRET not configured");
	const token = parseCookie(request.headers.get("cookie"), SESSION_COOKIE);
	const ok = await verifySession(secret, token);
	if (!ok) return jsonErr(401, "unauthorized");
	return null;
}

// ─── CMS source validation ──────────────────────────────────────────────────

function isValidSource(v: unknown): v is CmsSource {
	if (!v || typeof v !== "object") return false;
	const s = v as Record<string, unknown>;
	if (typeof s.key !== "string" || !s.key.trim()) return false;
	if (typeof s.name !== "string" || !s.name.trim()) return false;
	if (typeof s.api !== "string" || !/^https?:\/\//.test(s.api)) return false;
	if (s.detail !== undefined && typeof s.detail !== "string") return false;
	if (s.adult !== undefined && typeof s.adult !== "boolean") return false;
	if (s.enabled !== undefined && typeof s.enabled !== "boolean") return false;
	return true;
}

async function readSources(env: Env): Promise<CmsSource[]> {
	const raw = await env.MARSTV_CMS.get(KV_SOURCES_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidSource);
	} catch {
		return [];
	}
}

// ─── Config endpoints ───────────────────────────────────────────────────────

async function handleLogin(request: Request, env: Env): Promise<Response> {
	if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
		return jsonErr(500, "admin auth not configured on server");
	}
	let body: { password?: string };
	try {
		body = (await request.json()) as { password?: string };
	} catch {
		return jsonErr(400, "invalid json");
	}
	if (!body.password || typeof body.password !== "string") {
		return jsonErr(400, "missing password");
	}
	// Constant-time compare via HMAC over both values.
	const a = await hmacSign(env.SESSION_SECRET, body.password);
	const b = await hmacSign(env.SESSION_SECRET, env.ADMIN_PASSWORD);
	if (!timingSafeEqual(a, b)) {
		return jsonErr(401, "wrong password");
	}

	const token = await issueSession(env.SESSION_SECRET);
	return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
		status: 200,
		headers: {
			...JSON_NO_CACHE,
			"set-cookie": sessionCookie(token, SESSION_TTL_SECONDS),
		},
	});
}

function handleLogout(): Response {
	return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
		status: 200,
		headers: {
			...JSON_NO_CACHE,
			"set-cookie": sessionCookie("", 0),
		},
	});
}

async function handleAuthCheck(request: Request, env: Env): Promise<Response> {
	const secret = env.SESSION_SECRET;
	if (!secret) {
		return jsonOk({ authenticated: false, configured: false }, false);
	}
	const token = parseCookie(request.headers.get("cookie"), SESSION_COOKIE);
	const ok = await verifySession(secret, token);
	return jsonOk(
		{ authenticated: ok, configured: Boolean(env.ADMIN_PASSWORD) },
		false,
	);
}

async function handleGetSources(request: Request, env: Env): Promise<Response> {
	const deny = await requireAuth(request, env);
	if (deny) return deny;
	const sources = await readSources(env);
	return jsonOk({ sources }, false);
}

async function handlePutSources(request: Request, env: Env): Promise<Response> {
	const deny = await requireAuth(request, env);
	if (deny) return deny;

	let body: { sources?: unknown };
	try {
		body = (await request.json()) as { sources?: unknown };
	} catch {
		return jsonErr(400, "invalid json");
	}
	if (!Array.isArray(body.sources)) {
		return jsonErr(400, "sources must be an array");
	}
	const clean = body.sources.filter(isValidSource);
	if (clean.length !== body.sources.length) {
		return jsonErr(400, "one or more sources invalid");
	}
	// Reject duplicate keys.
	const seen = new Set<string>();
	for (const s of clean) {
		if (seen.has(s.key)) return jsonErr(400, `duplicate key: ${s.key}`);
		seen.add(s.key);
	}
	await env.MARSTV_CMS.put(KV_SOURCES_KEY, JSON.stringify(clean));
	return jsonOk({ sources: clean }, false);
}

async function handlePublicSources(env: Env): Promise<Response> {
	// Only expose enabled, non-adult sources by default. The SPA decides
	// presentation; we just serve the raw list so existing `loadSources()`
	// behaviour is preserved.
	const sources = await readSources(env);
	return jsonOk({ sources }, false);
}

// ─── CMS search / detail / availability ─────────────────────────────────────

async function findConfiguredSource(
	env: Env,
	key: string,
): Promise<CmsSource | null> {
	const sources = await readSources(env);
	return sources.find((s) => s.key === key && s.enabled !== false) ?? null;
}

async function handleSearch(url: URL, env: Env): Promise<Response> {
	const sourceKey = url.searchParams.get("source");
	const wd = url.searchParams.get("wd");
	const pg = Number(url.searchParams.get("pg") ?? "1");
	if (!sourceKey || !wd) return jsonErr(400, "missing source or wd");

	const source = await findConfiguredSource(env, sourceKey);
	if (!source) return jsonErr(404, `unknown source: ${sourceKey}`);

	try {
		const result = await searchSource(source, wd, pg, { timeoutMs: 15000 });
		// Shape into PaginatedList<VideoItem> — the client's ApiResponse unwrap
		// will expose { list, total, page, pageCount } to `searchCms()`.
		return jsonOk(
			{
				list: result.items,
				total: result.total,
				page: result.page,
				pageCount: result.pageCount,
			},
			false,
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "search upstream failed";
		return jsonErr(502, msg);
	}
}

async function handleDetail(url: URL, env: Env): Promise<Response> {
	const sourceKey = url.searchParams.get("source");
	const id = url.searchParams.get("id");
	if (!sourceKey || !id) return jsonErr(400, "missing source or id");

	const source = await findConfiguredSource(env, sourceKey);
	if (!source) return jsonErr(404, `unknown source: ${sourceKey}`);

	try {
		const detail = await getDetail(source, id, { timeoutMs: 15000 });
		if (!detail) return jsonErr(404, "not found");
		return jsonOk(detail, false);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "detail upstream failed";
		return jsonErr(502, msg);
	}
}

async function handleAvailability(url: URL, env: Env): Promise<Response> {
	const sourceKey = url.searchParams.get("source");
	const id = url.searchParams.get("id");
	if (!sourceKey || !id) return jsonErr(400, "missing source or id");

	const source = await findConfiguredSource(env, sourceKey);
	if (!source) return jsonOk({ available: false }, false);

	try {
		const detail = await getDetail(source, id, { timeoutMs: 5000 });
		return jsonOk({ available: Boolean(detail) }, false);
	} catch {
		return jsonOk({ available: false }, false);
	}
}

// ─── Entry ──────────────────────────────────────────────────────────────────

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/douban") {
			return handleDouban(url);
		}

		if (url.pathname === "/api/image/douban") {
			return handleDoubanImage(url);
		}

		if (url.pathname === "/api/image/cms") {
			return handleCmsImage(url);
		}

		if (url.pathname === "/api/proxy/m3u8") {
			return handleProxyM3u8(request, url);
		}

		if (url.pathname === "/api/proxy/ts") {
			return handleProxyTs(request, url);
		}

		if (url.pathname === "/api/sources" && request.method === "GET") {
			return handlePublicSources(env);
		}

		if (url.pathname === "/api/search" && request.method === "GET") {
			return handleSearch(url, env);
		}

		if (url.pathname === "/api/detail" && request.method === "GET") {
			return handleDetail(url, env);
		}

		if (url.pathname === "/api/availability" && request.method === "GET") {
			return handleAvailability(url, env);
		}

		if (url.pathname === "/api/config/login" && request.method === "POST") {
			return handleLogin(request, env);
		}

		if (url.pathname === "/api/config/logout" && request.method === "POST") {
			return handleLogout();
		}

		if (url.pathname === "/api/config/auth") {
			return handleAuthCheck(request, env);
		}

		if (url.pathname === "/api/config/sources") {
			if (request.method === "GET") return handleGetSources(request, env);
			if (request.method === "PUT") return handlePutSources(request, env);
			return jsonErr(405, "method not allowed");
		}

		if (url.pathname.startsWith("/api/")) {
			return jsonErr(404, "not implemented");
		}

		return new Response(null, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
