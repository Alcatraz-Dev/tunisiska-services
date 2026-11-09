/**
 * Motion helpers that respect the OS "Reduce Motion" setting.
 *
 * Every animated surface in the redesign goes through this hook so that
 * accessibility preferences are honoured in one place rather than per-component.
 */
import { useCallback } from "react";
import { useReducedMotion, type EasingFunctionFactory } from "react-native-reanimated";

import {
  duration,
  easing,
  linear,
  reducedMotionDuration,
} from "@/app/theme/motion";

export type MotionConfig = {
  /** True when the user has enabled Reduce Motion. */
  isReduced: boolean;
  /** Duration helper: returns 0 when motion is reduced. */
  d: (ms: number) => number;
  /** Easing helper: returns linear easing when motion is reduced. */
  e: (curve: EasingFunctionFactory) => EasingFunctionFactory;
  /** Standard easing curve. */
  standard: EasingFunctionFactory;
  /** Decelerate curve for entering content. */
  decelerate: EasingFunctionFactory;
};

export function useMotion(): MotionConfig {
  const isReduced = useReducedMotion();

  const d = useCallback(
    (ms: number) => (isReduced ? reducedMotionDuration : ms),
    [isReduced],
  );

  const e = useCallback(
    (curve: EasingFunctionFactory) => (isReduced ? linear : curve),
    [isReduced],
  );

  return {
    isReduced,
    d,
    e,
    standard: e(easing.standard),
    decelerate: e(easing.decelerate),
  };
}

export { duration, easing };
