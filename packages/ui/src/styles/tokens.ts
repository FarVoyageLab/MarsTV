/**
 * Mars design tokens — JS/RN-consumable version.
 * Mirrors tokens.css. Import from React Native (apps/mobile, apps/tvos)
 * or anywhere JS object literals are needed.
 */

export const marsPalette = {
	ember: "#ff7a00",
	emberSoft: "#ffb07a",
	emberDeep: "#c85800",
	magenta: "#e52e71",
	magentaSoft: "#f06ea3",
	magentaDeep: "#a81e53",
} as const;

/** Cinema theme accent (prototype red) */
export const cinemaPalette = {
	red: "oklch(55% 0.22 22)",
	redSoft: "oklch(55% 0.22 22 / 0.16)",
	redRing: "oklch(55% 0.22 22 / 0.35)",
	bg: "oklch(12% 0.008 255)",
	surface: "oklch(17% 0.01 255)",
	fg: "oklch(96% 0.002 240)",
	muted: "oklch(60% 0.012 255)",
	border: "oklch(26% 0.01 255)",
} as const;

export const voidPalette = {
	deep: "#080a10",
	raised: "#141926",
	surface: "#1b2032",
	star: "rgba(255, 255, 255, 0.6)",
} as const;

export const glassTokens = {
	whiteHi: "rgba(255, 255, 255, 0.40)",
	whiteMd: "rgba(255, 255, 255, 0.14)",
	whiteLo: "rgba(255, 255, 255, 0.05)",
	edge: "rgba(255, 255, 255, 0.14)",
	edgeStrong: "rgba(255, 255, 255, 0.22)",
	insetHi: "rgba(255, 255, 255, 0.18)",
	insetLo: "rgba(0, 0, 0, 0.35)",
} as const;

/** Layout dimensions matching the cinema prototype */
export const layout = {
	sidebarW: 220,
	sidebarIconW: 68,
	topbarH: 56,
	bottombarH: 60,
} as const;

export const marsGradient = {
	colors: [marsPalette.ember, marsPalette.magenta] as [string, string],
	start: { x: 0, y: 0 },
	end: { x: 1, y: 1 },
} as const;

export const radii = {
	glassSm: 14,
	glassMd: 22,
	glassLg: 32,
	glassPill: 999,
} as const;

export const fonts = {
	display: "Space Grotesk",
	body: "Space Grotesk",
	numeric: "JetBrains Mono",
} as const;

/**
 * Pre-tuned Liquid Glass layer presets.
 * blur + fill color only — consumers add their own border / shadow.
 */
export const glassPresets = {
	thin: { blur: 10, saturate: 140, fill: "rgba(20, 25, 38, 0.35)" },
	regular: { blur: 22, saturate: 170, fill: "rgba(20, 25, 38, 0.55)" },
	thick: { blur: 40, saturate: 180, fill: "rgba(20, 25, 38, 0.70)" },
	ember: { blur: 22, saturate: 180, fill: "rgba(20, 25, 38, 0.25)" },
} as const;

export type GlassPreset = keyof typeof glassPresets;
