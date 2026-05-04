/**
 * API configuration for the tvOS app.
 *
 * In development, the MarsTV web server typically runs on localhost:3100.
 * For Apple TV simulator, use the host machine's local IP (e.g. http://192.168.x.x:3100).
 * For production, set EXPO_PUBLIC_API_URL in your environment.
 */

import Constants from "expo-constants";

function getDefaultBaseUrl(): string {
	// In Expo Go / dev builds on simulator, localhost works.
	// On physical Apple TV, replace with your dev machine's LAN IP.
	return "http://localhost:3100";
}

export const API_BASE_URL: string =
	(Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
	process.env.EXPO_PUBLIC_API_URL ??
	getDefaultBaseUrl();
