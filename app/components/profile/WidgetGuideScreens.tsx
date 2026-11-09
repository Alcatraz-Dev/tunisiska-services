import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AppIcon from "@/app/components/ui/AppIcon";
import PressableScale from "@/app/components/ui/PressableScale";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { fontFamily } from "@/app/theme/typography";
import { radii, spacing } from "@/app/theme/spacing";
import { areActivitiesEnabled } from "@/app/lib/liveActivity";

/**
 * Widget and Live Activity guides.
 *
 * The previews mirror the native widgets — the navy field, the orange cargo
 * accent and the same states the WidgetKit and Glance implementations render —
 * and the state selector at the top drives every preview on the screen, so the
 * scheduled, departing-soon and full presentations can be compared without a
 * device. Copy goes through the app's translation layer; only the sample
 * departure figures stay literal.
 */

const NAVY_DEEP = "#132B55";
const ORANGE = "#F2761B";
const ORANGE_PALE = "#FFB27A";
const NAVY_FIELD = ["#1E4278", "#132B55", "#0E2040"] as const;
const PALE = "#C7D3E6";
const MUTED_ON_NAVY = "#A9BAD2";
const ISLAND_BLACK = "#050506";
const ISLAND_BOARD = "#0A0E15";

type PreviewState = "scheduled" | "departing_soon" | "full";

type StatePalette = {
  fg: string;
  bg: string;
  border: string;
  available: number;
  capacity: number;
};

const STATE_PALETTE: Record<PreviewState, StatePalette> = {
  scheduled: { fg: "#7DD8A9", bg: "rgba(125,216,169,0.12)", border: "rgba(125,216,169,0.2)", available: 19, capacity: 24 },
  departing_soon: { fg: ORANGE_PALE, bg: "rgba(242,118,27,0.16)", border: "rgba(242,118,27,0.28)", available: 8, capacity: 24 },
  full: { fg: "#F5A3A8", bg: "rgba(245,163,168,0.14)", border: "rgba(245,163,168,0.22)", available: 0, capacity: 24 },
};

const STATE_COPY: Record<PreviewState, string> = {
  scheduled: "Scheduled",
  departing_soon: "Departing soon",
  full: "Full",
};

function GuideCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeColors();
  return (
    <View
      style={[
        {
          padding: spacing.lg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          shadowColor: theme.textPrimary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Eyebrow({
  label,
  color,
  style,
}: {
  label: string;
  color: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <ThemedText
      variant="overline"
      style={[{ color, letterSpacing: 1.1 }, style]}
    >
      {label}
    </ThemedText>
  );
}

function SectionHeading({ label, note }: { label: string; note?: string }) {
  const theme = useThemeColors();
  return (
    <View style={{ gap: 2 }}>
      <ThemedText variant="title3">{label}</ThemedText>
      {note ? (
        <ThemedText variant="caption" tone="secondary">
          {note}
        </ThemedText>
      ) : null}
    </View>
  );
}

function GuideStep({
  number,
  title,
  description,
  last,
}: {
  number: number;
  title: string;
  description: string;
  last?: boolean;
}) {
  const theme = useThemeColors();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.separator,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.primarySoft,
        }}
      >
        <ThemedText variant="caption" translate={false} style={{ color: theme.primary, fontFamily: fontFamily.bold }}>
          {number}
        </ThemedText>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <ThemedText variant="headline">{title}</ThemedText>
        <ThemedText variant="bodySm" tone="secondary">
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

/** Availability, with the action that resolves it inline. */
function GuideStatus({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const theme = useThemeColors();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    areActivitiesEnabled().then((value) => {
      if (mounted) setEnabled(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isAndroid = Platform.OS === "android";
  const isIos = Platform.OS === "ios";
  const available = isAndroid || enabled === true;
  const label = isAndroid
    ? "Home Screen widgets are ready to add"
    : !isIos
      ? "Widget previews are available in the app"
      : enabled === true
        ? "Widgets and Live Activities are available"
        : enabled === false
          ? "Live Activities are turned off in Settings"
          : "Checking Live Activity availability";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: available ? "rgba(23,134,91,0.22)" : theme.border,
        backgroundColor: available ? "rgba(23,134,91,0.08)" : theme.surfaceAlt,
      }}
    >
      <AppIcon
        name={available ? "checkmark-circle" : "information-circle-outline"}
        size={20}
        color={available ? "#17865B" : theme.accent}
      />
      <ThemedText variant="bodySm" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      {isIos && enabled === false && onOpenSettings ? (
        <PressableScale onPress={onOpenSettings} haptic="light" style={{ paddingVertical: 4 }}>
          <ThemedText variant="footnote" tone="accent" style={{ fontFamily: fontFamily.bold }}>
            Settings
          </ThemedText>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Segmented control that drives every preview on the screen. */
function StateSelector({
  value,
  onChange,
}: {
  value: PreviewState;
  onChange: (next: PreviewState) => void;
}) {
  const theme = useThemeColors();
  const states = Object.keys(STATE_COPY) as PreviewState[];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        gap: 4,
        padding: 4,
        borderRadius: radii.pill,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderSubtle,
      }}
    >
      {states.map((state) => {
        const active = state === value;
        return (
          <PressableScale
            key={state}
            onPress={() => onChange(state)}
            haptic="light"
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            pressedScale={0.97}
            style={{ flex: 1 }}
          >
            <View
              style={{
                minHeight: 34,
                paddingHorizontal: spacing.sm,
                borderRadius: radii.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? theme.primary : "transparent",
              }}
            >
              <ThemedText
                variant="footnote"
                numberOfLines={1}
                style={{
                  color: active ? theme.textOnAccent : theme.textSecondary,
                  fontFamily: active ? fontFamily.bold : fontFamily.medium,
                }}
              >
                {STATE_COPY[state]}
              </ThemedText>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

function StatusPill({ state, onDark = true }: { state: PreviewState; onDark?: boolean }) {
  const palette = STATE_PALETTE[state];
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radii.pill,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <ThemedText
        variant="overline"
        style={{ color: palette.fg, fontSize: 8.5, letterSpacing: 0.4 }}
      >
        {STATE_COPY[state]}
      </ThemedText>
    </View>
  );
}

function CapacityBar({
  available,
  capacity,
  track = "rgba(255,255,255,0.18)",
  style,
}: {
  available: number;
  capacity: number;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const ratio = capacity > 0 ? Math.max(0, Math.min(1, available / capacity)) : 0;
  return (
    <View
      style={[
        { height: 4, borderRadius: 4, backgroundColor: track, overflow: "hidden" },
        style,
      ]}
    >
      <View
        style={{
          height: "100%",
          width: `${ratio * 100}%`,
          backgroundColor: available === 0 ? "#F87171" : ORANGE,
        }}
      />
    </View>
  );
}

/** The iOS medium widget: route, departure and cargo. */
function MediumWidgetPreview({ state }: { state: PreviewState }) {
  const { available, capacity } = STATE_PALETTE[state];
  return (
    <LinearGradient
      colors={NAVY_FIELD}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ borderRadius: 22, padding: 15, minHeight: 134 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE }} />
        <Eyebrow label="NEXT DEPARTURE" color={MUTED_ON_NAVY} />
        <View style={{ marginLeft: "auto" }}>
          <StatusPill state={state} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.md }}>
        <ThemedText variant="title3" style={{ color: "#FFFFFF", fontSize: 15 }}>
          Stockholm
        </ThemedText>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ width: "100%", borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.38)" }} />
        </View>
        <ThemedText variant="title3" style={{ color: "#FFFFFF", fontSize: 15 }}>
          Tunis
        </ThemedText>
      </View>

      <ThemedText variant="caption" translate={false} style={{ color: PALE, marginTop: 7 }}>
        15 Nov · 14:00 · Cargo van
      </ThemedText>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: spacing.md }}>
        <CapacityBar available={available} capacity={capacity} style={{ flex: 1 }} />
        <ThemedText variant="footnote" translate={false} style={{ color: PALE, fontFamily: fontFamily.semibold }}>
          {`${available} / ${capacity}`}
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

/** The iOS small widget: the departure day leads. */
function SmallWidgetPreview({ state }: { state: PreviewState }) {
  const { available, capacity } = STATE_PALETTE[state];
  return (
    <LinearGradient
      colors={NAVY_FIELD}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ borderRadius: 20, padding: 13, flex: 1, minHeight: 130 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE }} />
        <Eyebrow label="NEXT TRIP" color={MUTED_ON_NAVY} />
      </View>
      <ThemedText
        variant="title2"
        translate={false}
        style={{ color: "#FFFFFF", marginTop: "auto", fontSize: 20, lineHeight: 23 }}
      >
        15 Nov
      </ThemedText>
      <ThemedText variant="footnote" translate={false} style={{ color: PALE, marginTop: 3 }}>
        14:00 · Cargo van
      </ThemedText>
      <ThemedText variant="footnote" style={{ color: MUTED_ON_NAVY, marginTop: 6 }}>
        Stockholm → Tunis
      </ThemedText>
      <CapacityBar available={available} capacity={capacity} style={{ marginTop: 8 }} />
    </LinearGradient>
  );
}

/** The iOS large widget: countdown, both stops and two deep links. */
function LargeWidgetPreview({ state }: { state: PreviewState }) {
  const { available, capacity } = STATE_PALETTE[state];
  const days = state === "scheduled" ? "05" : state === "departing_soon" ? "02" : "—";
  return (
    <LinearGradient
      colors={["#1E4278", "#132B55", "#0C1B36"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ borderRadius: 22, padding: 15 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Eyebrow label="NEXT DEPARTURE" color={MUTED_ON_NAVY} />
        <View style={{ marginLeft: "auto" }}>
          <StatusPill state={state} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: spacing.sm }}>
        <ThemedText
          variant="display"
          translate={false}
          style={{ color: "#FFFFFF", fontSize: 32, lineHeight: 34 }}
        >
          {days}
        </ThemedText>
        <ThemedText variant="footnote" style={{ color: ORANGE_PALE, fontFamily: fontFamily.bold, marginBottom: 4 }}>
          DAYS
        </ThemedText>
        <ThemedText
          variant="footnote"
          translate={false}
          style={{ color: PALE, marginLeft: "auto", textAlign: "right", lineHeight: 14 }}
        >
          15 Nov{"\n"}14:00
        </ThemedText>
      </View>

      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.14)", marginVertical: spacing.md }} />

      {[
        { badge: "A", title: "Stockholm", note: "Collection · 14 Nov 18:00", filled: true },
        { badge: "B", title: "Tunis", note: "Delivery point · 17 Nov 09:00", filled: false },
      ].map((stop) => (
        <View key={stop.title} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <View
            style={{
              width: 17,
              height: 17,
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: stop.filled ? ORANGE : "rgba(255,255,255,0.16)",
            }}
          >
            <ThemedText
              variant="footnote"
              translate={false}
              style={{
                color: stop.filled ? NAVY_DEEP : "#FFFFFF",
                fontSize: 8,
                fontFamily: fontFamily.extrabold,
                lineHeight: 10,
              }}
            >
              {stop.badge}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="footnote" style={{ color: "#FFFFFF", fontFamily: fontFamily.bold }}>
              {stop.title}
            </ThemedText>
            <ThemedText variant="footnote" translate={false} style={{ color: MUTED_ON_NAVY, fontSize: 10 }}>
              {stop.note}
            </ThemedText>
          </View>
        </View>
      ))}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm }}>
        <CapacityBar available={available} capacity={capacity} style={{ flex: 1 }} />
        <ThemedText variant="footnote" translate={false} style={{ color: PALE, fontFamily: fontFamily.semibold }}>
          {`${available} / ${capacity}`}
        </ThemedText>
      </View>

      <View style={{ flexDirection: "row", gap: 6, marginTop: spacing.md }}>
        <View style={{ flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: radii.pill, backgroundColor: ORANGE }}>
          <ThemedText variant="footnote" style={{ color: NAVY_DEEP, fontFamily: fontFamily.bold }}>
            View trip
          </ThemedText>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 7,
            borderRadius: radii.pill,
            backgroundColor: "rgba(255,255,255,0.14)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
        >
          <ThemedText variant="footnote" style={{ color: "#FFFFFF", fontFamily: fontFamily.bold }}>
            Track parcel
          </ThemedText>
        </View>
      </View>
    </LinearGradient>
  );
}

/** The Lock Screen card: white tint, navy type, orange accent. */
function LockScreenCardPreview({
  compact = false,
  state = "scheduled",
}: {
  compact?: boolean;
  state?: PreviewState;
}) {
  const theme = useThemeColors();
  const { available, capacity } = STATE_PALETTE[state];
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.borderSubtle,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFF4EC",
          }}
        >
          <AppIcon name="bus" size={19} color={ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow label="NEXT DEPARTURE" color="#8A97AC" />
          <ThemedText
            variant="headline"
            translate={false}
            style={{ color: NAVY_DEEP, marginTop: 3, fontSize: 14 }}
          >
            15 Nov · 14:00
          </ThemedText>
          <ThemedText variant="footnote" style={{ color: "#55627A", marginTop: 2 }}>
            Stockholm → Tunis
          </ThemedText>
        </View>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 3.5,
            borderColor: "#FFE7D4",
            borderTopColor: ORANGE,
            borderRightColor: ORANGE,
            transform: [{ rotate: "-30deg" }],
          }}
        />
      </View>

      {compact ? null : (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 11,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 13,
              backgroundColor: "#F4F6FA",
            }}
          >
            <AppIcon name="location" size={13} color={NAVY_DEEP} />
            <ThemedText variant="footnote" style={{ color: "#55627A" }}>
              Stockholm → Tunis
            </ThemedText>
            <ThemedText
              variant="footnote"
              style={{ color: NAVY_DEEP, fontFamily: fontFamily.semibold, marginLeft: "auto" }}
            >
              Cargo van
            </ThemedText>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: radii.pill,
                backgroundColor:
                  state === "full" ? "#FDECEC" : state === "departing_soon" ? "#FEF3E2" : "#E7F5EE",
                borderWidth: 1,
                borderColor:
                  state === "full" ? "#F5C9C9" : state === "departing_soon" ? "#F6DFB8" : "#BFE5D1",
              }}
            >
              <ThemedText
                variant="footnote"
                style={{
                  color: state === "full" ? "#B32525" : state === "departing_soon" ? "#9A5B06" : "#17865B",
                  fontFamily: fontFamily.bold,
                }}
              >
                {STATE_COPY[state]}
              </ThemedText>
            </View>
            <CapacityBar available={available} capacity={capacity} track="#E4E9F0" style={{ flex: 1 }} />
            <ThemedText
              variant="footnote"
              translate={false}
              style={{ color: NAVY_DEEP, fontFamily: fontFamily.bold }}
            >
              {`${available} / ${capacity}`}
            </ThemedText>
          </View>
        </>
      )}
    </View>
  );
}

