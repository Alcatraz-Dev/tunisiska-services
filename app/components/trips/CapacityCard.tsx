import React, { useEffect, useMemo, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import ThemedText from "@/app/components/ui/ThemedText";
import { useThemeColors } from "@/app/theme";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useMotion } from "@/app/hooks/useMotion";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { navy, orange } from "@/app/theme/colors";
import { fontFamily } from "@/app/theme/typography";
import { radii, spacing } from "@/app/theme/spacing";

/**
 * Cargo capacity, everywhere.
 *
 * One surface for every place the app reports how much room a departure has:
 * the lead trip card, the stacked trip rows, the stowage manifest and the
 * service lists. The meter fills on mount (staggered by `delay` so a list
 * settles top-down), the number counts up with it, a slow sheen crosses the
 * fill, and the live dot beside the title breathes — so the surface reads as
 * live rather than painted.
 *
 * State is always carried by text as well as colour: the pill says the
 * percentage or "Full", and the legend names both segments. Motion collapses to
 * nothing when the OS asks for reduced motion.
 */

export type CapacityTone = "dark" | "light";

type CapacityCardProps = {
  capacity?: number | null;
  available?: number | null;
  /** `dark` sits inside the navy lead card; `light` on a normal surface. */
  tone?: CapacityTone;
  /** Slim row for lists: figures and meter, no legend. */
  compact?: boolean;
  /** Stagger the fill, e.g. `index * 80` in a list. */
  delay?: number;
  title?: string;
  style?: StyleProp<ViewStyle>;
};

const SHEEN_WIDTH = 90;
/** Dividers drawn across the meter, so the fill reads as counted slots. */
const TICKS = 11;

