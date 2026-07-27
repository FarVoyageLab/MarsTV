export const colors = {
  canvas: "#0b0d10",
  canvasRaised: "#11151a",
  surface: "#161b21",
  surfaceStrong: "#1d232b",
  border: "#2a313a",
  borderStrong: "#3a424d",
  text: "#f4f0e8",
  textMuted: "#9da4ad",
  amber: "#e9a23b",
  amberStrong: "#f2b84f",
  success: "#60bd7a",
  warning: "#e9a23b",
  danger: "#ef6a62",
  info: "#70a7d8"
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64
} as const;

export const radius = {
  control: 6,
  panel: 8,
  media: 6
} as const;

export const motion = {
  quick: 120,
  standard: 180,
  deliberate: 260
} as const;
