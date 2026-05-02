// ============================================================================
// Speedtest API endpoint — rank CMS source lines by playback performance.
// ============================================================================

import type { ApiClient } from "../client.js";
import type { SpeedtestRequestBody, SpeedtestResponseData } from "../types.js";

/** Submit a batch of source lines for server-side speed ranking. */
export function runSpeedtest(
	client: ApiClient,
	body: SpeedtestRequestBody,
	signal?: AbortSignal,
): Promise<SpeedtestResponseData> {
	return client.post<SpeedtestResponseData>("/api/speedtest", body, signal);
}
