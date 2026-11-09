import React, { useEffect, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, View, type ViewStyle } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import ThemedText from "@/app/components/ui/ThemedText";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import PressableScale from "@/app/components/ui/PressableScale";
import Badge from "@/app/components/ui/Badge";
import EmptyState from "@/app/components/ui/EmptyState";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { useTrips } from "@/app/hooks/useAppData";
import { useNextDeparture } from "@/app/hooks/useAppData";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { useTranslationText } from "@/app/hooks/useTranslation";
import {
  formatDepartureDate,
  formatDepartureTime,
  formatFullDate,
  formatRoute,
  formatStatus,
  formatVehicle,
} from "@/app/lib/tripFormat";
import { areActivitiesEnabled } from "@/app/lib/liveActivity";
import CapacityCard from "@/app/components/trips/CapacityCard";
import {
  formatDistanceKm,
  formatDuration,
  getRouteMetrics,
} from "@/app/lib/routeMetrics";
import { currentDateLocale } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";

function Surface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useThemeColors();
  return <View style={[{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, ...shadows.sm }, style]}>{children}</View>;
}

function useSelectedTrip() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: trips, loading, error, refresh } = useTrips("upcoming");
  return { trip: id ? trips.find((item) => item.id === id) ?? null : trips[0] ?? null, loading, error, refresh };
}

function TripMissing({ loading, error, onRetry }: { loading: boolean; error?: string | null; onRetry?: () => void }) {
  const router = useRouter();
  const errDep = useTranslationText("Couldn’t load departures");
  const errDesc = useTranslationText("Check your connection and try again.");
  const noUp = useTranslationText("No upcoming departure");
  const routeDesc = useTranslationText("A route view will appear when a departure is scheduled.");
  const retry = useTranslationText("Try again");
  const browse = useTranslationText("Browse trips");
  if (loading) return <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, gap: spacing.md }}><View style={{ height: 22, width: 150, borderRadius: 12, backgroundColor: "#E4E9F0" }} /><View style={{ height: 180, borderRadius: radii.lg, backgroundColor: "#E4E9F0" }} /></View>;
  return <EmptyState icon={error ? "alert-circle-outline" : "calendar-outline"} title={error ? errDep : noUp} description={error ? errDesc : routeDesc} action={error && onRetry ? <PrimaryButton label={retry} onPress={onRetry} fullWidth={false} /> : <PrimaryButton label={browse} onPress={() => router.replace("/(tabs)/trips")} fullWidth={false} />} />;
}

export function DepartureBoardScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { data: trips, loading, error, refresh } = useTrips("upcoming");
  const dTitle = useTranslationText("Departure board");
  const dSub = useTranslationText("Scheduled journeys");
  const up = useTranslationText("UPCOMING DEPARTURES");
  const load = useTranslationText("Loading…");
  const sched = useTranslationText("scheduled");
  const choose = useTranslationText("Choose a departure to see its route and details.");
  const errTitle = useTranslationText("Couldn’t load departures");
  const errDesc = useTranslationText("Check your connection and try again.");
  const tryAgain = useTranslationText("Try again");
  const noDep = useTranslationText("No departures scheduled");
  const noDepDesc = useTranslationText("Check back soon for the next journey.");
  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title={dTitle} subtitle={dSub} showBack />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 48, gap: spacing.md }}>
      <LinearGradient colors={["#132B55", "#0B1B33"]} style={{ padding: spacing.xl, borderRadius: radii.xl, gap: 8 }}>
        <ThemedText variant="overline" style={{ color: "#B7C8E4" }}>{up}</ThemedText>
        <ThemedText variant="title1" style={{ color: "white" }}>{loading ? load : `${trips.length} ${sched}`}</ThemedText>
        <ThemedText variant="bodySm" style={{ color: "#D9E2F1" }}>{choose}</ThemedText>
      </LinearGradient>
      {trips.map((trip) => <PressableScale key={trip.id} onPress={() => router.push(`/(home)/trips/${trip.id}`)} haptic="light">
        <Surface style={{ padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}><AppIcon name={trip.vehicle.toLowerCase().includes("ferry") ? "boat-outline" : "bus-outline"} size={22} color={theme.primary} /></View>
          <View style={{ flex: 1, gap: 3 }}><ThemedText variant="title3">{formatFullDate(trip)}</ThemedText><ThemedText variant="bodySm" tone="secondary">{formatRoute(trip)}</ThemedText><ThemedText variant="caption" tone="tertiary">{formatDepartureTime(trip)} · {formatVehicle(trip.vehicle)}</ThemedText></View>
          <AppIcon name="chevron-forward" size={18} color={theme.textTertiary} />
        </Surface>
      </PressableScale>)}
      {!loading && error ? <EmptyState icon="alert-circle-outline" title={errTitle} description={errDesc} action={<PrimaryButton label={tryAgain} onPress={refresh} fullWidth={false} />} /> : null}
      {!loading && !error && trips.length === 0 ? <EmptyState icon="calendar-outline" title={noDep} description={noDepDesc} /> : null}
    </ScrollView>
  </SafeAreaView>;
}

