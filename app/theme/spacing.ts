/**
 * Tunisiska Mega Transport — Design tokens (Spacing, Radii, Elevation)
 *
 * A 4pt spatial grid. Generous spacing is a core part of the reference's
 * "uncluttered, premium" character.
 */

/** 4pt grid. `gutter` is the default screen inset. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  section: 28,
  gutter: 20,
} as const;

/** Corner radii — consistent across cards, controls and media. */
export const radii = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Elevation.
 *
 * iOS-style: soft, wide, low-opacity shadows. `navy` shadows read as depth
 * rather than grey dirt.
 */
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sm: {
    shadowColor: "#06101F",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#06101F",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#06101F",
    shadowOpacity: 0.1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  /** For the primary call-to-action and the hero card. */
  navy: {
    shadowColor: "#0B1B33",
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
} as const;

/** Border widths. */
export const borderWidth = {
  hairline: 0.5,
  thin: 1,
  thick: 1.5,
} as const;

/** Minimum interactive size (Apple HIG / Material both land near 44–48dp). */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouchTarget = 44;
