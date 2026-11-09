/**
 * Tunisiska Mega Transport — Design tokens (public surface)
 *
 * Import from `@/app/theme` rather than reaching into individual files.
 */
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./motion";

import { themes, type ThemeColors, type ThemeName } from "./colors";
import { useTheme } from "@/app/context/ThemeContext";

/**
 * Resolve the active colour set for the current theme.
 *
 * `useTheme()` from the app's ThemeContext returns the user's light/dark
 * preference; this maps it onto the token palette.
 */
export function useThemeColors(): ThemeColors {
  const { resolvedTheme } = useTheme();
  const name: ThemeName = resolvedTheme === "dark" ? "dark" : "light";
  return themes[name] as ThemeColors;
}
