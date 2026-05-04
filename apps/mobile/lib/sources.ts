// ============================================================================
// CMS source key configuration for the mobile app.
//
// Source keys tell the mobile app which CMS backends to query when fetching
// home-page content. Configure via EXPO_PUBLIC_SOURCE_KEYS (comma-separated):
//   EXPO_PUBLIC_SOURCE_KEYS=heimuer,zym
//
// Per project policy, no sources are bundled. When empty, the home page will
// show a guidance message instead of a grid.
// ============================================================================

const RAW = process.env.EXPO_PUBLIC_SOURCE_KEYS ?? "";

/** List of CMS source keys to fetch content from on the home page. */
export const SOURCE_KEYS: string[] = RAW
	? RAW.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
	: [];

/** Whether any sources are configured. */
export const hasSources = SOURCE_KEYS.length > 0;
