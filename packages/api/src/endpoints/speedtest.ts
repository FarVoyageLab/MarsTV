// ============================================================================
// Speedtest API endpoint — rank CMS source lines by playback performance.
// ============================================================================

import type { ApiClient } from "@marstv/api/client";
import type { SpeedtestRequestBody, SpeedtestResponseData } from "@marstv/api/types";

/** Submit a batch of source lines for server-side speed ranking. */
export function runSpeedtest(
	client: ApiClient,
	body: SpeedtestRequestBody,
	signal?: AbortSignal,
): Promise<SpeedtestResponseData> {
	return client.post<SpeedtestResponseData>("/api/speedtest", body, signal);
}
