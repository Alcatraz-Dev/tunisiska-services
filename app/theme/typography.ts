/**
 * Tunisiska Mega Transport — Design tokens (Typography)
 *
 * Rubik is already licensed and bundled in `app/assets/fonts`, and is loaded in
 * `app/_layout.tsx` under the family names below. No new font files are added.
 *
 * The scale follows the reference: strong screen titles, clear card headings,
 * balanced metadata, and no text below 12pt.
 */

/** Registered font families (see `useFonts` in `app/_layout.tsx`). */
export const fontFamily = {
  light: "RubikLight",
  regular: "RubikRegular",
  medium: "RubikMedium",
  semibold: "RubikSemiBold",
  bold: "RubikBold",
  extrabold: "RubikExtraBold",
} as const;

/**
 * Type ramp.
 *
 * `lineHeight` is set explicitly on every step rather than left to the platform
 * so that Android and iOS agree.
 */
export const typeScale = {
  /** Screen hero headline — "Your transport between Sweden and Tunisia". */
  display: { fontFamily: fontFamily.extrabold, fontSize: 30, lineHeight: 37 },
  /** Screen title. */
  title1: { fontFamily: fontFamily.extrabold, fontSize: 26, lineHeight: 33 },
  /** Section / page heading. */
  title2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  /** Card heading. */
  title3: { fontFamily: fontFamily.bold, fontSize: 17, lineHeight: 23 },
  /** Emphasised body. */
  headline: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  /** Default body. */
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  /** Body, dense. */
  bodySm: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19 },
  /** Supporting metadata. */
  caption: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17 },
  /** Small metadata / timestamps. */
  footnote: { fontFamily: fontFamily.medium, fontSize: 11.5, lineHeight: 15 },
  /** Badge / pill label — uppercase, tracked. */
  overline: { fontFamily: fontFamily.bold, fontSize: 10.5, lineHeight: 14 },
  /** Numeric emphasis — departure times, prices. */
  numeric: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 27 },
  /** Large numeric emphasis. */
  numericLg: { fontFamily: fontFamily.extrabold, fontSize: 30, lineHeight: 34 },
  /** Buttons and primary actions. */
  button: { fontFamily: fontFamily.bold, fontSize: 15.5, lineHeight: 20 },
  /** Tab bar labels. */
  tab: { fontFamily: fontFamily.semibold, fontSize: 10.5, lineHeight: 14 },
} as const;

export type TypeToken = keyof typeof typeScale;

/** Letter spacing applied on top of a type token. */
export const letterSpacing = {
  overline: 0.7,
  tight: -0.4,
  wide: 0.3,
} as const;
