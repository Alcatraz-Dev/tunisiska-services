import React, { useCallback } from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { useMotion } from "@/app/hooks/useMotion";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, "style"> & {
  /** Visual scale applied while pressed. */
  pressedScale?: number;
  /** Opacity applied while pressed. */
  pressedOpacity?: number;
  /** Elevation lift while pressed (iOS shadow / Android elevation). */
  pressedElevation?: number;
  /** Fire a light impact haptic on press. */
  haptic?: boolean | "light" | "medium" | "selection";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * A pressable that gives restrained, native-feeling feedback:
 * a subtle scale, a slight dim, and a matching shadow lift.
 *
 * All motion is suppressed when the user has enabled Reduce Motion.
 */
export default function PressableScale({
  pressedScale = 0.97,
  pressedOpacity = 0.92,
  pressedElevation,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: PressableScaleProps) {
  const { d, standard } = useMotion();
  const { language } = useLanguage();
  const translatedAccessibilityLabel = useTranslationText(accessibilityLabel ?? "", language);
  const translatedAccessibilityHint = useTranslationText(accessibilityHint ?? "", language);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleHaptic = useCallback(() => {
    if (!haptic) return;
    if (Platform.OS === "android") return;
    try {
      if (haptic === "selection") {
        Haptics.selectionAsync();
      } else if (haptic === "medium") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Haptics are best-effort and must never break an interaction.
    }
  }, [haptic]);

  return (
    <AnimatedPressable
      {...rest}
      accessibilityLabel={translatedAccessibilityLabel || accessibilityLabel}
      accessibilityHint={translatedAccessibilityHint || accessibilityHint}
      accessibilityRole={rest.accessibilityRole ?? "button"}
      onPressIn={(e) => {
        scale.value = withSpring(pressedScale, {
          damping: 20,
          stiffness: 320,
          mass: 0.5,
        });
        opacity.value = withTiming(pressedOpacity, { duration: d(110) });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 18, stiffness: 240, mass: 0.6 });
        opacity.value = withTiming(1, { duration: d(160), easing: standard });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        handleHaptic();
        onPress?.(e);
      }}
      style={[
        style,
        animatedStyle,
        pressedElevation !== undefined
          ? { elevation: pressedElevation }
          : null,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

export const pressableStyles = StyleSheet.create({
  reset: {
    transform: [{ scale: 1 }],
  },
});
