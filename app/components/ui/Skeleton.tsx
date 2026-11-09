import React, { useEffect, useState } from "react";
import { View, ViewStyle, StyleProp, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors } from "@/app/theme";
import { radii } from "@/app/theme/spacing";
import { useMotion } from "@/app/hooks/useMotion";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Disable the shimmer and show a static placeholder. */
  static?: boolean;
};

const SHIMMER_MS = 1250;

/**
 * A single skeleton placeholder with a moving shimmer.
 *
 * The highlight sweeps across the block while content loads, which reads as
 * "working" far better than a static grey box. The animation:
 *
 *   • honours Reduce Motion — the block stays static and simply shows the
 *     skeleton colour, because a repeated sweep is exactly the kind of motion
 *     that preference exists to suppress;
 *   • is hidden from assistive technology, so screen readers never announce
 *     placeholder boxes;
 *   • adapts to the active theme through the shared skeleton tokens.
 */
export default function Skeleton({
  width = "100%",
  height = 14,
  radius = radii.sm,
  style,
  static: isStatic = false,
}: SkeletonProps) {
  const theme = useThemeColors();
  const { isReduced } = useMotion();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const progress = useSharedValue(0);

  const shimmering = !isStatic && !isReduced;

  useEffect(() => {
    if (!shimmering) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: SHIMMER_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [shimmering, progress]);

  const bandWidth = Math.max(56, measuredWidth * 0.55);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -bandWidth + progress.value * (measuredWidth + bandWidth) },
    ],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      accessible={false}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setMeasuredWidth((current) => (current === next ? current : next));
      }}
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.skeleton,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {shimmering && measuredWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { width: bandWidth },
            bandStyle,
          ]}
        >
          <LinearGradient
            colors={["transparent", theme.skeletonHighlight, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A block of skeleton lines, matching a typical text layout. */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  ...rest
}: SkeletonProps & { lines?: number; lastLineWidth?: `${number}%` }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          {...rest}
        />
      ))}
    </View>
  );
}