export function RouteDiagramScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { trip, loading, error, refresh } = useSelectedTrip();
  const rdTitle = useTranslationText("Route diagram");
  const jsSubtitle = useTranslationText("Journey stops");
  const journey = useTranslationText("YOUR JOURNEY");
  const overview = useTranslationText("Route overview");
  const departureLabel = useTranslationText("Departure");
  const serviceStop = useTranslationText("Service stop");
  const notAvail = useTranslationText("Not available");
  const destinationLabel = useTranslationText("Destination");
  const stopsNote = useTranslationText("Stops reflect the locations configured for this departure.");
  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title={rdTitle} subtitle={jsSubtitle} showBack />
    {trip ? <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 48, gap: spacing.md }}>
      <Surface style={{ backgroundColor: theme.primary, borderColor: theme.primary, padding: spacing.xl }}>
        <ThemedText variant="overline" style={{ color: "#B7C8E4" }}>{journey}</ThemedText>
        <ThemedText variant="title2" style={{ color: "#FFFFFF", marginTop: 6 }}>{formatRoute(trip)}</ThemedText>
        <ThemedText variant="caption" style={{ color: "#D9E2F1", marginTop: 3 }}>{formatFullDate(trip)} · {formatDepartureTime(trip)}</ThemedText>
      </Surface>
      <Surface>
        <ThemedText variant="title3" style={{ marginBottom: spacing.lg }}>{overview}</ThemedText>
        <RouteStop icon="navigate" title={trip.origin} subtitle={departureLabel} first />
        {trip.tunisiaLocations.map((location, index) => <RouteStop key={`${location.governorate}-${index}`} icon="location" title={location.governorate} subtitle={location.available ? serviceStop : notAvail} />)}
        <RouteStop icon="flag" title={trip.destination} subtitle={destinationLabel} last />
      </Surface>
      <ThemedText variant="caption" tone="tertiary">{stopsNote}</ThemedText>
    </ScrollView> : <TripMissing loading={loading} error={error} onRetry={refresh} />}
  </SafeAreaView>;
}

function RouteStop({ icon, title, subtitle, first, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; first?: boolean; last?: boolean }) {
  const theme = useThemeColors();
  return <View style={{ flexDirection: "row", gap: spacing.md, minHeight: 68 }}>
    <View style={{ width: 30, alignItems: "center" }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: first || last ? theme.accentSoft : theme.primarySoft, alignItems: "center", justifyContent: "center" }}><AppIcon name={icon} size={15} color={first || last ? theme.accent : theme.primary} /></View>
      {!last ? <View style={{ width: 2, flex: 1, backgroundColor: theme.border, marginVertical: 3 }} /> : null}
    </View>
    <View style={{ flex: 1, paddingTop: 1, paddingBottom: 14 }}><ThemedText variant="headline">{title}</ThemedText><ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>{subtitle}</ThemedText></View>
  </View>;
}