/** Android 4 × 2: route and cargo on the left, day ring and tracking right. */
function AndroidMediumWidgetPreview({ state }: { state: PreviewState }) {
  const { available, capacity } = STATE_PALETTE[state];
  return (
    <LinearGradient
      colors={NAVY_FIELD}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ borderRadius: 28, padding: 14, minHeight: 128, flexDirection: "row", gap: 12 }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE }} />
          <Eyebrow label="NEXT DEPARTURE" color={MUTED_ON_NAVY} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 9 }}>
          <ThemedText variant="headline" style={{ color: "#FFFFFF", fontSize: 15 }}>
            Stockholm
          </ThemedText>
          <ThemedText
            variant="headline"
            translate={false}
            style={{ color: ORANGE, fontSize: 15, marginHorizontal: 6 }}
          >
            →
          </ThemedText>
          <ThemedText variant="headline" style={{ color: "#FFFFFF", fontSize: 15 }}>
            Tunis
          </ThemedText>
        </View>

        <ThemedText variant="footnote" translate={false} style={{ color: PALE, marginTop: 5 }}>
          15 Nov · 14:00 · Cargo van
        </ThemedText>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: "auto" }}>
          <CapacityBar available={available} capacity={capacity} style={{ flex: 1 }} />
          <ThemedText variant="footnote" translate={false} style={{ color: PALE, fontFamily: fontFamily.semibold }}>
            {`${available}/${capacity}`}
          </ThemedText>
        </View>
      </View>

      <View style={{ width: 52, alignItems: "center", justifyContent: "center", gap: 6 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 2.5,
            borderColor: ORANGE,
            backgroundColor: "rgba(255,255,255,0.10)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemedText
            variant="headline"
            translate={false}
            style={{ color: "#FFFFFF", fontSize: 14, fontFamily: fontFamily.extrabold, lineHeight: 15 }}
          >
            05
          </ThemedText>
          <ThemedText
            variant="overline"
            style={{ color: MUTED_ON_NAVY, fontSize: 6, letterSpacing: 0.5, lineHeight: 8 }}
          >
            DAYS
          </ThemedText>
        </View>
        <ThemedText variant="footnote" style={{ color: ORANGE_PALE, fontSize: 7.5, fontFamily: fontFamily.bold }}>
          TRACK
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

/** Android 2 × 2 in the light container: day, time, route. */
function AndroidSmallWidgetPreview() {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 13,
        minHeight: 120,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE }} />
        <Eyebrow label="NEXT" color="#8A97AC" />
      </View>
      <View>
        <ThemedText
          variant="display"
          translate={false}
          style={{ color: NAVY_DEEP, fontSize: 26, lineHeight: 28, fontFamily: fontFamily.extrabold }}
        >
          15
        </ThemedText>
        <ThemedText variant="footnote" translate={false} style={{ color: "#55627A", marginTop: 2 }}>
          Nov · 14:00
        </ThemedText>
      </View>
      <ThemedText variant="footnote" style={{ color: "#8A97AC", fontSize: 8.5 }}>
        Stockholm → Tunis
      </ThemedText>
    </View>
  );
}

