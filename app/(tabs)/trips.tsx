import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import EmptyState from "@/app/components/ui/EmptyState";
import Skeleton from "@/app/components/ui/Skeleton";
import {
  DirectionTraveller,
  RouteTimeline,
} from "@/app/components/trips/RouteTimeline";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { useTrips } from "@/app/hooks/useAppData";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import type { TripScope } from "@/app/lib/tripTypes";
import type { CountryCode } from "@/app/lib/routes";
import { radii, spacing } from "@/app/theme/spacing";

type DirectionKey = "se_to_tn" | "tn_to_se";

const DIRECTIONS: {
  key: DirectionKey;
  country: CountryCode;
  label: string;
  target: string;
  targetCountry: CountryCode;
}[] = [
  { key: "se_to_tn", country: "SE", label: "Sweden", target: "Tunisia", targetCountry: "TN" },
  { key: "tn_to_se", country: "TN", label: "Tunisia", target: "Sweden", targetCountry: "SE" },
];

function departureCount(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function TripsScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ direction?: string; scope?: string }>();
  const { language } = useLanguage();
  const departureSingular = useTranslationText("departure", language);
  const departurePlural = useTranslationText("departures", language);

  const [scope, setScope] = useState<TripScope>(
    params.scope === "past" || params.scope === "all" ? params.scope : "upcoming",
  );

  const [direction, setDirection] = useState<DirectionKey>(
    params.direction === "tn_to_se" ? "tn_to_se" : "se_to_tn",
  );

  const { data: trips, loading, refresh } = useTrips(scope);

  const directionTrips = useMemo(
    () => trips.filter((trip) => trip.route.direction === direction),
    [trips, direction],
  );

  const activeDirection = DIRECTIONS.find((d) => d.key === direction)!;

  const onPressTrip = useCallback(
    (trip: any) => {
      router.push(`/(home)/trips/${trip.id}`);
    },
    [router],
  );

  const onSwap = useCallback(() => {
    setDirection((current) => (current === "se_to_tn" ? "tn_to_se" : "se_to_tn"));
  }, []);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const emptyMessage = useMemo(() => {
    if (scope === "past") return "Inga tidigare avgångar att visa ännu.";
    if (scope === "all") return "Inga avgångar har schemalagts ännu.";
    return "Inga kommande avgångar är schemalagda just nu.";
  }, [scope]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: spacing.xs, justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title1">Trips</ThemedText>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PressableScale
            onPress={() => router.push("/(home)/trips/departure-board")}
            accessibilityRole="button"
            accessibilityLabel="Open departure board"
            style={{ width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}
            haptic="light"
          >
            <AppIcon name="list-outline" size={19} color={theme.primary} />
          </PressableScale>
          <PressableScale
            onPress={() => router.push("/(home)/trips/calendar")}
            accessibilityRole="button"
            accessibilityLabel="Open trip calendar"
            style={{ width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}
            haptic="light"
          >
            <AppIcon name="calendar-outline" size={19} color={theme.primary} />
          </PressableScale>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.gutter, marginTop: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: 4, borderRadius: radii.pill, backgroundColor: theme.surfaceAlt }}>
            <PressableScale onPress={() => setScope("upcoming")} haptic="selection">
              <View style={{ minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radii.pill, justifyContent: "center", backgroundColor: scope === "upcoming" ? theme.primary : "transparent" }}>
                <ThemedText variant="caption" style={{ fontWeight: scope === "upcoming" ? "700" : "500", color: scope === "upcoming" ? theme.textInverse : theme.textSecondary }}>Upcoming</ThemedText>
              </View>
            </PressableScale>
            <PressableScale onPress={() => setScope("past")} haptic="selection">
              <View style={{ minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radii.pill, justifyContent: "center", backgroundColor: scope === "past" ? theme.primary : "transparent" }}>
                <ThemedText variant="caption" style={{ fontWeight: scope === "past" ? "700" : "500", color: scope === "past" ? theme.textInverse : theme.textSecondary }}>Past</ThemedText>
              </View>
            </PressableScale>
            <PressableScale onPress={() => setScope("all")} haptic="selection">
              <View style={{ minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radii.pill, justifyContent: "center", backgroundColor: scope === "all" ? theme.primary : "transparent" }}>
                <ThemedText variant="caption" style={{ fontWeight: scope === "all" ? "700" : "500", color: scope === "all" ? theme.textInverse : theme.textSecondary }}>All</ThemedText>
              </View>
            </PressableScale>
          </View>
          <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
            {departureCount(
              directionTrips.length,
              departureSingular,
              departurePlural,
            )}
          </ThemedText>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.gutter, marginTop: spacing.md }}>
        <DirectionTraveller
          originCountry={activeDirection.country}
          originLabel={activeDirection.label}
          destinationCountry={activeDirection.targetCountry}
          destinationLabel={activeDirection.target}
          onSwap={onSwap}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={theme.textTertiary}
          />
        }
      >
        <View style={{ paddingHorizontal: spacing.gutter }}>
          {loading && directionTrips.length === 0 ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} height={104} radius={radii.lg} />
              ))}
            </View>
          ) : directionTrips.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={emptyMessage}
              description="Use the calendar to see every scheduled departure."
            />
          ) : (
            <RouteTimeline
              trips={directionTrips}
              featured={scope === "upcoming"}
              onPressTrip={onPressTrip}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
