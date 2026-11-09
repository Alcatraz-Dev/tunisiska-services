/**
 * Tunisiska Mega Transport — Design tokens (Motion)
 *
 * The motion language: short, purposeful, never bouncy. Motion exists to
 * communicate hierarchy, navigation, progress and interaction — nothing else.
 *
 * Reanimated 4 is already a dependency and is the only animation engine used.
 */
import { Easing, type EasingFunctionFactory } from "react-native-reanimated";

/** Durations in milliseconds. */
export const duration = {
  /** Press feedback. */
  instant: 90,
  /** Opacity / small state changes. */
  fast: 170,
  /** Default screen and card transitions. */
  base: 260,
  /** Entrance choreography, staggered content. */
  slow: 420,
  /** Deliberate, high-emphasis transitions. */
  deliberate: 560,
} as const;

/**
 * Easing curves.
 *
 * `standard` — general purpose (matches iOS/motion conventions).
 * `decelerate` — entering content; fast start, gentle settle.
 * `accelerate` — exiting content.
 * `emphasized` — deliberate hero moments.
 */
export const easing: Record<
  "standard" | "decelerate" | "accelerate" | "emphasized",
  EasingFunctionFactory
> = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  decelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
  accelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
  emphasized: Easing.bezier(0.2, 0, 0, 1),
};

/**
 * Linear easing — used when the user has enabled Reduce Motion.
 *
 * Exposed as an `EasingFunctionFactory` so it can be swapped for a curved
 * easing without changing the type at the call site.
 */
export const linear: EasingFunctionFactory = { factory: () => Easing.linear };

/** Standard spring for press feedback — low bounce, quick settle. */
export const spring = {
  gentle: { damping: 18, stiffness: 220, mass: 0.7 },
  snappy: { damping: 24, stiffness: 320, mass: 0.6 },
} as const;

/**
 * Stagger step for entrance choreography.
 *
 * The reference shows the Home screen content arriving in a considered order:
 * header, hero, direction cards, then the next-departure card.
 */
export const stagger = {
  step: 70,
  /** Delay before the first item animates in. */
  lead: 40,
} as const;

/** Named entrance presets so screens stay consistent with each other. */
export const entrance = {
  header: { duration: duration.fast, easing: easing.decelerate },
  hero: { duration: duration.slow, easing: easing.decelerate },
  card: { duration: duration.base, easing: easing.decelerate },
  list: { duration: duration.base, easing: easing.decelerate },
} as const;

/** Layout transition for shared-element / route transitions. */
export const transition = {
  duration: duration.base,
  easing: easing.standard,
} as const;

/**
 * Reduce Motion.
 *
 * When the OS "Reduce Motion" setting is on, every non-essential animation
 * collapses to an instant state change. `useReducedMotion()` from Reanimated
 * returns the system preference.
 *
 * Callers should prefer `useMotion()` (see `app/hooks/useMotion.ts`) which
 * resolves the duration to 0 and swaps the easing for linear, while still
 * applying the correct end state.
 */
export const reducedMotionDuration = 0;
