import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import TripCard from "@/app/components/trips/TripCard";
import EmptyState from "@/app/components/ui/EmptyState";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { shadows } from "@/app/theme/spacing";
import { fetchAllTrips, getTripsForMonth } from "@/app/services/tripService";
import { currentDateLocale, zonedDateKey, zonedParts } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import type { Trip } from "@/app/lib/tripTypes";

/**
 * The grid is rendered as explicit weeks rather than wrapping a flat list.
 *
 * Seven cells at `100 / 7` percent each add up to slightly more than 100%, so
 * a wrapping row only ever fits six of them — which silently shifted every
 * date one weekday to the left. One row per week, seven flexible cells, cannot
 * drift.
 */
function chunkIntoWeeks(cells: (number | null)[]): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

/**
 * The departure calendar.
 *
 * Days that actually have a scheduled departure carry a dot; selecting a day
 * lists that day's departures. Nothing is pre-filled, so an empty month looks
 * empty rather than suggesting availability.
 *
 * Day boundaries are evaluated in the **origin's** timezone, so a late evening
 * departure never shows up on the neighbouring day.
 */
export default function TripCalendarScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const { language } = useLanguage();
  const locale = currentDateLocale(language);
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
        new Date(Date.UTC(2024, 0, index + 1)),
      ),
    ),
    [locale],
  );
  const router = useRouter();
  const departuresAvailableLabel = useTranslationText("departures available", language);
  const backLabel = useTranslationText("Back", language);
  const previousMonthLabel = useTranslationText("Previous month", language);
  const nextMonthLabel = useTranslationText("Next month", language);
  const infoLabel = useTranslationText(
    "Select a date to see the departures scheduled for that day. Dates with an orange marker have a scheduled departure.",
    language,
  );

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [monthTrips, setMonthTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);

  const load = useCallback(async () => {
    const [trips, inMonth] = await Promise.all([
      fetchAllTrips(),
      getTripsForMonth(year, month),
    ]);
    setAllTrips(trips);
    setMonthTrips(inMonth);
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  /** Days in this month that have at least one departure. */
  const departureDays = useMemo(() => {
    const set = new Set<string>();
    for (const trip of monthTrips) {
      set.add(zonedDateKey(trip.departureDate, trip.route.timezone as any));
    }
    return set;
  }, [monthTrips]);

  /** Monday-first grid, padded so the month starts under its weekday. */
  const weeks = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const offset = (first.getUTCDay() + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    return chunkIntoWeeks(cells);
  }, [year, month]);

  const selectedTrips = useMemo(() => {
    if (!selectedKey) return [];
    return allTrips
      .filter(
        (trip) =>
          zonedDateKey(trip.departureDate, trip.route.timezone as any) ===
          selectedKey,
      )
      .sort((a, b) => a.departureDate.getTime() - b.departureDate.getTime());
  }, [allTrips, selectedKey]);

  const departureNoun = useTranslationText(
    selectedTrips.length === 1 ? "departure" : "departures",
    language,
  );

  const selectedLabel = useMemo(() => {
    if (!selectedKey) return null;
    const [y, m, d] = selectedKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(date);
  }, [selectedKey, locale]);

  const shiftMonth = (delta: number) => {
    let nextMonth = month + delta;
    let nextYear = year;
    while (nextMonth < 1) {
      nextMonth += 12;
      nextYear -= 1;
    }
    while (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
    setSelectedKey(null);
  };

  const todayKey = useMemo(() => {
    const parts = zonedParts(now, "Europe/Stockholm");
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
      parts.day,
    ).padStart(2, "0")}`;
  }, [now]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <View className="flex-row items-center gap-1 px-4 pb-1 pt-2">
        <PressableScale
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/trips")
          }
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          haptic="light"
          pressedScale={0.9}
          style={{ marginLeft: -4 }}
        >
          <View className="h-10 w-10 items-center justify-center">
            <AppIcon name="chevron-back" size={24} color={theme.textPrimary} />
          </View>
        </PressableScale>
        <ThemedText
          variant="title2"
          numberOfLines={1}
          style={{ letterSpacing: -0.4, flex: 1 }}
        >
          Select Date
        </ThemedText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Month ──────────────────────────────────────────────── */}
        <View
          className="mx-5 mt-3 rounded-[20px] border p-4"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.borderSubtle,
            ...shadows.md,
          }}
        >
          <View className="flex-row items-center justify-between px-1">
            <PressableScale
              onPress={() => shiftMonth(-1)}
              accessibilityRole="button"
              accessibilityLabel={previousMonthLabel}
              haptic="selection"
              pressedScale={0.9}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full">
                <AppIcon
                  name="chevron-back"
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
            </PressableScale>

            <ThemedText
              variant="headline"
              translate={false}
              style={{ letterSpacing: -0.2 }}
            >
              {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)))}
            </ThemedText>

            <PressableScale
              onPress={() => shiftMonth(1)}
              accessibilityRole="button"
              accessibilityLabel={nextMonthLabel}
              haptic="selection"
              pressedScale={0.9}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full">
                <AppIcon
                  name="chevron-forward"
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
            </PressableScale>
          </View>

          <View className="mt-3 flex-row">
            {weekdays.map((day) => (
              <View key={day} className="flex-1 items-center">
                <ThemedText
                  variant="overline"
                  tone="tertiary"
                  translate={false}
                  style={{ letterSpacing: 0.6, fontSize: 10 }}
                >
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          <View className="mt-1.5">
            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={{ flexDirection: "row" }}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <View
                        key={`pad-${weekIndex}-${dayIndex}`}
                        style={{ flex: 1, height: 44 }}
                      />
                    );
                  }

              const key = `${year}-${String(month).padStart(2, "0")}-${String(
                day,
              ).padStart(2, "0")}`;
              const hasDeparture = departureDays.has(key);
              const isSelected = selectedKey === key;
              const isToday = key === todayKey;

              return (
                <PressableScale
                  key={key}
                  onPress={() => setSelectedKey(isSelected ? null : key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${day} ${new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)))}${
                    hasDeparture ? `, ${departuresAvailableLabel}` : ""
                  }`}
                  haptic="selection"
                  pressedScale={0.9}
                  style={{ flex: 1, height: 44 }}
                >
                  <View className="flex-1 items-center justify-center">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={
                        isSelected
                          ? { backgroundColor: theme.accent, ...shadows.sm }
                          : isToday
                            ? {
                                borderWidth: 1.5,
                                borderColor: theme.accentBorder,
                              }
                            : undefined
                      }
                    >
                      <ThemedText
                        variant="caption"
                        translate={false}
                        style={{
                          fontSize: 13.5,
                          lineHeight: 18,
                          color: isSelected ? "#FFFFFF" : theme.textPrimary,
                          fontWeight: hasDeparture ? "700" : "400",
                        }}
                      >
                        {day}
                      </ThemedText>
                    </View>

                    <View
                      className="mt-[3px] h-[3px] w-[3px] rounded-full"
                      style={{
                        backgroundColor: hasDeparture
                          ? isSelected
                            ? "transparent"
                            : theme.accent
                          : "transparent",
                      }}
                    />
                  </View>
                </PressableScale>
                );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* ── Departures on the selected day ─────────────────────── */}
        {selectedKey ? (
          <Animated.View entering={FadeIn.duration(220)} style={{ marginTop: 20 }}>
            <View className="flex-row items-baseline justify-between px-5">
              <ThemedText
                variant="headline"
                translate={false}
                numberOfLines={1}
                style={{ letterSpacing: -0.2, flex: 1 }}
              >
                {selectedLabel}
              </ThemedText>
              <ThemedText
                variant="footnote"
                tone="tertiary"
                translate={false}
                style={{ marginLeft: 8 }}
              >
                {`${selectedTrips.length} ${departureNoun}`}
              </ThemedText>
            </View>

            <View className="mt-2.5 gap-3 px-5">
              {selectedTrips.length > 0 ? (
                selectedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onPress={() => router.push(`/(home)/trips/${trip.id}`)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="calendar-outline"
                  title="No departures"
                  description="Nothing departs on this date."
                />
              )}
            </View>
          </Animated.View>
        ) : (
          <View
            className="mx-5 mt-5 flex-row items-start gap-3 rounded-[16px] p-4"
            style={{ backgroundColor: theme.surfaceAlt }}
          >
            <AppIcon
              name="information-circle-outline"
              size={18}
              color={theme.primary}
            />
            <ThemedText variant="caption" tone="secondary" style={{ flex: 1 }}>
              {infoLabel}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