function CompactIslandPreview() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
      <View
        style={{
          height: 37,
          minWidth: 112,
          borderRadius: 19,
          backgroundColor: ISLAND_BLACK,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE }} />
        <AppIcon name="bus" size={17} color={ORANGE} />
      </View>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: ISLAND_BLACK }} />
      <View
        style={{
          height: 37,
          minWidth: 58,
          borderRadius: 19,
          backgroundColor: ISLAND_BLACK,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 13,
        }}
      >
        <ThemedText variant="footnote" translate={false} style={{ color: "#FFFFFF", fontFamily: fontFamily.bold, fontSize: 12 }}>
          14:00
        </ThemedText>
      </View>
    </View>
  );
}

function MinimalIslandPreview() {
  return (
    <View
      style={{
        height: 37,
        minWidth: 64,
        alignSelf: "flex-start",
        borderRadius: 19,
        backgroundColor: ISLAND_BLACK,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingHorizontal: 12,
      }}
    >
      <AppIcon name="bus" size={15} color={ORANGE} />
      <ThemedText variant="footnote" translate={false} style={{ color: "#FFFFFF", fontFamily: fontFamily.bold }}>
        5d
      </ThemedText>
    </View>
  );
}

function CountdownRing({
  value,
  unit = "DAYS",
  unavailable = false,
}: {
  value: string;
  unit?: string;
  unavailable?: boolean;
}) {
  return (
    <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: 48,
          height: 48,
          borderRadius: 24,
          borderWidth: 2.5,
          borderColor: "rgba(255,255,255,0.14)",
          borderTopColor: unavailable ? "#F5A3A8" : ORANGE,
          borderRightColor: unavailable ? "#F5A3A8" : ORANGE,
          transform: [{ rotate: "-20deg" }],
        }}
      />
      <ThemedText
        variant="headline"
        translate={false}
        style={{ color: "#FFFFFF", fontFamily: fontFamily.extrabold, lineHeight: 16 }}
      >
        {value}
      </ThemedText>
      <ThemedText
        variant="overline"
        style={{ color: MUTED_ON_NAVY, fontSize: 7, letterSpacing: 0.8 }}
      >
        {unit}
      </ThemedText>
    </View>
  );
}

