// ============================================================================
// Type-safe base API client — a thin fetch wrapper with timeout, error
// classification, and a generic request/response pipeline.
//
// Runtime-agnostic: works wherever `fetch` is available (browser, React
// Native, Node ≥18, Bun, Deno).
// ============================================================================

import type { ApiResponse } from "@marstv/api/types";

// ─── Error types ────────────────────────────────────────────────────────────

export class ApiError extends Error {
	readonly url: string;
	readonly status: number;
	readonly body: string;

	constructor(url: string, status: number, body: string) {
		// Try to pull a useful detail out of the body: our own envelope uses
		// `{ success, error }`; fall back to a trimmed snippet otherwise.
		let detail = "";
		if (body) {
			try {
				const parsed = JSON.parse(body) as { error?: unknown };
				if (typeof parsed.error === "string") detail = parsed.error;
			} catch {
				/* not JSON */
			}
			if (!detail) detail = body.trim().slice(0, 200).replace(/\s+/g, " ");
		}
		super(detail ? `API ${status}: ${detail}` : `API ${status}: ${url}`);
		this.name = "ApiError";
		this.url = url;
		this.status = status;
		this.body = body;
	}
}

export class ApiTimeoutError extends Error {
	readonly url: string;
	readonly timeoutMs: number;

	constructor(url: string, timeoutMs: number) {
		super(`Request timed out after ${timeoutMs}ms: ${url}`);
		this.name = "ApiTimeoutError";
		this.url = url;
		this.timeoutMs = timeoutMs;
	}
}

// ─── Client options ─────────────────────────────────────────────────────────

export interface ApiClientOptions {
	/** Request timeout in milliseconds. Default 10000. */
	timeoutMs?: number;
	/** Additional headers sent with every request. */
	headers?: Record<string, string>;
}

// ─── Client class ───────────────────────────────────────────────────────────

export class ApiClient {
	private readonly baseUrl: string;
	private readonly timeoutMs: number;
	private readonly defaultHeaders: Record<string, string>;

	constructor(baseUrl: string, options: ApiClientOptions = {}) {
		// Normalise: strip trailing slash so callers can freely join.
		this.baseUrl = baseUrl.replace(/\/+$/, "");
		this.timeoutMs = options.timeoutMs ?? 10000;
		this.defaultHeaders = {
			accept: "application/json, text/plain, */*",
			"user-agent":
				"Mozilla/5.0 (compatible; MarsTV/0.1; +https://github.com/marstv)",
			...options.headers,
		};
	}

	// ── Public helpers ──

	/** Build a fully-qualified URL from a path and optional query params. */
	buildUrl(path: string, params?: object): string {
		const url = new URL(path.startsWith("/") ? path : `/${path}`, this.baseUrl);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined && value !== null) {
					url.searchParams.set(key, String(value));
				}
			}
		}
		return url.toString();
	}

	/** GET request. */
	async get<T>(
		path: string,
		params?: object,
		signal?: AbortSignal,
	): Promise<T> {
		const url = this.buildUrl(path, params);
		return this.request<T>(url, { method: "GET", signal });
	}

	/** POST with JSON body. */
	async post<T>(
		path: string,
		body?: unknown,
		signal?: AbortSignal,
	): Promise<T> {
		const url = this.buildUrl(path);
		return this.request<T>(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal,
		});
	}

	/** DELETE request. */
	async delete<T>(
		path: string,
		body?: unknown,
		signal?: AbortSignal,
	): Promise<T> {
		const url = this.buildUrl(path);
		return this.request<T>(url, {
			method: "DELETE",
			headers:
				body !== undefined ? { "content-type": "application/json" } : undefined,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal,
		});
	}

	/** PUT with JSON body. */
	async put<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
		const url = this.buildUrl(path);
		return this.request<T>(url, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal,
		});
	}

	/**
	 * Raw fetch without JSON parsing — used when the response is not JSON
	 * (e.g. streaming m3u8 through the proxy endpoint).
	 */
	async fetchRaw(
		path: string,
		params?: object,
		signal?: AbortSignal,
	): Promise<Response> {
		const url = this.buildUrl(path, params);
		const mergedSignal = this.mergeSignals(signal);
		const timer = setTimeout(() => mergedSignal.abort(), this.timeoutMs);
		try {
			const res = await fetch(url, {
				method: "GET",
				headers: { ...this.defaultHeaders },
				signal: mergedSignal.signal,
			});
			if (!res.ok) {
				const body = await res.text().catch(() => "");
				throw new ApiError(url, res.status, body);
			}
			return res;
		} catch (err) {
			if (err instanceof ApiError) throw err;
			if (err instanceof Error && err.name === "AbortError") {
				throw new ApiTimeoutError(url, this.timeoutMs);
			}
			throw err;
		} finally {
			clearTimeout(timer);
		}
	}

	/** Base URL getter. */
	getBaseUrl(): string {
		return this.baseUrl;
	}

	// ── Internal ──

	private async request<T>(url: string, init: RequestInit): Promise<T> {
		const mergedSignal = this.mergeSignals(
			init.signal as AbortSignal | undefined,
		);
		const timer = setTimeout(() => mergedSignal.abort(), this.timeoutMs);

		try {
			const res = await fetch(url, {
				...init,
				headers: {
					...this.defaultHeaders,
					// Per-request headers override defaults.
					...(init.headers as Record<string, string> | undefined),
				},
				signal: mergedSignal.signal,
			});

			if (!res.ok) {
				const body = await res.text().catch(() => "");
				throw new ApiError(url, res.status, body);
			}

			// Some endpoints return an ApiResponse wrapper; unwrap it transparently.
			const json = (await res.json()) as ApiResponse<T> | T;
			if (isWrapped(json) && json.data !== undefined) {
				return json.data;
			}
			return json as T;
		} catch (err) {
			if (err instanceof ApiError) throw err;
			if (err instanceof Error && err.name === "AbortError") {
				throw new ApiTimeoutError(url, this.timeoutMs);
			}
			throw err;
		} finally {
			clearTimeout(timer);
		}
	}

	/** Merge an external AbortSignal with an internal timeout controller. */
	private mergeSignals(external?: AbortSignal): AbortController {
		const ctrl = new AbortController();
		if (external) {
			if (external.aborted) {
				ctrl.abort();
			} else {
				const onAbort = () => ctrl.abort();
				external.addEventListener("abort", onAbort, { once: true });
			}
		}
		return ctrl;
	}
}

function isWrapped<T>(json: ApiResponse<T> | T): json is ApiResponse<T> {
	return (
		typeof json === "object" &&
		json !== null &&
		"success" in json &&
		typeof (json as ApiResponse<T>).success === "boolean"
	);
}

// ─── Factory ────────────────────────────────────────────────────────────────

/** Create a new API client pointed at a specific base URL.
 *
 *  Web apps typically pass an empty string (same-origin).
 *  Native/desktop apps pass the full origin (e.g. "https://marstv.example.com").
 */
export function createApiClient(
	baseUrl: string,
	options?: ApiClientOptions,
): ApiClient {
	return new ApiClient(baseUrl, options);
}