export function StowageManifestScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { trip, loading, error, refresh } = useSelectedTrip();
  const smTitle = useTranslationText("Stowage manifest");
  const ccSubtitle = useTranslationText("Cargo capacity");
  const departureLabel = useTranslationText("DEPARTURE");
  const shipmentTitle = useTranslationText("Shipment manifest");
  const shipmentDesc = useTranslationText("Individual parcel records are available in My Shipments. This screen shows the published capacity for this trip.");
  const viewShip = useTranslationText("View my shipments");
  const serviceRegions = useTranslationText("Serviced regions");
  const availLabel = useTranslationText("Available");
  const unavailLabel = useTranslationText("Unavailable");
  const capacity = trip?.capacity;
  const available = trip?.availableCapacity;
  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title={smTitle} subtitle={ccSubtitle} showBack />
    {trip ? <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 48, gap: spacing.md }}>
      <Surface style={{ backgroundColor: theme.primary, borderColor: theme.primary, padding: spacing.xl }}>
        <ThemedText variant="overline" style={{ color: "#B7C8E4" }}>{departureLabel}</ThemedText>
        <ThemedText variant="title2" style={{ color: "white", marginTop: 6 }}>{formatRoute(trip)}</ThemedText>
        <ThemedText variant="caption" style={{ color: "#D9E2F1", marginTop: 4 }}>{formatFullDate(trip)} · {formatDepartureTime(trip)}</ThemedText>
      </Surface>
      <CapacityCard capacity={capacity} available={available} tone="dark" title="Loading capacity" />
      <Surface style={{ alignItems: "center", paddingVertical: spacing.xl }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center" }}><AppIcon name="cube-outline" size={26} color={theme.accent} /></View>
        <ThemedText variant="title3" align="center" style={{ marginTop: spacing.md }}>Shipment manifest</ThemedText>
        <ThemedText variant="bodySm" tone="secondary" align="center" style={{ marginTop: spacing.xs }}>Individual parcel records are available in My Shipments. This screen shows the published capacity for this trip.</ThemedText>
        <PrimaryButton label={viewShip} variant="secondary" onPress={() => router.push("/(home)/profile/booking")} style={{ marginTop: spacing.md }} />
      </Surface>
      {trip.tunisiaLocations.length > 0 ? <Surface><ThemedText variant="title3" style={{ marginBottom: spacing.md }}>{serviceRegions}</ThemedText>{trip.tunisiaLocations.map((location, index) => <View key={`${location.governorate}-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: index === trip.tunisiaLocations.length - 1 ? 0 : 1, borderColor: theme.borderSubtle }}><AppIcon name="location-outline" size={17} color={theme.primary} /><ThemedText variant="bodySm" style={{ flex: 1 }}>{location.governorate}</ThemedText><Badge label={location.available ? availLabel : unavailLabel} tone={location.available ? "success" : "neutral"} /></View>)}</Surface> : null}
    </ScrollView> : <TripMissing loading={loading} error={error} onRetry={refresh} />}
  </SafeAreaView>;
}

/** Brand colours used by the native widget and Live Activity previews. */
const LIVE_NAVY_FIELD = ["#1E4278", "#132B55", "#0E2040"] as const;
const LIVE_ORANGE = "#F2761B";
const LIVE_ORANGE_PALE = "#FFB27A";
const ISLAND_BLACK = "#050506";
const ISLAND_BOARD = "#0A0E15";

/** Glyph for the 3D vehicle orb, chosen from the trip's own vehicle type. */
function vehicleGlyph(vehicle?: string | null): string {
  const value = (vehicle ?? "").toLowerCase();
  if (value.includes("air")) return "✈️";
  if (value.includes("ship") || value.includes("ferry") || value.includes("container")) return "🚢";
  if (value.includes("van")) return "🚐";
  return "🚚";
}

const LIVE_STATUS_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  success: { fg: "#7DD8A9", bg: "rgba(125,216,169,0.12)", border: "rgba(125,216,169,0.2)" },
  warning: { fg: LIVE_ORANGE_PALE, bg: "rgba(242,118,27,0.16)", border: "rgba(242,118,27,0.28)" },
  danger: { fg: "#F5A3A8", bg: "rgba(245,163,168,0.14)", border: "rgba(245,163,168,0.22)" },
  info: { fg: "#A9C4FF", bg: "rgba(169,196,255,0.14)", border: "rgba(169,196,255,0.22)" },
  neutral: { fg: "#D9E2F1", bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.18)" },
};

function LiveStatusPill({ label, tone }: { label: string; tone: string }) {
  const palette = LIVE_STATUS_COLORS[tone] ?? LIVE_STATUS_COLORS.neutral;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radii.pill,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <ThemedText
        variant="footnote"
        translate={false}
        style={{ color: palette.fg, fontWeight: "700", fontSize: 10, letterSpacing: 0.4 }}
      >
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

function LiveCapacityBar({
  available,
  capacity,
  track = "rgba(255,255,255,0.18)",
  style,
}: {
  available: number;
  capacity: number;
  track?: string;
  style?: ViewStyle;
}) {
  const ratio = capacity > 0 ? Math.max(0, Math.min(1, available / capacity)) : 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={[{ height: 5, borderRadius: 99, backgroundColor: track, overflow: "hidden" }, style]}>
      <Animated.View
        style={[
          {
            height: "100%",
            borderRadius: 99,
            backgroundColor: available > 0 ? LIVE_ORANGE : "#F87171",
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

/**
 * Live Activity screen.
 *
 * Mirrors the four native presentations — compact, minimal, expanded and the
 * Lock Screen card — using the next genuine departure, so what the user sees
 * here is what ActivityKit renders on their iPhone.
 */
export function LiveActivityScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { language } = useLanguage();
  const locale = currentDateLocale(language);
  const { data: trip, loading, error, refresh } = useNextDeparture();
  const [activitiesEnabled, setActivitiesEnabled] = useState<boolean | null>(null);
  const distanceLabel = useTranslationText("Distance", language);
  const durationLabel = useTranslationText("Duration", language);
  const liveTitle = useTranslationText("Live Activity");
  const liveSub = useTranslationText("Your departure at a glance");
  const din = useTranslationText("Dynamic Island");
  const lock = useTranslationText("Lock Screen");
  const liveEn = useTranslationText("Live Activities enabled");
  const availIos = useTranslationText("Available on iPhone with iOS 16.2 or later");
  const iosFeature = useTranslationText("Live Activity is an iPhone feature");
  const nextScheduled = useTranslationText(
    "Your next scheduled departure appears on the Lock Screen and Dynamic Island when supported.",
  );
  const enableSettings = useTranslationText("Enable Live Activities in Settings");
  const availApp = useTranslationText("Your departure details remain available in the app on this device.");
  const viewDep = useTranslationText("View departure");

  useEffect(() => {
    let active = true;
    areActivitiesEnabled().then((enabled) => {
      if (active) setActivitiesEnabled(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  const timing = useMemo(() => {
    if (!trip) return null;
    const diff = trip.departureDate.getTime() - Date.now();
    const minutes = Math.max(0, Math.floor(diff / 60000));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const compact = diff <= 0 ? "departed" : diff <= 3600000 ? `${minutes}m` : days >= 1 ? `${days}d` : `${hours}h`;
    return {
      diff,
      departingSoon: diff > 0 && diff <= 3600000,
      days,
      hours,
      minutes,
      compact,
      countdown: diff <= 0 ? "Departed" : diff <= 3600000 ? `${minutes} min` : days >= 1 ? `${days} days` : `${hours} h`,
    };
  }, [trip]);

  // Same source as the map, so both screens report the same figures.
  const routeMetrics = useMemo(
    () => getRouteMetrics(trip?.routeValue, trip?.vehicle),
    [trip?.routeValue, trip?.vehicle],
  );
  const distanceText = formatDistanceKm(routeMetrics.distanceKm, locale);
  const durationText = formatDuration(routeMetrics.durationHours);

  const status = formatStatus(trip?.status);
  const capacity = trip?.capacity ?? 0;
  const available = trip?.availableCapacity ?? capacity;
  const departureStamp = trip ? `${formatDepartureDate(trip)} · ${formatDepartureTime(trip)}` : "";
  const timeStamp = trip ? formatDepartureTime(trip) : "";

  const islandRow = (label: string) => (
    <ThemedText variant="overline" translate={false} style={{ color: theme.textTertiary, letterSpacing: 1.1, marginLeft: 4 }}>
      {label}
    </ThemedText>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader title={liveTitle} subtitle={liveSub} showBack />
      {loading ? (
        <TripMissing loading />
      ) : trip && timing ? (
        <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 48, gap: spacing.md }}>
          <LinearGradient
            colors={LIVE_NAVY_FIELD}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ borderRadius: radii.xl, padding: spacing.xl }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(242,118,27,0.16)",
                  shadowColor: LIVE_ORANGE,
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                }}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.95)", LIVE_ORANGE]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.85)",
                  }}
                >
                  <ThemedText style={{ fontSize: 19, lineHeight: 23 }} translate={false}>
                    {vehicleGlyph(trip.vehicle)}
                  </ThemedText>
                </LinearGradient>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText
                  variant="overline"
                  translate={false}
                  style={{ color: "#A9BAD2", letterSpacing: 1.1 }}
                >
                  NEXT DEPARTURE
                </ThemedText>
                <ThemedText variant="title3" style={{ color: "#FFFFFF", marginTop: 3 }}>
                  {formatRoute(trip)}
                </ThemedText>
                <ThemedText variant="caption" translate={false} style={{ color: "#C7D3E6", marginTop: 3 }}>
                  {departureStamp} · {formatVehicle(trip.vehicle)}
                </ThemedText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <ThemedText variant="title2" translate={false} style={{ color: "#FFFFFF" }}>
                  {timing.countdown}
                </ThemedText>
                <ThemedText variant="footnote" translate={false} style={{ color: "#A9BAD2", marginTop: 2 }}>
                  until departure
                </ThemedText>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: spacing.md }} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <LiveStatusPill label={status.label} tone={status.tone} />
              {capacity > 0 ? (
                <>
                  <LiveCapacityBar available={available} capacity={capacity} style={{ flex: 1 }} />
                  <ThemedText variant="footnote" translate={false} style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    {available} / {capacity}
                  </ThemedText>
                </>
              ) : (
                <ThemedText variant="footnote" translate={false} style={{ color: "#C7D3E6", flex: 1 }}>
                  {formatVehicle(trip.vehicle)}
                </ThemedText>
              )}
            </View>

            {/* Journey figures, sourced from this departure's route. */}
            <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.md }}>
              <View style={{ flex: 1, gap: 1 }}>
                <ThemedText variant="overline" translate={false} style={{ color: "#8FA5C4", letterSpacing: 0.8 }}>
                  {distanceLabel.toUpperCase()}
                </ThemedText>
                <ThemedText variant="headline" translate={false} style={{ color: "#FFFFFF" }}>
                  {distanceText ?? "—"}
                </ThemedText>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <ThemedText variant="overline" translate={false} style={{ color: "#8FA5C4", letterSpacing: 0.8 }}>
                  {durationLabel.toUpperCase()}
                </ThemedText>
                <ThemedText variant="headline" translate={false} style={{ color: "#FFFFFF" }}>
                  {durationText ?? "—"}
                </ThemedText>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <ThemedText variant="overline" translate={false} style={{ color: "#8FA5C4", letterSpacing: 0.8 }}>
                  SPEED
                </ThemedText>
                <ThemedText variant="headline" translate={false} style={{ color: "#FFFFFF" }}>
                  {`${routeMetrics.speedKmh} km/h`}
                </ThemedText>
              </View>
            </View>
          </LinearGradient>

          <View style={{ gap: spacing.sm }}>
            {islandRow(din.toUpperCase())}
            <View style={{ backgroundColor: ISLAND_BOARD, borderRadius: 26, padding: spacing.lg, gap: spacing.lg }}>
              <View style={{ gap: 10 }}>
                {islandRow("COMPACT")}
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
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: LIVE_ORANGE }} />
                    <AppIcon name="bus" size={17} color={LIVE_ORANGE} />
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
                    <ThemedText
                      variant="footnote"
                      translate={false}
                      style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}
                    >
                      {timeStamp}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                {islandRow("MINIMAL")}
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
                  <AppIcon name="bus" size={15} color={LIVE_ORANGE} />
                  <ThemedText
                    variant="footnote"
                    translate={false}
                    style={{ color: "#FFFFFF", fontWeight: "700" }}
                  >
                    {timing.compact}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            {islandRow(`EXPANDED · ${timing.departingSoon ? "DEPARTING SOON" : "SCHEDULED"}`)}
            <View
              style={{
                backgroundColor: ISLAND_BLACK,
                borderRadius: 28,
                padding: 15,
                borderWidth: timing.departingSoon ? 1 : 0,
                borderColor: "rgba(242,118,27,0.45)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
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
                  <AppIcon name="bus" size={18} color={LIVE_ORANGE} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="footnote" translate={false} style={{ color: "#9AA6B8", fontSize: 10 }}>
                    {timing.departingSoon ? "Departs in" : "Next departure"}
                  </ThemedText>
                  <ThemedText
                    variant="headline"
                    translate={false}
                    style={{ color: "#FFFFFF", marginTop: 3, fontSize: 13 }}
                  >
                    {formatRoute(trip)}
                  </ThemedText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <ThemedText variant="footnote" translate={false} style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    {timing.departingSoon ? `${timing.minutes} min · ${timeStamp}` : departureStamp}
                  </ThemedText>
                  <ThemedText variant="footnote" translate={false} style={{ color: "#9AA6B8", marginTop: 3 }}>
                    {timing.departingSoon ? "now boarding" : `in ${Math.max(timing.days, 0)} days`}
                  </ThemedText>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: "#1E2129", marginVertical: 11 }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <AppIcon name="location" size={13} color="#6A85B4" />
                <ThemedText variant="footnote" translate={false} style={{ color: "#AEB9C9" }}>
                  {trip.origin} → {trip.destination}
                </ThemedText>
                <ThemedText
                  variant="footnote"
                  translate={false}
                  style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: "auto" }}
                >
                  {formatVehicle(trip.vehicle)}
                </ThemedText>
                <LiveStatusPill label={status.label} tone={status.tone} />
              </View>

              {capacity > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <ThemedText
                    variant="overline"
                    translate={false}
                    style={{ color: "#9AA6B8", letterSpacing: 1.1 }}
                  >
                    CARGO
                  </ThemedText>
                  <LiveCapacityBar available={available} capacity={capacity} style={{ flex: 1 }} />
                  <ThemedText variant="footnote" translate={false} style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    {available} / {capacity}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            {islandRow(lock.toUpperCase())}
            <LinearGradient
              colors={["#587089", "#233851"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: radii.lg, padding: spacing.lg }}
            >
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
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
                    <AppIcon name="bus" size={19} color={LIVE_ORANGE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      variant="overline"
                      translate={false}
                      style={{ color: "#8A97AC", letterSpacing: 1.1 }}
                    >
                      NEXT DEPARTURE
                    </ThemedText>
                    <ThemedText
                      variant="headline"
                      translate={false}
                      style={{ color: "#132B55", marginTop: 3, fontSize: 14 }}
                    >
                      {departureStamp}
                    </ThemedText>
                    <ThemedText variant="footnote" translate={false} style={{ color: "#55627A", marginTop: 2 }}>
                      {trip.route.directionLabel}
                    </ThemedText>
                    {distanceText || durationText ? (
                      <ThemedText variant="footnote" translate={false} style={{ color: "#55627A", marginTop: 1, fontWeight: "600" }}>
                        {[distanceText, durationText].filter(Boolean).join(" · ")}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: 3.5,
                      borderColor: "#FFE7D4",
                      borderTopColor: LIVE_ORANGE,
                      borderRightColor: LIVE_ORANGE,
                      transform: [{ rotate: "-30deg" }],
                    }}
                  />
                </View>

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
                  <AppIcon name="location" size={13} color="#132B55" />
                  <ThemedText variant="footnote" translate={false} style={{ color: "#55627A" }}>
                    {trip.origin} → {trip.destination}
                  </ThemedText>
                  <ThemedText
                    variant="footnote"
                    translate={false}
                    style={{ color: "#132B55", fontWeight: "600", marginLeft: "auto" }}
                  >
                    {formatVehicle(trip.vehicle)}
                  </ThemedText>
                </View>

                {capacity > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 99,
                        backgroundColor: "#E7F5EE",
                        borderWidth: 1,
                        borderColor: "#BFE5D1",
                      }}
                    >
                      <ThemedText
                        variant="footnote"
                        translate={false}
                        style={{ color: "#17865B", fontWeight: "700", fontSize: 10 }}
                      >
                        {status.label.toUpperCase()}
                      </ThemedText>
                    </View>
                    <LiveCapacityBar available={available} capacity={capacity} track="#E4E9F0" style={{ flex: 1, height: 4 }} />
                    <ThemedText
                      variant="footnote"
                      translate={false}
                      style={{ color: "#132B55", fontWeight: "700" }}
                    >
                      {available} / {capacity}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </LinearGradient>
          </View>

          <Surface style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <AppIcon
                name={activitiesEnabled ? "checkmark-circle" : "information-circle"}
                size={20}
                color={activitiesEnabled ? "#17865B" : theme.accent}
              />
              <ThemedText variant="headline" style={{ flex: 1 }}>
                {activitiesEnabled ? liveEn : Platform.OS === "ios" ? availIos : iosFeature}
              </ThemedText>
            </View>
            <ThemedText variant="bodySm" tone="secondary">
              {nextScheduled}
            </ThemedText>
            {Platform.OS === "ios" && activitiesEnabled === false ? (
              <PrimaryButton label={enableSettings} variant="secondary" onPress={() => Linking.openSettings()} />
            ) : null}
            {Platform.OS !== "ios" ? (
              <ThemedText variant="caption" tone="tertiary">
                {availApp}
              </ThemedText>
            ) : null}
          </Surface>

          <PrimaryButton
            label={viewDep}
            icon="arrow-forward"
            onPress={() => router.push(`/(home)/trips/${trip.id}`)}
          />
        </ScrollView>
      ) : (
        <TripMissing loading={false} error={error} onRetry={refresh} />
      )}
    </SafeAreaView>
  );
}
