/**
 * Trips — Route diagram (the timeline presentation).
 *
 * The latest reference ("Trips — Route diagram v2") lays a direction's
 * departures out along a vertical timeline: a direction traveller at the top,
 * a month-labelled spine, and each departure as a card carrying its capacity
 * as a ring. The soonest upcoming departure becomes the dark, illustrated
 * "loaded bay" featured card — the stowage-manifest hold sits inside it.
 *
 * These pieces are presentation only. Every figure (capacity, spaces left,
 * route, time) comes from the normalised `Trip` and the shared formatters, so
 * the timeline never invents data.
 */
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import CountryFlag from "@/app/components/ui/CountryFlag";
import TransportArt from "@/app/components/ui/TransportArt";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { useMotion } from "@/app/hooks/useMotion";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import {
  formatDistanceKm,
  formatDuration,
  getRouteMetrics,
} from "@/app/lib/routeMetrics";
import { navy, neutral, orange, semantic } from "@/app/theme/colors";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { sceneForTrip } from "@/app/lib/tripImagery";
import {
  formatDepartureDate,
  formatDepartureTime,
  formatRoute,
  formatVehicle,
  formatStatus,
} from "@/app/lib/tripFormat";
import { currentDateLocale } from "@/app/lib/time";
import type { Trip } from "@/app/lib/tripTypes";
import type { CountryCode } from "@/app/lib/routes";

function zoneOf(trip: Trip) {
  return trip.route.timezone as "Europe/Stockholm" | "Africa/Tunis";
}

/** `Mon` */
function weekdayShort(trip: Trip): string {
  return new Intl.DateTimeFormat(currentDateLocale(), {
    weekday: "short",
    timeZone: zoneOf(trip),
  }).format(trip.departureDate);
}

/** `November` */
function monthFull(trip: Trip): string {
  return new Intl.DateTimeFormat(currentDateLocale(), {
    month: "long",
    timeZone: zoneOf(trip),
  }).format(trip.departureDate);
}

/** `6` — the day of the month in the origin's zone. */
function dayNumber(trip: Trip): string {
  return new Intl.DateTimeFormat(currentDateLocale(), {
    day: "numeric",
    timeZone: zoneOf(trip),
  }).format(trip.departureDate);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A small circular capacity gauge.
 *
 * The arc sweeps to its value on mount so the gauge agrees with the animated
 * capacity card in the same list; the sweep is skipped when motion is reduced.
 */
export function CapacityRing({
  progress,
  size = 26,
  stroke = 3,
  color,
  track,
  delay = 80,
}: {
  progress: number; // 0..1 of spaces still free
  size?: number;
  stroke?: number;
  color: string;
  track: string;
  delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const { d, standard } = useMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = 0;
    sweep.value = withDelay(
      delay,
      withTiming(clamped, { duration: d(820), easing: Easing.out(Easing.cubic) }),
    );
  }, [clamped, delay, sweep, d, standard]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - sweep.value),
  }));

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: [{ rotate: "-90deg" }] }}
    >
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        animatedProps={arcProps}
      />
    </Svg>
  );
}

/**
 * The origin → destination switcher.
 *
 * Two country chips joined by a dashed route path. Tapping the row swaps the
 * direction; the active origin chip lifts to a white surface so the journey's
 * direction is obvious at a glance.
 */