function ExpandedIslandPreview({ state }: { state: PreviewState }) {
  const { available, capacity } = STATE_PALETTE[state];
  const departing = state === "departing_soon";
  const full = state === "full";
  const minutes = 12;

  return (
    <View
      style={{
        backgroundColor: ISLAND_BLACK,
        borderRadius: 28,
        padding: 15,
        borderWidth: departing ? 1 : 0,
        borderColor: "rgba(242,118,27,0.45)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        {departing ? (
          <CountdownRing value={String(minutes)} unit="MIN" />
        ) : full ? (
          <CountdownRing value="—" unavailable />
        ) : (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(242,118,27,0.16)",
            }}
          >
            <AppIcon name="bus" size={18} color={ORANGE} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <ThemedText variant="footnote" style={{ color: "#9AA6B8", fontSize: 10 }}>
            {departing ? "Departs in" : "Next departure"}
          </ThemedText>
          <ThemedText
            variant="headline"
            translate={false}
            style={{ color: "#FFFFFF", marginTop: 3, fontSize: 13 }}
          >
            {departing ? `${minutes} min · 14:00` : "Stockholm → Tunis"}
          </ThemedText>
        </View>
        <StatusPill state={state} />
      </View>

      <View style={{ height: 1, backgroundColor: "#1E2129", marginVertical: 11 }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <AppIcon name="location" size={13} color="#6A85B4" />
        <ThemedText variant="footnote" translate={false} style={{ color: "#AEB9C9", flex: 1 }} numberOfLines={1}>
          {departing ? "Stockholm → Tunis" : "Postnord, Sundbyberg"}
        </ThemedText>
        <ThemedText variant="footnote" style={{ color: "#FFFFFF", fontFamily: fontFamily.semibold }}>
          {departing ? "Gate B · Cargo van" : "Cargo van"}
        </ThemedText>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
        <Eyebrow label="CARGO" color="#9AA6B8" />
        <CapacityBar available={available} capacity={capacity} style={{ flex: 1, height: 5 }} />
        <ThemedText variant="footnote" translate={false} style={{ color: "#FFFFFF", fontFamily: fontFamily.bold }}>
          {`${available} / ${capacity}`}
        </ThemedText>
      </View>
    </View>
  );
}

type AppIconName = React.ComponentProps<typeof AppIcon>["name"];

function FamilyCard({ label, note, icon }: { label: string; note: string; icon: AppIconName }) {
  const theme = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 128,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderSubtle,
        gap: 6,
      }}
    >
      <AppIcon name={icon} size={16} color={theme.primary} />
      <ThemedText variant="footnote" style={{ fontFamily: fontFamily.bold }}>
        {label}
      </ThemedText>
      <ThemedText variant="caption" tone="tertiary" style={{ fontSize: 10.5 }}>
        {note}
      </ThemedText>
    </View>
  );
}

function GuideScreenShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader title={title} subtitle={subtitle} showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 48, gap: spacing.md }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function WidgetGuideHomeScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const isIos = Platform.OS === "ios";
  const [state, setState] = useState<PreviewState>("scheduled");

  return (
    <GuideScreenShell
      title="Widgets"
      subtitle={Platform.OS === "android" ? "Your next trip on the Home Screen" : "Your next trip, one glance away"}
    >
      <GuideStatus onOpenSettings={() => Linking.openSettings()} />

      <GuideCard style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Eyebrow label="PREVIEW" color={theme.textTertiary} />
          <ThemedText variant="footnote" tone="tertiary">
            {STATE_COPY[state]}
          </ThemedText>
        </View>
        <StateSelector value={state} onChange={setState} />
        {isIos ? <MediumWidgetPreview state={state} /> : <AndroidMediumWidgetPreview state={state} />}
        <ThemedText variant="bodySm" tone="secondary">
          {isIos
            ? "The same navy card is used by the Home Screen widget, the Lock Screen card and the Dynamic Island."
            : "The navy card adapts to 2 × 2, 4 × 2 and 4 × 4 sizes, and switches to a white surface in light theme."}
        </ThemedText>
      </GuideCard>

      <GuideCard style={{ gap: spacing.md }}>
        <SectionHeading label="Widget families" note="Choose the size that fits your Home Screen." />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {isIos ? (
            <>
              <FamilyCard label="Small" note="2 × 2 · countdown" icon="square-outline" />
              <FamilyCard label="Medium" note="4 × 2 · route" icon="tablet-landscape-outline" />
              <FamilyCard label="Large" note="4 × 4 · briefing" icon="grid-outline" />
              <FamilyCard label="Lock Screen" note="3 accessory styles" icon="lock-closed-outline" />
            </>
          ) : (
            <>
              <FamilyCard label="2 × 2" note="day + route" icon="square-outline" />
              <FamilyCard label="4 × 2" note="route + countdown" icon="tablet-landscape-outline" />
              <FamilyCard label="4 × 4" note="full briefing" icon="grid-outline" />
            </>
          )}
        </View>
      </GuideCard>

      <GuideCard>
        <PressableScale
          onPress={() => router.push("/(home)/profile/widget-guide/lock-screen" as any)}
          haptic="light"
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primarySoft,
            }}
          >
            <AppIcon name="phone-portrait-outline" size={21} color={theme.primary} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <ThemedText variant="headline">
              {Platform.OS === "android" ? "Home Screen widget" : "Home Screen & Lock Screen"}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary">
              {Platform.OS === "android" ? "Add and resize the departure widget" : "Add a widget or enable Live Activities"}
            </ThemedText>
          </View>
          <AppIcon name="chevron-forward" size={18} color={theme.textTertiary} />
        </PressableScale>
      </GuideCard>

      {isIos ? (
        <GuideCard>
          <PressableScale
            onPress={() => router.push("/(home)/profile/widget-guide/dynamic-island" as any)}
            haptic="light"
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.accentSoft,
              }}
            >
              <AppIcon name="radio-button-on" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <ThemedText variant="headline">Dynamic Island</ThemedText>
              <ThemedText variant="caption" tone="secondary">
                Compact, minimal and expanded states
              </ThemedText>
            </View>
            <AppIcon name="chevron-forward" size={18} color={theme.textTertiary} />
          </PressableScale>
        </GuideCard>
      ) : null}

      <PrimaryButton
        label="Preview next departure"
        icon="arrow-forward"
        onPress={() => router.push("/(home)/liveStatus" as any)}
      />
    </GuideScreenShell>
  );
}

export function LockScreenWidgetGuideScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const isIos = Platform.OS === "ios";
  const [state, setState] = useState<PreviewState>("scheduled");
  const sizeLabel = isIos ? "Medium · 338 pt" : "4 × 2 · 250 dp";

  return (
    <GuideScreenShell
      title={Platform.OS === "android" ? "Home Screen widget" : "Widgets & Lock Screen"}
      subtitle="See your departure without opening the app"
    >
      <GuideCard style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Eyebrow label={isIos ? "LOCK SCREEN CARD" : "HOME SCREEN WIDGET"} color={theme.textTertiary} />
          <ThemedText variant="footnote" tone="tertiary">
            {sizeLabel}
          </ThemedText>
        </View>
        <StateSelector value={state} onChange={setState} />
        {isIos ? (
          <View
            style={{
              borderRadius: radii.lg,
              padding: spacing.md,
              backgroundColor: theme.surfaceAlt,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
            }}
          >
            <LockScreenCardPreview state={state} />
          </View>
        ) : (
          <AndroidMediumWidgetPreview state={state} />
        )}
        <ThemedText variant="bodySm" tone="secondary">
          Route, departure time, vehicle and remaining cargo — with the same state language as the app.
        </ThemedText>
      </GuideCard>

      {isIos ? (
        <GuideCard style={{ gap: spacing.md }}>
          <SectionHeading label="Small and large" />
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "stretch" }}>
            <View style={{ width: 122 }}>
              <SmallWidgetPreview state={state} />
            </View>
            <View style={{ flex: 1 }}>
              <LargeWidgetPreview state={state} />
            </View>
          </View>
          <ThemedText variant="bodySm" tone="secondary">
            Small is a countdown, large adds the collected and delivery stops plus deep links to the trip and parcel tracking.
          </ThemedText>
        </GuideCard>
      ) : (
        <GuideCard style={{ gap: spacing.md }}>
          <SectionHeading label="Sizes" />
          <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "stretch" }}>
            <View style={{ width: 118 }}>
              <AndroidSmallWidgetPreview />
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <FamilyCard label="2 × 2" note="110 dp · day + route" icon="square-outline" />
              <FamilyCard label="4 × 2" note="250 × 110 dp · ring" icon="tablet-landscape-outline" />
              <FamilyCard label="4 × 4" note="250 dp · briefing" icon="grid-outline" />
            </View>
          </View>
          <ThemedText variant="bodySm" tone="secondary">
            Drag the corner of the widget to resize. The layout switches between the compact and briefing variants automatically.
          </ThemedText>
        </GuideCard>
      )}

      <GuideCard>
        <SectionHeading label="Set it up" />
        {isIos ? (
          <>
            <GuideStep
              number={1}
              title="Add the Home Screen widget"
              description="Touch and hold the Home Screen, tap Edit, choose Add Widget, then select Tunisiska Mega. Pick small, medium or large."
            />
            <GuideStep
              number={2}
              title="Add the Lock Screen widget"
              description="Touch and hold the Lock Screen, tap Customise, then add Tunisiska under the widget row and choose a circular or rectangular style."
            />
            <GuideStep
              number={3}
              title="Enable Live Activities"
              description="For the Lock Screen card and Dynamic Island, open iPhone Settings, choose Tunisiska, then turn on Live Activities."
              last
            />
          </>
        ) : (
          <>
            <GuideStep
              number={1}
              title="Open your Home Screen widgets"
              description="Touch and hold an empty area of the Home Screen, then tap Widgets."
            />
            <GuideStep
              number={2}
              title="Add Tunisiska Mega"
              description="Find Tunisiska Mega, drag the departure widget onto your Home Screen, then resize it to 2 × 2, 4 × 2 or 4 × 4."
            />
            <GuideStep
              number={3}
              title="Tap to follow your trip"
              description="The widget shows the next route, the countdown and remaining cargo space. Tap it to open the trip."
              last
            />
          </>
        )}
      </GuideCard>

      <GuideStatus onOpenSettings={() => Linking.openSettings()} />
      {isIos ? (
        <PrimaryButton label="Open iPhone settings" variant="secondary" onPress={() => Linking.openSettings()} />
      ) : null}
      <PrimaryButton
        label="Preview departure"
        icon="arrow-forward"
        onPress={() => router.push("/(home)/liveStatus" as any)}
      />
    </GuideScreenShell>
  );
}