export default function CapacityCard({
  capacity,
  available,
  tone = "light",
  compact = false,
  delay = 120,
  title = "Cargo capacity",
  style,
}: CapacityCardProps) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const { d, standard } = useMotion();

  const titleLabel = useTranslationText(title, language);
  const spacesAvailableLabel = useTranslationText("spaces available", language);
  const bookedLabel = useTranslationText("booked", language);
  const availableLabel = useTranslationText("available", language);
  const fullLabel = useTranslationText("Full", language);
  const noSpacesLabel = useTranslationText("No spaces left", language);
  const unknownLabel = useTranslationText("Capacity not shared", language);

  const total = typeof capacity === "number" && capacity > 0 ? Math.round(capacity) : 0;
  const free = total > 0
    ? Math.max(0, Math.min(typeof available === "number" ? Math.round(available) : total, total))
    : 0;
  const booked = Math.max(0, total - free);
  const ratio = total > 0 ? free / total : 0;
  const isFull = total > 0 && free === 0;
  const isScarce = !isFull && total > 0 && ratio <= 0.2;

  const numberLocale = language === "ar" ? "ar" : language === "sv" ? "sv-SE" : "en-US";
  const format = useMemo(
    () => (value: number) => new Intl.NumberFormat(numberLocale).format(value),
    [numberLocale],
  );

  const dark = tone === "dark";
  const valueColor = dark ? "#FFFFFF" : theme.textPrimary;
  const labelColor = dark ? "rgba(255,255,255,0.72)" : theme.textTertiary;
  const mutedColor = dark ? navy[300] : theme.textTertiary;
  const bodyColor = dark ? "rgba(255,255,255,0.78)" : theme.textSecondary;
  const trackColor = dark ? "rgba(255,255,255,0.13)" : theme.surfaceAlt;
  const tickColor = dark ? "rgba(255,255,255,0.16)" : "rgba(12,22,38,0.07)";
  const fillGradient = isFull
    ? (["#F87171", "#EF4444"] as const)
    : dark
      ? ([orange[400], orange[200]] as const)
      : ([theme.accent, orange[300]] as const);
  const accent = isFull ? (dark ? "#F87171" : "#B32525") : dark ? orange[300] : theme.accent;
  const liveDot = isFull ? (dark ? "#F87171" : "#B32525") : isScarce ? "#E0A33A" : accent;
  const pulseTarget = isFull || isScarce;

  const progress = useSharedValue(0);
  const sheen = useSharedValue(0);
  const enter = useSharedValue(0);
  const dot = useSharedValue(1);
  const [counted, setCounted] = useState(0);

  // Entrance, fill and sheen. Everything collapses when motion is reduced.
  useEffect(() => {
    enter.value = withDelay(delay, withTiming(1, { duration: d(420), easing: standard }));
    progress.value = 0;
    progress.value = withDelay(
      delay + d(60),
      withTiming(ratio, { duration: d(900), easing: Easing.out(Easing.cubic) }),
    );
  }, [ratio, delay, enter, progress, d, standard]);

  useEffect(() => {
    if (d(1) === 0) {
      sheen.value = 0;
      dot.value = 1;
      return;
    }
    sheen.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400 }),
      ),
      -1,
      false,
    );
  }, [sheen, d]);

  useEffect(() => {
    if (!pulseTarget || d(1) === 0) {
      dot.value = withTiming(1, { duration: 120 });
      return;
    }
    dot.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulseTarget, dot, d]);

  // Count the number up with the bar, so the figure and the fill agree.
  useAnimatedReaction(
    () => Math.round(progress.value * total),
    (value, previous) => {
      if (value !== previous) runOnJS(setCounted)(value);
    },
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-SHEEN_WIDTH * 1.5, 520]) }],
  }));

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [8, 0]) }],
  }));

  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  const percentage = Math.round(ratio * 100);
  const pillLabel = isFull ? fullLabel : `${percentage}%`;

  const meter = (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={total > 0 ? { min: 0, max: total, now: free } : undefined}
      style={{
        height: compact ? 6 : 10,
        borderRadius: radii.pill,
        backgroundColor: trackColor,
        overflow: "hidden",
        marginTop: compact ? 8 : spacing.md,
      }}
    >
      {total > 0 ? (
        <Animated.View
          style={[
            {
              height: "100%",
              borderRadius: radii.pill,
              overflow: "hidden",
              shadowColor: accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
            },
            fillStyle,
          ]}
        >
          <LinearGradient
            colors={fillGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, borderRadius: radii.pill }}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: SHEEN_WIDTH,
              },
              sheenStyle,
            ]}
          >
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </Animated.View>
      ) : null}

      {/* Slot dividers sit above the fill so the meter reads as counted holds. */}
      {total > 0 ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row" }}>
          {Array.from({ length: TICKS }).map((_, index) => (
            <View key={index} style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}>
              <View
                style={{
                  width: 1,
                  height: "100%",
                  backgroundColor: index === TICKS - 1 ? "transparent" : tickColor,
                }}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  const liveDotNode = (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: total > 0 ? liveDot : mutedColor,
        },
        total > 0 ? dotStyle : null,
      ]}
    />
  );

  if (compact) {
    return (
      <Animated.View
        accessible
        accessibilityLabel={total > 0 ? `${free} / ${total} · ${spacesAvailableLabel}` : undefined}
        style={[{ marginTop: spacing.sm }, style, enterStyle]}
      >
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm }}>
          {total > 0 ? (
            <ThemedText variant="footnote" translate={false} style={{ color: valueColor, fontFamily: fontFamily.extrabold }}>
              {format(counted)}
              <ThemedText variant="footnote" translate={false} style={{ color: mutedColor, fontFamily: fontFamily.regular }}>
                {` / ${format(total)}`}
              </ThemedText>
            </ThemedText>
          ) : (
            <ThemedText variant="footnote" translate={false} style={{ color: mutedColor }}>
              {unknownLabel}
            </ThemedText>
          )}
          {total > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              {liveDotNode}
              <ThemedText variant="footnote" translate={false} style={{ color: accent, fontFamily: fontFamily.bold }}>
                {isFull ? noSpacesLabel : pillLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>
        {meter}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      accessible
      accessibilityLabel={total > 0 ? `${free} / ${total} · ${spacesAvailableLabel}` : undefined}
      style={[
        {
          borderRadius: radii.lg,
          padding: spacing.lg,
          backgroundColor: dark ? "#0B1128" : theme.surface,
          borderWidth: 1,
          borderColor: dark ? "rgba(255,255,255,0.08)" : theme.borderSubtle,
          shadowColor: dark ? "#000000" : theme.textPrimary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: dark ? 0.32 : 0.05,
          shadowRadius: 18,
          elevation: dark ? 0 : 2,
        },
        style,
        enterStyle,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {liveDotNode}
        <ThemedText
          variant="caption"
          translate={false}
          numberOfLines={1}
          style={{ color: labelColor, flex: 1 }}
        >
          {titleLabel}
        </ThemedText>
        {total > 0 ? (
          <View
            style={{
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: radii.pill,
              backgroundColor: isFull
                ? dark ? "rgba(248,113,113,0.16)" : "#FDECEC"
                : isScarce
                  ? dark ? "rgba(224,163,58,0.18)" : "#FEF3E2"
                  : dark ? "rgba(242,118,27,0.18)" : theme.accentSoft,
            }}
          >
            <ThemedText
              variant="overline"
              translate={false}
              style={{
                color: isFull
                  ? dark ? "#FCA5A5" : "#B32525"
                  : isScarce
                    ? dark ? "#F3C77B" : "#9A5B06"
                    : dark ? orange[300] : theme.accent,
                fontSize: 9,
              }}
            >
              {pillLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {total > 0 ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm, marginTop: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, flexShrink: 1 }}>
              <ThemedText
                variant="title1"
                translate={false}
                style={{ color: valueColor, fontFamily: fontFamily.extrabold, fontVariant: ["tabular-nums"] }}
              >
                {format(counted)}
              </ThemedText>
              <ThemedText variant="caption" translate={false} style={{ color: mutedColor }}>
                {`/ ${format(total)}`}
              </ThemedText>
            </View>
            <ThemedText
              variant="caption"
              translate={false}
              numberOfLines={1}
              style={{ color: labelColor, paddingBottom: 3, flexShrink: 1 }}
            >
              {spacesAvailableLabel}
            </ThemedText>
          </View>

          {meter}

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accent }} />
              <ThemedText variant="caption" translate={false} style={{ color: bodyColor }}>
                {isFull ? noSpacesLabel : availableLabel}
              </ThemedText>
            </View>
            <ThemedText variant="caption" translate={false} style={{ color: mutedColor }}>
              <ThemedText variant="caption" translate={false} style={{ color: valueColor, fontFamily: fontFamily.semibold }}>
                {format(booked)}
              </ThemedText>
              {` ${bookedLabel}`}
            </ThemedText>
          </View>
        </>
      ) : (
        <>
          <ThemedText variant="bodySm" translate={false} style={{ color: bodyColor, marginTop: 6 }}>
            {unknownLabel}
          </ThemedText>
          {meter}
        </>
      )}
    </Animated.View>
  );
}