export function DirectionTraveller({
  originCountry,
  originLabel,
  destinationCountry,
  destinationLabel,
  onSwap,
}: {
  originCountry: CountryCode;
  originLabel: string;
  destinationCountry: CountryCode;
  destinationLabel: string;
  onSwap: () => void;
}) {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();

  return (
    <PressableScale
      onPress={onSwap}
      accessibilityRole="button"
      accessibilityLabel={`Switch direction, ${originLabel} to ${destinationLabel}`}
      haptic="selection"
      pressedScale={0.99}
      style={{ width: "100%" }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: theme.primarySoft,
          borderWidth: 1,
          borderColor: theme.primaryBorder,
          borderRadius: radii.md,
          padding: 3,
        }}
      >
        {/* Origin — the active, lifted chip. */}
        <View
          style={[
            styles.travellerChip,
            { backgroundColor: theme.surface, ...shadows.sm },
          ]}
        >
          <CountryFlag country={originCountry} size={19} radius={2} />
          <ThemedText
            variant="caption"
            style={{ color: theme.primary, fontWeight: "700", fontSize: 12 }}
          >
            {originLabel}
          </ThemedText>
        </View>

        {/* Dashed route path with a delivery van. */}
        <View style={{ width: 58, height: 22, position: "relative", alignItems: "center", justifyContent: "center", marginLeft: 24 }}>
          <Svg
            height={14}
            width="100%"
            viewBox="0 0 58 14"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 0 }}
          >
            <Path
              d="M4 10 C 20 2, 38 2, 54 10"
              stroke={theme.accent}
              strokeWidth={1.8}
              strokeDasharray="5 4"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
          <View style={{ position: "absolute", top: -2, left: "55%" }}>
            <MaterialCommunityIcons name="van-utility" size={15} color={resolvedTheme === "dark" ? "#FFFFFF" : "#132B55"} />
          </View>
        </View>

        {/* Destination — the quiet chip. */}
        <View style={styles.travellerChip}>
          <ThemedText
            variant="caption"
            style={{ color: theme.textSecondary, fontWeight: "500", fontSize: 12 }}
          >
            {destinationLabel}
          </ThemedText>
          <CountryFlag
            country={destinationCountry}
            size={19}
            radius={2}
            style={{ opacity: 0.7 }}
          />
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * A slim hold meter.
 *
 * Replaces the drawn cargo bay on the featured card: one glance answers
 * "how much room is left" without a wall of slots, and the gradient gives the
 * fill depth instead of a flat bar.
 */
function HoldMeter({
  ratio,
  style,
}: {
  ratio: number;
  style?: React.ComponentProps<typeof View>["style"];
}) {
  const clamped = Math.max(0, Math.min(1, ratio));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        {
          height: 8,
          borderRadius: radii.pill,
          backgroundColor: "rgba(255,255,255,0.14)",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[orange[500], orange[300]]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          borderRadius: radii.pill,
        }}
      />
    </View>
  );
}

