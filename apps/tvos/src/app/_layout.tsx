import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import React, { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { initSources } from "@/lib/sources-store";

export default function TabLayout() {
	const colorScheme = useColorScheme();

	// Hydrate the CMS source cache from AsyncStorage on boot so screens that
	// call useSources() see the persisted list on first render.
	useEffect(() => {
		void initSources();
	}, []);

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			{Platform.OS === "ios" && !Platform.isTV ? (
				<AnimatedSplashOverlay />
			) : null}
			<AppTabs />
		</ThemeProvider>
	);
}
