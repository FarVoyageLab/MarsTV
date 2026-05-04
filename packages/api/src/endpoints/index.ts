export {
	searchCms,
	getDetail,
	checkAvailability,
} from "@marstv/api/endpoints/cms";
export { buildProxyUrl, fetchProxyPlaylist } from "@marstv/api/endpoints/proxy";
export { fetchDouban } from "@marstv/api/endpoints/douban";
export {
	listPlayRecords,
	getPlayRecord,
	savePlayRecord,
	removePlayRecord,
	clearPlayRecords,
	listFavorites,
	hasFavorite,
	addFavorite,
	removeFavorite,
	clearFavorites,
} from "@marstv/api/endpoints/storage";
export { runSpeedtest } from "@marstv/api/endpoints/speedtest";
export { login } from "@marstv/api/endpoints/auth";
