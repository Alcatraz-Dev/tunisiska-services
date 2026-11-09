import polyline from "@mapbox/polyline";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { Ionicons } from "@expo/vector-icons";

import AppIcon from "@/app/components/ui/AppIcon";
import IconButton from "@/app/components/ui/IconButton";
import PressableScale from "@/app/components/ui/PressableScale";
import ThemedText from "@/app/components/ui/ThemedText";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { getTrips } from "@/app/services/tripService";
import {
  formatDistanceKm,
  formatDuration,
  getRouteMetrics,
  interpolatePath,
  type LatLng,
} from "@/app/lib/routeMetrics";
import {
  currentDateLocale,
  formatRelativeTime,
  zonedDateLabel,
  zonedTime,
} from "@/app/lib/time";
import type { Trip } from "@/app/lib/tripTypes";

/**
 * A marker built as a small 3D object rather than a flat pin: a gradient
 * sphere, a contact shadow and a stem. The glyph sits on top, so the departure
 * point, the destination and the vehicle are readable at a glance.
 */
function MapPin({
  glyph,
  tint,
  accessibilityLabel,
}: {
  glyph: string;
  tint: string;
  accessibilityLabel: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ alignItems: "center" }}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${tint}22`,
          shadowColor: tint,
          shadowOpacity: 0.45,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.95)", tint]}
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
            {glyph}
          </ThemedText>
        </LinearGradient>
      </View>

      {/* Stem and ground shadow give the sphere its height. */}
      <View
        style={{
          width: 4,
          height: 9,
          marginTop: -3,
          borderRadius: 2,
          backgroundColor: tint,
        }}
      />
      <View
        style={{
          width: 14,
          height: 5,
          marginTop: 1,
          borderRadius: 3,
          backgroundColor: "rgba(0,0,0,0.22)",
        }}
      />
    </View>
  );
}

function StatBlock({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <AppIcon name={icon} size={13} color={accent} />
        <ThemedText variant="footnote" tone="tertiary">
          {label}
        </ThemedText>
      </View>
      <ThemedText variant="headline" translate={false} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * The departure map.
 *
 * Every marker and every line on this screen belongs to a real scheduled
 * departure from the schedule. Nothing is simulated: if the schedule is empty
 * the screen says so instead of drawing a placeholder route.
 *
 * The line follows the road/sea route when Directions is available and falls
 * back to the direct path between the two cities otherwise, while distance and
 * duration are derived from the trip's own route and vehicle.
 */
export default function MapOverviewScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const theme = useThemeColors();
  const router = useRouter();
  const { language } = useLanguage();
  const locale = currentDateLocale(language);

  const backLabel = useTranslationText("Back", language);
  const departuresLabel = useTranslationText("Upcoming departures", language);
  const distanceLabel = useTranslationText("Distance", language);
  const durationLabel = useTranslationText("Duration", language);
  const departureLabel = useTranslationText("Departure", language);
  const pickupLabel = useTranslationText("Collection", language);
  const deliveryLabel = useTranslationText("Delivery", language);

  const mapRef = useRef<MapView>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roadPath, setRoadPath] = useState<LatLng[] | null>(null);

  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const loadTrips = useCallback(async () => {
    try {
      const upcoming = await getTrips("upcoming");
      setTrips(upcoming);
      setSelectedId((current) =>
        current && upcoming.some((trip) => trip.id === current)
          ? current
          : (upcoming[0]?.id ?? null),
      );
    } catch (error) {
      console.error("Error loading departures for the map:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedId) ?? null,
    [trips, selectedId],
  );

  const metrics = useMemo(
    () => getRouteMetrics(selectedTrip?.routeValue, selectedTrip?.vehicle),
    [selectedTrip?.routeValue, selectedTrip?.vehicle],
  );

  // Try the real road/sea geometry, fall back to the direct path.
  useEffect(() => {
    let active = true;
    setRoadPath(null);

    if (!metrics.from || !metrics.to) return;

    // The Directions API sends no `Access-Control-Allow-Origin` header, so a
    // browser request fails CORS and logs an error before the fallback runs.
    // Web therefore starts from the direct path; native still asks for the
    // real road/sea geometry.
    if (!googleKey || Platform.OS === "web") {
      setRoadPath(interpolatePath(metrics.from, metrics.to));
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${metrics.from!.latitude},${metrics.from!.longitude}&destination=${metrics.to!.latitude},${metrics.to!.longitude}&mode=driving&key=${googleKey}`,
        );
        const json = await res.json();
        const points = json?.routes?.[0]?.overview_polyline?.points;
        if (active && points) {
          const decoded = polyline.decode(points) as [number, number][];
          setRoadPath(
            decoded.map(([latitude, longitude]) => ({ latitude, longitude })),
          );
          return;
        }
      } catch (error) {
        console.error("Error fetching route geometry:", error);
      }
      if (active) setRoadPath(interpolatePath(metrics.from!, metrics.to!));
    })();

    return () => {
      active = false;
    };
  }, [metrics.from, metrics.to, googleKey]);

  const path = roadPath ?? [];

  useEffect(() => {
    if (path.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(path, {
        edgePadding: { top: 160, right: 60, bottom: 260, left: 60 },
        animated: true,
      });
    }
  }, [path]);

  const distance = formatDistanceKm(metrics.distanceKm, locale);
  const duration = formatDuration(metrics.durationHours);

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <MapView
        ref={mapRef}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1 }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType="standard"
        customMapStyle={isDark ? DARK_MAP_STYLE : []}
      >
        {path.length > 1 ? (
          <Polyline
            coordinates={path}
            strokeColor={isDark ? "#F2761B" : "#E0620C"}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
            geodesic
          />
        ) : null}

        {metrics.from ? (
          <Marker
            coordinate={metrics.from}
            anchor={{ x: 0.5, y: 1 }}
          >
            <MapPin
              glyph="📦"
              tint="#22C55E"
              accessibilityLabel={`${pickupLabel}: ${selectedTrip?.route.origin ?? ""}`}
            />
          </Marker>
        ) : null}

        {metrics.to ? (
          <Marker
            coordinate={metrics.to}
            anchor={{ x: 0.5, y: 1 }}
          >
            <MapPin
              glyph="🎯"
              tint={theme.accent}
              accessibilityLabel={`${deliveryLabel}: ${selectedTrip?.route.destination ?? ""}`}
            />
          </Marker>
        ) : null}
      </MapView>

      {/* Back affordance */}
      <SafeAreaView
        edges={["top", "left"]}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}
        pointerEvents="box-none"
      >
        <View
          style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm }}
          pointerEvents="box-none"
        >
          <View
            style={{
              borderRadius: radii.pill,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
              ...shadows.md,
            }}
          >
            <IconButton
              icon="chevron-back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
              accessibilityLabel={backLabel || "Back"}
              surface={false}
            />
          </View>
        </View>
      </SafeAreaView>

      {/* Departure picker + metrics */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: spacing.xxl,
        }}
      >
        {loading ? (
          <View
            style={{
              marginHorizontal: spacing.gutter,
              padding: spacing.lg,
              borderRadius: radii.lg,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
              alignItems: "center",
              gap: spacing.sm,
              ...shadows.md,
            }}
          >
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText variant="footnote" tone="tertiary">
              Loading departures...
            </ThemedText>
          </View>
        ) : !selectedTrip ? (
          <View
            style={{
              marginHorizontal: spacing.gutter,
              padding: spacing.lg,
              borderRadius: radii.lg,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              ...shadows.md,
            }}
          >
            <AppIcon name="calendar-outline" size={20} color={theme.textTertiary} />
            <ThemedText variant="bodySm" tone="secondary" style={{ flex: 1 }}>
              No upcoming departures to map.
            </ThemedText>
          </View>
        ) : (
          <>
            {trips.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                accessibilityLabel={departuresLabel}
                contentContainerStyle={{
                  paddingHorizontal: spacing.gutter,
                  gap: spacing.sm,
                  paddingBottom: spacing.sm,
                }}
              >
                {trips.map((trip) => {
                  const active = trip.id === selectedTrip.id;
                  return (
                    <PressableScale
                      key={trip.id}
                      onPress={() => setSelectedId(trip.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${trip.route.label}, ${zonedDateLabel(
                        trip.departureDate,
                        trip.route.timezone as "Europe/Stockholm" | "Africa/Tunis",
                        locale,
                      )}`}
                      haptic="selection"
                      pressedScale={0.96}
                      style={{
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.sm,
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: active ? theme.accent : theme.borderSubtle,
                        backgroundColor: active ? theme.accentSoft : theme.surface,
                        ...shadows.sm,
                      }}
                    >
                      <ThemedText
                        variant="caption"
                        style={{
                          color: active ? theme.accent : theme.textSecondary,
                          fontWeight: "600",
                        }}
                      >
                        {zonedDateLabel(
                          trip.departureDate,
                          trip.route.timezone as "Europe/Stockholm" | "Africa/Tunis",
                          locale,
                        )}
                      </ThemedText>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            ) : null}

            <Animated.View
              key={selectedTrip.id}
              entering={FadeInDown.duration(260)}
              style={{
                marginHorizontal: spacing.gutter,
                padding: spacing.lg,
                borderRadius: radii.lg,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.borderSubtle,
                gap: spacing.md,
                ...shadows.md,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <LinearGradient
                  colors={[theme.accent, "#C2410C"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText style={{ fontSize: 20 }} translate={false}>
                    🚚
                  </ThemedText>
                </LinearGradient>

                <View style={{ flex: 1 }}>
                  <ThemedText variant="headline" translate={false} numberOfLines={1}>
                    {selectedTrip.route.label}
                  </ThemedText>
                  <ThemedText variant="footnote" tone="tertiary" translate={false}>
                    {`${zonedDateLabel(
                      selectedTrip.departureDate,
                      selectedTrip.route.timezone as "Europe/Stockholm" | "Africa/Tunis",
                      locale,
                    )} · ${zonedTime(
                      selectedTrip.departureDate,
                      selectedTrip.route.timezone as "Europe/Stockholm" | "Africa/Tunis",
                    )} · ${formatRelativeTime(
                      selectedTrip.departureDate,
                      new Date(),
                      locale,
                    )}`}
                  </ThemedText>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <StatBlock
                  label={distanceLabel}
                  value={distance ?? "—"}
                  icon="navigate-outline"
                  accent={theme.accent}
                />
                <StatBlock
                  label={durationLabel}
                  value={duration ?? "—"}
                  icon="time-outline"
                  accent={theme.primary}
                />
                <StatBlock
                  label={departureLabel}
                  value={zonedTime(
                    selectedTrip.departureDate,
                    selectedTrip.route.timezone as "Europe/Stockholm" | "Africa/Tunis",
                  )}
                  icon="airplane-outline"
                  accent={theme.textTertiary}
                />
              </View>

              <Animated.View entering={FadeIn.duration(220)}>
                <ThemedText variant="footnote" tone="tertiary" translate={false}>
                  {`${selectedTrip.route.origin} → ${selectedTrip.route.destination} · ${metrics.speedKmh} km/h`}
                </ThemedText>
              </Animated.View>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];