/** Small metric chip for the featured card. */
function MetaChip({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: radii.pill,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <AppIcon name={icon} size={11} color={navy[200]} />
      <ThemedText
        variant="footnote"
        translate={false}
        style={{ color: "#CBD6E8", fontSize: 11, lineHeight: 14 }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

/** Small metric chip for a card on the light canvas. */
function FactTag({
  icon,
  label,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radii.pill,
        backgroundColor: background,
      }}
    >
      <AppIcon name={icon} size={11} color={color} />
      <ThemedText
        variant="footnote"
        translate={false}
        numberOfLines={1}
        style={{ color, fontSize: 10.5, lineHeight: 14 }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * The dark, illustrated featured card — the soonest upcoming departure.
 *
 * Carries the destination scene (or branded route artwork), the departure clock,
 * the route, its distance and transit estimate, and a hold meter. Every figure
 * comes from the trip itself.
 */
function FeaturedDepartureCard({
  trip,
  onPress,
}: {
  trip: Trip;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const locale = currentDateLocale(language);

  const spacesLeftLabel = useTranslationText("spaces left", language);
  const noSpacesLabel = useTranslationText("No spaces left", language);
  const spaceCountLabel = useTranslationText(
    "{available} of {capacity} spaces left",
    language,
  );

  const capacity = typeof trip.capacity === "number" ? trip.capacity : 0;
  const available =
    typeof trip.availableCapacity === "number"
      ? Math.min(trip.availableCapacity, capacity)
      : capacity;
  const hasHold = capacity > 0;
  const isFull = hasHold && available <= 0;
  const freeRatio = hasHold ? available / capacity : 0;

  // Same route maths the map and Live Activity use, so the figures agree.
  const metrics = getRouteMetrics(trip.routeValue, trip.vehicle);
  const distanceText = formatDistanceKm(metrics.distanceKm, locale);
  const durationText = formatDuration(metrics.durationHours);

  const weekday = weekdayShort(trip);
  const date = formatDepartureDate(trip);
  const time = formatDepartureTime(trip);
  const route = formatRoute(trip);
  const vehicle = formatVehicle(trip.vehicle);

  const card = (
    <View style={{ backgroundColor: navy[800], borderRadius: radii.xl, overflow: "hidden", ...shadows.navy }}>
      {/* Illustrated header */}
      <View style={{ height: 118, position: "relative" }}>
        <TransportArt vehicle="route" fill style={StyleSheet.absoluteFill} />
        <Image
          source={{ uri: trip.imageUrl ?? sceneForTrip(trip).uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={240}
          cachePolicy="memory-disk"
          recyclingKey={trip.id}
          alt={sceneForTrip(trip).description}
        />
        <LinearGradient
          colors={["rgba(11,27,51,0.05)", "rgba(11,27,51,0.35)", navy[800]]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "rgba(11,27,51,0.55)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              borderRadius: radii.pill,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <AppIcon name="calendar-outline" size={11} color={neutral[0]} />
            <ThemedText
              variant="overline"
              translate={false}
              style={{ color: neutral[0], textTransform: "uppercase" }}
            >
              {`${weekday} · ${date}`}
            </ThemedText>
          </View>

          <View
            style={{
              backgroundColor: orange[500],
              borderRadius: radii.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <ThemedText
              variant="overline"
              style={{ color: neutral[0], textTransform: "uppercase" }}
            >
              {vehicle}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={{ padding: spacing.md + 2 }}>
        {/* Departure time + hold */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.sm,
          }}
        >
          <View style={{ flexShrink: 1 }}>
            <ThemedText
              variant="numericLg"
              translate={false}
              style={{ color: neutral[0], letterSpacing: -0.8 }}
            >
              {time}
            </ThemedText>
          </View>

          {hasHold ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                borderRadius: radii.md,
                paddingLeft: 9,
                paddingRight: 11,
                paddingVertical: 7,
              }}
            >
              <CapacityRing
                progress={freeRatio}
                color={theme.accent}
                track="#31405C"
                size={30}
              />
              <View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
                  <ThemedText
                    variant="button"
                    translate={false}
                    style={{ color: neutral[0] }}
                  >
                    {isFull ? 0 : available}
                  </ThemedText>
                  <ThemedText
                    variant="caption"
                    translate={false}
                    style={{ color: navy[300] }}
                  >
                    {`/ ${capacity}`}
                  </ThemedText>
                </View>
                <ThemedText
                  variant="overline"
                  style={{ color: navy[300], textTransform: "uppercase", fontSize: 9 }}
                >
                  {spacesLeftLabel}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        <ThemedText
          variant="title3"
          numberOfLines={1}
          style={{ color: neutral[0], marginTop: 14, letterSpacing: -0.2 }}
        >
          {route}
        </ThemedText>

        {/* Journey facts, not a repeat of the route title. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          {distanceText ? <MetaChip icon="navigate-outline" label={distanceText} /> : null}
          {durationText ? <MetaChip icon="time-outline" label={durationText} /> : null}
        </View>

        {hasHold ? (
          <View style={{ marginTop: 14 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing.sm,
                marginBottom: 7,
              }}
            >
              <ThemedText
                variant="caption"
                translate={false}
                style={{ color: theme.accent, fontWeight: "600" }}
              >
                {isFull
                  ? noSpacesLabel
                  : spaceCountLabel
                      .replace("{available}", String(available))
                      .replace("{capacity}", String(capacity))}
              </ThemedText>
              <ThemedText
                variant="overline"
                translate={false}
                style={{ color: navy[300], textTransform: "uppercase", fontSize: 9 }}
              >
                {`${Math.round(freeRatio * 100)}%`}
              </ThemedText>
            </View>
            <HoldMeter ratio={freeRatio} />
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${route}, ${date} ${time}, ${hasHold ? `${available} of ${capacity} spaces left` : vehicle}`}
      haptic="light"
      pressedScale={0.985}
      style={{ width: "100%" }}
    >
      {card}
    </PressableScale>
  );
}

/**
 * A regular departure on the timeline.
 *
 * Leads with the departure time, then the route, vehicle and remaining
 * capacity. Full departures carry the "Full" badge instead of a ring.
 */
function TimelineDepartureCard({
  trip,
  onPress,
}: {
  trip: Trip;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const status = formatStatus(trip.status);

  const capacity = typeof trip.capacity === "number" ? trip.capacity : 0;
  const available =
    typeof trip.availableCapacity === "number"
      ? Math.min(trip.availableCapacity, capacity)
      : capacity;
  const hasHold = capacity > 0;
  const isFull = hasHold && available <= 0;
  const freeRatio = hasHold ? available / capacity : 0;
  const isBookable = !trip.status || trip.status === "available";

  const weekday = weekdayShort(trip);
  const dayOfMonth = dayNumber(trip);
  const time = formatDepartureTime(trip);
  const route = formatRoute(trip);
  const vehicle = formatVehicle(trip.vehicle);

  const metrics = getRouteMetrics(trip.routeValue, trip.vehicle);
  const distanceText = formatDistanceKm(metrics.distanceKm, currentDateLocale(language));

  const card = (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: theme.borderSubtle,
        padding: 13,
        ...shadows.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* Date tile */}
        <View
          style={{
            width: 54,
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            paddingVertical: 8,
            borderRadius: radii.md,
            backgroundColor: isBookable ? theme.primarySoft : theme.surfaceAlt,
          }}
        >
          <ThemedText
            variant="overline"
            translate={false}
            style={{ color: theme.textTertiary, textTransform: "uppercase", fontSize: 9 }}
          >
            {weekday}
          </ThemedText>
          <ThemedText
            variant="title2"
            translate={false}
            style={{ color: isBookable ? theme.primary : theme.textSecondary, lineHeight: 26 }}
          >
            {dayOfMonth}
          </ThemedText>
          <ThemedText
            variant="overline"
            translate={false}
            style={{ color: theme.textTertiary, fontSize: 9.5 }}
          >
            {time}
          </ThemedText>
        </View>

        {/* Route, facts and how much room is left */}
        <View style={{ flex: 1, gap: 7 }}>
          <ThemedText
            variant="title3"
            numberOfLines={1}
            style={{ color: theme.textPrimary, letterSpacing: -0.2 }}
          >
            {route}
          </ThemedText>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <FactTag
              icon="cube-outline"
              label={vehicle}
              color={theme.primary}
              background={theme.primarySoft}
            />
            {distanceText ? (
              <FactTag
                icon="navigate-outline"
                label={distanceText}
                color={theme.textSecondary}
                background={theme.surfaceAlt}
              />
            ) : null}
          </View>

          {hasHold ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: radii.pill,
                  backgroundColor: theme.surfaceSunken,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.round(freeRatio * 100)}%`,
                    height: "100%",
                    borderRadius: radii.pill,
                    backgroundColor: isFull ? theme.borderStrong : theme.accent,
                  }}
                />
              </View>
              <ThemedText
                variant="footnote"
                translate={false}
                style={{ color: theme.textTertiary, fontSize: 10 }}
              >
                {`${isFull ? 0 : available}/${capacity}`}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* State */}
        <View style={{ alignItems: "center", gap: 6 }}>
          {!isBookable ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.pill,
                backgroundColor: theme.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <ThemedText
                variant="overline"
                style={{ color: theme.textSecondary, textTransform: "uppercase", fontSize: 9 }}
              >
                {status.label}
              </ThemedText>
            </View>
          ) : isFull ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.pill,
                backgroundColor: semantic.warning.bg,
                borderWidth: 1,
                borderColor: semantic.warning.border,
              }}
            >
              <ThemedText
                variant="overline"
                style={{ color: semantic.warning.fg, textTransform: "uppercase", fontSize: 9 }}
              >
                Full
              </ThemedText>
            </View>
          ) : hasHold ? (
            <CapacityRing
              progress={freeRatio}
              color={theme.primary}
              track={theme.borderSubtle}
              size={26}
            />
          ) : null}
          <AppIcon name="chevron-forward" size={16} color={theme.textQuaternary} />
        </View>
      </View>
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${route}, ${weekday} ${dayOfMonth} ${time}, ${hasHold ? `${available} of ${capacity} spaces left` : vehicle}`}
      haptic="light"
      pressedScale={0.985}
      style={{ width: "100%" }}
    >
      {card}
    </PressableScale>
  );
}

/** A node dot on the timeline spine. */
function NodeDot({ color, ring }: { color: string; ring: string }) {
  return (
    <View
      style={{
        width: 13,
        height: 13,
        borderRadius: 999,
        backgroundColor: color,
        borderWidth: 3,
        borderColor: ring,
      }}
    />
  );
}

/** One timeline row: rail (spine + dot) + card. */
function TimelineRow({
  dotColor,
  last,
  children,
}: {
  dotColor: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();

  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: 28, alignItems: "center" }}>
        {/* Line reaching up to the month label / previous dot — a fixed lead so
            every node sits level with its card's date header. */}
        <View
          style={{
            width: 0,
            borderLeftWidth: 1.5,
            borderStyle: "dashed",
            borderColor: theme.borderStrong,
            height: 22,
          }}
        />
        <NodeDot color={dotColor} ring={theme.canvas} />
        {/* Line reaching down to the next dot. */}
        {!last ? (
          <View
            style={{
              width: 0,
              borderLeftWidth: 1.5,
              borderStyle: "dashed",
              borderColor: theme.borderStrong,
              flex: 1,
            }}
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
      <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 16 }}>{children}</View>
    </View>
  );
}

/**
 * The vertical timeline for one direction's departures.
 *
 * Departures are grouped by month, each group headed by the month name. The
 * first upcoming departure (when the scope looks forward) is rendered as the
 * featured "loaded bay" card; the rest are compact timeline cards. Node dots
 * are coloured by state: orange for the featured departure, navy for available,
 * grey for full / unavailable.
 */
export function RouteTimeline({
  trips,
  featured,
  onPressTrip,
}: {
  trips: Trip[];
  /** When true, the first item is rendered as the illustrated featured card. */
  featured: boolean;
  onPressTrip: (trip: Trip) => void;
}) {
  const theme = useThemeColors();

  if (trips.length === 0) return null;

  // Index runs of departures by month, preserving order.
  const rows: { month: string; items: Trip[] }[] = [];
  for (const trip of trips) {
    const label = monthFull(trip);
    const last = rows[rows.length - 1];
    if (last && last.month === label) {
      last.items.push(trip);
    } else {
      rows.push({ month: label, items: [trip] });
    }
  }

  let flatIndex = 0;
  const total = trips.length;

  return (
    <View>
      {rows.map((row) => (
        <View key={row.month}>
          <View style={{ paddingLeft: 28, marginBottom: 8 }}>
            <ThemedText
              variant="overline"
              style={{ color: theme.textTertiary, textTransform: "uppercase" }}
            >
              {row.month}
            </ThemedText>
          </View>
          {row.items.map((trip) => {
            const capacity = typeof trip.capacity === "number" ? trip.capacity : 0;
            const available =
              typeof trip.availableCapacity === "number"
                ? Math.min(trip.availableCapacity, capacity)
                : capacity;
            const isFull = capacity > 0 && available <= 0;
            const isFeatured = featured && flatIndex === 0;
            const isLast = flatIndex === total - 1;

            const dotColor = isFeatured
              ? theme.accent
              : trip.status && trip.status !== "available"
                ? theme.textQuaternary
                : isFull
                  ? theme.textQuaternary
                  : theme.primary;

            const card = isFeatured ? (
              <FeaturedDepartureCard trip={trip} onPress={() => onPressTrip(trip)} />
            ) : (
              <TimelineDepartureCard trip={trip} onPress={() => onPressTrip(trip)} />
            );

            flatIndex += 1;

            return (
              <TimelineRow
                key={trip.id}
                dotColor={dotColor}
                last={isLast}
              >
                {card}
              </TimelineRow>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  travellerChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    flex: 1,
    borderRadius: 11,
  },
});
