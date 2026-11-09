/**
 * Tunisiska Mega Transport — Design tokens (Colour)
 *
 * Single source of truth for the palette. NativeWind classes in `tailwind.config.js`
 * reference the same values, so the two cannot drift.
 *
 * Visual identity follows the official reference: deep navy primary, restrained
 * brand orange as an accent, white / very light surfaces, controlled depth.
 */

/** Brand navy — primary surface, headers, primary buttons. */
export const navy = {
  50: "#F2F5FA",
  100: "#E4EAF4",
  200: "#C7D3E6",
  300: "#9CB0D1",
  400: "#6A85B4",
  500: "#3F5F97",
  600: "#1E3E75",
  700: "#132B55",
  800: "#0B1B33",
  900: "#06101F",
  DEFAULT: "#132B55",
} as const;

/** Brand orange — accent only: active state, key action, attention. */
export const orange = {
  50: "#FFF4EC",
  100: "#FFE7D4",
  200: "#FFCBA9",
  300: "#FFA971",
  400: "#FF8534",
  500: "#F2761B",
  600: "#D65E0A",
  700: "#AC4707",
  DEFAULT: "#F2761B",
} as const;

/** Neutral surfaces, borders and text. */
export const neutral = {
  0: "#FFFFFF",
  50: "#F8FAFC",
  100: "#F4F6FA",
  200: "#EDF1F6",
  300: "#E4E9F0",
  400: "#D3DBE6",
  500: "#AEB9C9",
  600: "#8A97AC",
  700: "#55627A",
  800: "#2C3A4F",
  900: "#0C1626",
  DEFAULT: "#0C1626",
} as const;

/** Semantic state colours (foreground / surface pairs). */
export const semantic = {
  success: { fg: "#147A48", bg: "#E7F5EE", border: "#BFE5D1" },
  warning: { fg: "#9A5B06", bg: "#FEF3E2", border: "#F6DFB8" },
  danger: { fg: "#B32525", bg: "#FDECEC", border: "#F5C9C9" },
  info: { fg: "#1D4ED8", bg: "#E8EFFE", border: "#C6D6FB" },
} as const;

/**
 * Light theme tokens.
 *
 * `canvas` is the app background; `surface` is the card colour sitting on it.
 */
export const lightTheme = {
  canvas: neutral[100],
  canvasElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: neutral[50],
  surfaceSunken: neutral[200],
  surfaceInverse: navy[800],

  textPrimary: neutral[900],
  textSecondary: neutral[700],
  textTertiary: neutral[600],
  textQuaternary: neutral[500],
  textInverse: "#FFFFFF",
  textOnAccent: "#FFFFFF",

  border: neutral[300],
  borderStrong: neutral[400],
  borderSubtle: neutral[200],
  separator: neutral[200],

  primary: navy[700],
  primaryPressed: navy[800],
  primarySoft: navy[50],
  primaryBorder: navy[100],

  accent: orange[500],
  accentPressed: orange[600],
  accentSoft: orange[50],
  accentBorder: orange[100],

  overlay: "rgba(6, 16, 31, 0.55)",
  skeleton: neutral[200],
  skeletonHighlight: "#F8FAFC",
} as const;

/** Dark theme tokens. */
export const darkTheme = {
  // Zinc neutrals give dark mode the quiet, familiar depth the canvas needs.
  canvas: "#09090B",
  canvasElevated: "#18181B",
  surface: "#18181B",
  surfaceAlt: "#27272A",
  surfaceSunken: "#09090B",
  surfaceInverse: neutral[0],

  textPrimary: "#FAFAFA",
  textSecondary: "#D4D4D8",
  textTertiary: "#A1A1AA",
  textQuaternary: "#71717A",
  textInverse: navy[900],
  textOnAccent: "#FFFFFF",

  border: "#3F3F46",
  borderStrong: "#52525B",
  borderSubtle: "#27272A",
  separator: "#27272A",

  primary: navy[400],
  primaryPressed: navy[300],
  primarySoft: "#27272A",
  primaryBorder: "#3F3F46",

  accent: orange[400],
  accentPressed: orange[300],
  accentSoft: "#3F2516",
  accentBorder: "#713F1D",

  overlay: "rgba(3, 7, 13, 0.66)",
  skeleton: "#27272A",
  skeletonHighlight: "#3F3F46",
} as const;

/**
 * The shape of a resolved theme.
 *
 * Declared structurally rather than as `typeof lightTheme` so that the light
 * and dark palettes are interchangeable without literal-type narrowing.
 */
export type ThemeColors = Record<keyof typeof lightTheme, string>;

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export type ThemeName = keyof typeof themes;

/** Country flag assets are rendered as small rounded rectangles (see `CountryFlag`). */
export const countryAccent = {
  sweden: "#0B1B33",
  tunisia: "#D65E0A",
} as const;