export function DynamicIslandGuideScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const [state, setState] = useState<PreviewState>("scheduled");

  return (
    <GuideScreenShell title="Dynamic Island guide" subtitle="Follow your trip from the top of your iPhone">
      <GuideCard style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <Eyebrow label="LIVE PREVIEW" color={theme.textTertiary} />
          <ThemedText variant="footnote" tone="tertiary">
            {STATE_COPY[state]}
          </ThemedText>
        </View>
        <StateSelector value={state} onChange={setState} />

        <View
          style={{
            backgroundColor: ISLAND_BOARD,
            borderRadius: 24,
            padding: spacing.lg,
            gap: spacing.lg,
          }}
        >
          <View style={{ gap: spacing.sm }}>
            <Eyebrow label="COMPACT" color="rgba(255,255,255,0.5)" />
            <CompactIslandPreview />
          </View>
          <View style={{ gap: spacing.sm }}>
            <Eyebrow label="MINIMAL" color="rgba(255,255,255,0.5)" />
            <MinimalIslandPreview />
          </View>
        </View>
      </GuideCard>

      <View style={{ gap: spacing.sm }}>
        <Eyebrow label="EXPANDED" color={theme.textTertiary} style={{ marginLeft: 4 }} />
        <ExpandedIslandPreview state={state} />
      </View>

      <GuideCard>
        <SectionHeading label="What you need" />
        <GuideStep
          number={1}
          title="A supported iPhone"
          description="The Dynamic Island appears on iPhone models that include it. Every other iPhone shows the Lock Screen card instead."
        />
        <GuideStep
          number={2}
          title="Live Activities enabled"
          description="In Settings, open Tunisiska and allow Live Activities for the app."
        />
        <GuideStep
          number={3}
          title="An upcoming departure"
          description="The app keeps the next scheduled trip in the activity, including its route, departure time and cargo space."
          last
        />
      </GuideCard>

      <GuideStatus onOpenSettings={() => Linking.openSettings()} />
      <PrimaryButton label="Open iPhone settings" variant="secondary" onPress={() => Linking.openSettings()} />
      <PrimaryButton
        label="Open live preview"
        icon="arrow-forward"
        onPress={() => router.push("/(home)/liveStatus" as any)}
      />
    </GuideScreenShell>
  );
}
