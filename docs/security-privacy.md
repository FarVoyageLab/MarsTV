# Security and privacy

## Data handling

MarsTV collects no advertising identifier and ships no analytics SDK. An
operator may enable OpenTelemetry and opt-in crash reporting. Structured logs
exclude search text, playback URLs, watch history, source secrets, authorization
headers, profile PINs, and personal sync plaintext.

Shared source credentials are encrypted at rest with AES-256-GCM. Native
clients store device tokens and local source credentials in platform secure
storage. Personal cloud sync is end-to-end encrypted before upload.

## Outbound request policy

- HTTPS only.
- Explicit hostname allowlists.
- No credentials in URLs.
- Private, loopback, link-local, multicast, and metadata hosts blocked.
- At most three redirects, with every hop revalidated.
- Per-source timeout and response-size limits.
- No arbitrary script execution or parser iframe.

DNS rebinding defenses must be enforced by the deployment egress layer in
addition to application hostname validation. Production deployments should
resolve and validate all A/AAAA answers or use an egress proxy with equivalent
policy.

## Account controls

WebAuthn requires user verification and resident credentials. Challenges expire
after five minutes and are consumed before verification. Credential counters
are persisted for replay detection. Recovery codes are one-time and stored only
as SHA-256 hashes. Owner/Admin may manage shared sources; Member/Child may not.

## User rights

The administrator interface exposes household export, restore, device
revocation, and account deletion operations. Exports are encrypted. Deletion
must remove D1/SQL rows, KV/Redis cache entries, active sessions, queued personal
jobs, and owned R2/S3 objects, with an audit tombstone that contains no deleted
payload.

Security reports: use the private advisory channel configured on the project
repository. Do not include live media URLs, tokens, or source credentials in a
report.
