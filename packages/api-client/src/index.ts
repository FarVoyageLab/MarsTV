import type {
  MediaDetail,
  PlaybackManifest,
  ResolverRequest,
  SearchResponse,
  SourceConfig,
  SourceHealth,
  SyncEnvelope
} from "@marstv/contracts";

export interface MarsTvClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  accessToken?: () => string | null;
}

export interface HouseholdProfile {
  id: string;
  user_id: string | null;
  name: string;
  kind: "adult" | "child";
  rating_limit: string | null;
  avatar_key: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  actor_user_id: string | null;
  action: string;
  subject: string;
  request_id: string;
  created_at: string;
}

export interface PairingStart {
  pairingId: string;
  code: string;
  secret: string;
  expiresAt: number;
}

export class MarsTvApiClient {
  readonly #baseUrl: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #accessToken: () => string | null;

  constructor(options: MarsTvClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/u, "");
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#accessToken = options.accessToken ?? (() => null);
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    const token = this.#accessToken();
    if (token) headers.set("authorization", `Bearer ${token}`);

    const response = await this.#fetch(`${this.#baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include"
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as {
        error?: { code?: string; message?: string };
      } | null;
      throw new Error(body?.error?.message ?? `MarsTV API ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  search(query: string, signal?: AbortSignal): Promise<SearchResponse> {
    return this.request(
      `/v1/search?q=${encodeURIComponent(query)}`,
      signal ? { signal } : {}
    );
  }

  detail(sourceId: string, itemId: string): Promise<MediaDetail> {
    return this.request(`/v1/catalog/items/${encodeURIComponent(sourceId)}/${encodeURIComponent(itemId)}`);
  }

  sources(): Promise<Array<SourceConfig & { health: SourceHealth | null }>> {
    return this.request("/v1/sources");
  }

  saveSource(source: SourceConfig): Promise<SourceConfig> {
    return this.request(`/v1/sources/${encodeURIComponent(source.id)}`, {
      method: "PUT",
      body: JSON.stringify(source)
    });
  }

  resolve(request: ResolverRequest): Promise<PlaybackManifest> {
    return this.request("/v1/playback/resolve", {
      method: "POST",
      body: JSON.stringify(request)
    });
  }

  sync(envelope: SyncEnvelope): Promise<SyncEnvelope> {
    return this.request("/v1/sync/push", {
      method: "POST",
      body: JSON.stringify(envelope)
    });
  }

  profiles(): Promise<HouseholdProfile[]> {
    return this.request("/v1/profiles");
  }

  createProfile(input: {
    name: string;
    kind: "adult" | "child";
    ratingLimit?: string | null;
    pin?: string | null;
    avatarKey?: string;
  }): Promise<HouseholdProfile> {
    return this.request("/v1/profiles", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  health(): Promise<Record<string, unknown>> {
    return this.request("/v1/health");
  }

  audit(): Promise<AuditEvent[]> {
    return this.request("/v1/audit");
  }

  createBackup(): Promise<{ jobId: string; state: string }> {
    return this.request("/v1/backups", { method: "POST" });
  }

  startPairing(): Promise<PairingStart> {
    return this.request("/v1/pairing/start", { method: "POST" });
  }

  claimPairing(code: string, deviceName: string, platform: string): Promise<{ claimed: true }> {
    return this.request("/v1/pairing/claim", {
      method: "POST",
      body: JSON.stringify({ code, deviceName, platform })
    });
  }

  consumePairing(
    pairingId: string,
    secret: string
  ): Promise<{ pending: true } | { sessionToken: string }> {
    return this.request(`/v1/pairing/${encodeURIComponent(pairingId)}/consume`, {
      method: "POST",
      body: JSON.stringify({ secret })
    });
  }
}
