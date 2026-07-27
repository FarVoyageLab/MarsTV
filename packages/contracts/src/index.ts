import { z } from "zod";

export const roleSchema = z.enum(["owner", "admin", "member", "child"]);
export type Role = z.infer<typeof roleSchema>;

export const mediaKindSchema = z.enum(["movie", "series", "episode", "unknown"]);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export const sourceCapabilitiesSchema = z.object({
  json: z.boolean(),
  xml: z.boolean(),
  search: z.boolean(),
  detail: z.boolean(),
  categories: z.boolean(),
  directPlayback: z.boolean()
});
export type SourceCapabilities = z.infer<typeof sourceCapabilitiesSchema>;

export const sourceConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  baseUrl: z.string().url(),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(999).default(100),
  timeoutMs: z.number().int().min(500).max(15_000).default(4_000),
  allowedHosts: z.array(z.string().min(1)).max(32).default([]),
  headers: z.record(z.string(), z.string()).default({}),
  relayMode: z.enum(["off", "manifest", "full"]).default("off"),
  categoryMap: z.record(z.string(), z.string()).default({}),
  resolver: z.object({
    endpoint: z.string().url(),
    allowedHosts: z.array(z.string().min(1)).min(1).max(8),
    timeoutMs: z.number().int().min(500).max(10_000).default(4_000)
  }).nullable().default(null),
  capabilities: sourceCapabilitiesSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type SourceConfig = z.infer<typeof sourceConfigSchema>;

export const sourceHealthSchema = z.object({
  sourceId: z.string(),
  state: z.enum(["healthy", "degraded", "offline", "unchecked"]),
  latencyMs: z.number().int().nonnegative().nullable(),
  checkedAt: z.string().datetime().nullable(),
  itemCount: z.number().int().nonnegative().nullable(),
  message: z.string().nullable()
});
export type SourceHealth = z.infer<typeof sourceHealthSchema>;

export const episodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  lineId: z.string(),
  lineLabel: z.string(),
  url: z.string().min(1),
  order: z.number().int().nonnegative()
});
export type Episode = z.infer<typeof episodeSchema>;

export const mediaSummarySchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  fingerprint: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  kind: mediaKindSchema,
  year: z.number().int().min(1800).max(2200).nullable(),
  category: z.string().nullable(),
  posterUrl: z.string().url().nullable(),
  backdropUrl: z.string().url().nullable(),
  remarks: z.string().nullable(),
  score: z.number().min(0).max(10).nullable(),
  updatedAt: z.string().nullable()
});
export type MediaSummary = z.infer<typeof mediaSummarySchema>;

export const mediaDetailSchema = mediaSummarySchema.extend({
  description: z.string().nullable(),
  director: z.array(z.string()),
  actors: z.array(z.string()),
  area: z.array(z.string()),
  language: z.array(z.string()),
  tags: z.array(z.string()),
  episodes: z.array(episodeSchema),
  metadata: z.object({
    provider: z.string(),
    providerId: z.string().nullable(),
    attributionUrl: z.string().url().nullable(),
    matchedManually: z.boolean()
  }).nullable()
});
export type MediaDetail = z.infer<typeof mediaDetailSchema>;

export const sourceResultMetaSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  state: z.enum(["ok", "timeout", "error", "skipped"]),
  latencyMs: z.number().int().nonnegative(),
  message: z.string().nullable()
});
export type SourceResultMeta = z.infer<typeof sourceResultMetaSchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  items: z.array(mediaSummarySchema),
  sources: z.array(sourceResultMetaSchema),
  partial: z.boolean(),
  requestId: z.string()
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

export const playbackManifestSchema = z.object({
  protocol: z.enum(["hls", "dash", "progressive"]),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).default({}),
  expiresAt: z.string().datetime().nullable(),
  subtitles: z.array(z.object({
    id: z.string(),
    label: z.string(),
    language: z.string(),
    url: z.string().url(),
    format: z.enum(["vtt", "ttml", "srt"])
  })).default([]),
  audioTracks: z.array(z.object({
    id: z.string(),
    label: z.string(),
    language: z.string()
  })).default([])
});
export type PlaybackManifest = z.infer<typeof playbackManifestSchema>;

export const resolverRequestSchema = z.object({
  sourceId: z.string(),
  sourceItemId: z.string(),
  episodeId: z.string(),
  episodeUrl: z.string().min(1),
  preferredProtocol: z.enum(["hls", "dash", "progressive"]).nullable()
});
export type ResolverRequest = z.infer<typeof resolverRequestSchema>;

export const hybridClockSchema = z.object({
  wallTime: z.number().int().nonnegative(),
  counter: z.number().int().nonnegative(),
  deviceId: z.string().min(1)
});
export type HybridClock = z.infer<typeof hybridClockSchema>;

export const syncRecordSchema = z.object({
  id: z.string(),
  collection: z.enum([
    "localSources",
    "preferences",
    "favorites",
    "history",
    "progress",
    "metadataMatches",
    "profiles"
  ]),
  ciphertext: z.string(),
  nonce: z.string(),
  clock: hybridClockSchema,
  deletedAt: z.string().datetime().nullable()
});
export type SyncRecord = z.infer<typeof syncRecordSchema>;

export const syncEnvelopeSchema = z.object({
  householdId: z.string(),
  deviceId: z.string(),
  cursor: z.string().nullable(),
  records: z.array(syncRecordSchema).max(1_000)
});
export type SyncEnvelope = z.infer<typeof syncEnvelopeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional()
  })
});
export type ApiError = z.infer<typeof apiErrorSchema>;
