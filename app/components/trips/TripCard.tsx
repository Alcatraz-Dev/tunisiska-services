import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { G, Path, Rect } from "react-native-svg";

import PressableScale from "@/app/components/ui/PressableScale";
import ThemedText from "@/app/components/ui/ThemedText";
import TransportArt from "@/app/components/ui/TransportArt";
import Badge from "@/app/components/ui/Badge";
import CapacityCard from "@/app/components/trips/CapacityCard";
import { useThemeColors } from "@/app/theme";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { navy, neutral, orange } from "@/app/theme/colors";
import { fontFamily } from "@/app/theme/typography";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { sceneForTrip } from "@/app/lib/tripImagery";
import {
  formatDepartureDate,
  formatDepartureTime,
  formatRoute,
  formatStatus,
  formatVehicle,
} from "@/app/lib/tripFormat";
import type { Trip } from "@/app/lib/tripTypes";

export type TripCardVariant = "lead" | "bay";

type TripCardProps = {
  trip: Trip;
  /** Omit to render the card statically, e.g. embedded on a detail screen. */
  onPress?: () => void;
  /** `lead` is the loaded navy bay for the soonest departure; `bay` is a stacked row. */
  variant?: TripCardVariant;
  /** The lead card carries the destination scene; switch off where a hero already does. */
  media?: boolean;
  /** Hide repeated route/date labels when the parent already presents them. */
  showRoute?: boolean;
  showDate?: boolean;
  /** Use a compact, proportional summary when the card appears on trip details. */
  capacityDisplay?: "bay" | "summary";
};

/**
 * Slot geometry for the two drawing sizes: the lead hold is drawn at plan-view
 * scale, the row hold as a strip.
 */
const SLOT = {
  lead: { width: 40, height: 22, gapX: 4, gapY: 6 },
  bay: { width: 40, height: 14, gapX: 4, gapY: 3 },
} as const;

const BAY_PADDING = 8;
const DOOR_GAP = 6;
const DOOR_WIDTH = 12;

/**
 * Most departures are scheduled in pallet-sized holds, but a schedule can be
 * authored on a larger scale — the CMS currently also carries trips counted in
 * the thousands. Past this many slots the hold is drawn proportionally (same
 * fullness, a readable number of slots) while every figure shown stays the real
 * capacity.
 */
const MAX_DRAWN_SLOTS = 24;

/**
 * Which slots are still free.
 *
 * Free slots are spread through the hold rather than clumped at one end —
 * nothing is booked in slot order, so a contiguous gap would misrepresent it.
 */
function freeSlots(capacity: number, available: number): Set<number> {
  const free = new Set<number>();
  const count = Math.max(0, Math.min(available, capacity));
  if (count === 0) return free;

  for (let i = 0; i < count; i += 1) {
    const index = Math.floor((i + 0.5) * (capacity / count));
    free.add(Math.min(capacity - 1, index));
  }

  return free;
}

/** Hold grid: six abreast where the capacity divides evenly, otherwise two rows. */
function gridFor(capacity: number) {
  const columns =
    capacity <= 6
      ? capacity
      : capacity % 6 === 0
        ? 6
        : Math.min(6, Math.ceil(capacity / 2));

  return { columns, rows: Math.ceil(capacity / columns) };
}

type CargoBayProps = {
  capacity: number;
  available: number;
  tone: "dark" | "light";
};

/**
 * The hold, drawn to the departure's capacity.
 *
 * Filled slots are booked; dashed slots are still free. The drawing never
 * claims space the trip does not have — when the capacity is recorded on a
 * larger scale the slot count is capped, not the number shown.
 */
export function CargoBay({ capacity, available, tone }: CargoBayProps) {
  const dark = tone === "dark";
  const slot = dark ? SLOT.lead : SLOT.bay;

  const drawnCapacity = Math.min(capacity, MAX_DRAWN_SLOTS);
  const drawnAvailable = Math.round((available / capacity) * drawnCapacity);
  const { columns, rows } = gridFor(drawnCapacity);
  const free = freeSlots(drawnCapacity, drawnAvailable);

  /** A cross on every free slot turns a nearly empty hold into a wall of orange. */
  const showCross = drawnAvailable <= 12;

  const width =
    BAY_PADDING * 2 +
    columns * slot.width +
    (columns - 1) * slot.gapX +
    DOOR_GAP +
    DOOR_WIDTH;
  const height =
    BAY_PADDING * 2 + rows * slot.height + (rows - 1) * slot.gapY;

  const floor = dark ? "#0E1623" : "#F8FAFC";
  const edge = dark ? "#24324A" : "#E4E9F0";
  const hatch = dark ? "#31405C" : "#D3DBE6";
  const bookedFill = navy[dark ? 600 : 700];
  const bookedTop = navy[dark ? 500 : 600];
  const accent = dark ? orange[400] : orange[500];
  const doorX = width - BAY_PADDING - DOOR_WIDTH;

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {/* Hold floor */}
      <Rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={radii.xs - 1}
        fill={floor}
        stroke={edge}
      />

      {/* Rear doors */}
      <Path
        d={`M${doorX - 2} ${BAY_PADDING} V${height - BAY_PADDING}`}
        stroke={edge}
        strokeWidth={1}
        strokeDasharray={[3, 4]}
      />
      <Path
        d={`M${doorX + 5} ${BAY_PADDING + 4} V${height - BAY_PADDING - 4}`}
        stroke={hatch}
        strokeWidth={2}
        strokeDasharray={[4, 4]}
      />

      {Array.from({ length: drawnCapacity }).map((_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = BAY_PADDING + column * (slot.width + slot.gapX);
        const y = BAY_PADDING + row * (slot.height + slot.gapY);

        if (free.has(index)) {
          const arm = slot.height * 0.27;
          const cx = x + slot.width / 2;
          const cy = y + slot.height / 2;

          return (
            <G key={`slot-${index}`}>
              <Rect
                x={x + 0.5}
                y={y + 0.5}
                width={slot.width - 1}
                height={slot.height - 1}
                rx={2.5}
                fill={accent}
                fillOpacity={0.1}
                stroke={accent}
                strokeDasharray={[4, 3]}
              />
              {showCross ? (
                <Path
                  d={`M${cx - arm} ${cy} h${arm * 2} M${cx} ${cy - arm} v${arm * 2}`}
                  stroke={accent}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
              ) : null}
            </G>
          );
        }

        return (
          <G key={`slot-${index}`}>
            <Rect
              x={x}
              y={y}
              width={slot.width}
              height={slot.height}
              rx={2.5}
              fill={bookedFill}
            />
            {slot.height >= 18 ? (
              <Rect
                x={x + 4}
                y={y + 4}
                width={slot.width - 8}
                height={slot.height - 8}
                rx={1.5}
                fill={bookedTop}
              />
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

/**
 * A scheduled departure, drawn as cargo.
 *
 * The hold is the primary reading surface: how many spaces the vehicle carries,
 * how many are booked, and how many are still free. When the timetable records
 * no capacity for a departure the drawing is omitted rather than guessed.
 *
 * The lead card sets the hold against the destination scene — scenery for the
 * route, never a claim about the departure itself. Direction is carried by the
 * section header above the card, so the card leads with the city pair.
 */
export default function TripCard({
  trip,
  onPress,
  variant = "bay",
  media = true,
  showRoute = true,
  showDate = true,
  capacityDisplay = "summary",
}: TripCardProps) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const noSpacesLabel = useTranslationText("No spaces left", language);
  const spaceCountLabel = useTranslationText(
    "{available} of {capacity} spaces left",
    language,
  );
  const [imageFailed, setImageFailed] = useState(false);
  const status = formatStatus(trip.status);
  const isBookable = !trip.status || trip.status === "available";

  const capacity = typeof trip.capacity === "number" ? trip.capacity : 0;
  const available =
    typeof trip.availableCapacity === "number"
      ? Math.max(0, Math.min(trip.availableCapacity, capacity))
      : capacity;
  const availableRatio = capacity > 0 ? available / capacity : 0;
  const hasHold = capacity > 0;
  const isFull = hasHold && available <= 0;

  const route = formatRoute(trip);
  const vehicle = formatVehicle(trip.vehicle);
  const date = formatDepartureDate(trip);
  const time = formatDepartureTime(trip);

  const scene = useMemo(
    () =>
      sceneForTrip({
        id: trip.id,
        routeValue: trip.routeValue,
        destinationCountry: trip.route.destinationCountry,
      }),
    [trip.id, trip.routeValue, trip.route.destinationCountry],
  );

  const accessibilityLabel = [
    route,
    `${date}, ${time}`,
    hasHold ? `${available} of ${capacity} spaces left` : vehicle,
  ].join(" — ");

  const plate = (color: string, background: string, caption: string) => (
    <View
      style={{
        backgroundColor: background,
        borderRadius: 5,
        paddingHorizontal: 6,
        paddingVertical: 3,
      }}
    >
      <ThemedText
        variant="overline"
        numberOfLines={1}
        style={{
          color,
          fontSize: 8.5,
          lineHeight: 11,
          textTransform: "uppercase",
        }}
      >
        {caption}
      </ThemedText>
    </View>
  );

  const card =
    variant === "lead" ? (
      <View
        style={{
          backgroundColor: navy[800],
          borderRadius: radii.xl,
          overflow: "hidden",
          ...shadows.navy,
        }}
      >
        {media ? (
          <View style={{ height: 118, position: "relative" }}>
            <TransportArt
              vehicle={trip.vehicle as any}
              fill
              style={StyleSheet.absoluteFill}
            />

            {imageFailed ? null : (
              <Image
                source={{ uri: trip.imageUrl ?? scene.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={240}
                cachePolicy="memory-disk"
                recyclingKey={trip.id}
                alt={
                  trip.imageUrl
                    ? `${route} departure`
                    : scene.description
                }
                onError={() => setImageFailed(true)}
              />
            )}

            {/* Scene fades into the panel, so the photograph never fights the hold. */}
            <LinearGradient
              colors={["rgba(11,27,51,0.12)", "rgba(11,27,51,0.55)", "#0B1B33"]}
              locations={[0, 0.62, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View
              style={{
                position: "absolute",
                right: spacing.md,
                top: spacing.md,
              }}
            >
              {plate(navy[800], neutral[0], vehicle)}
            </View>
          </View>
        ) : null}

        <View style={{ padding: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: spacing.sm,
            }}
          >
            <View style={{ flexShrink: 1 }}>
              {showDate ? (
                <ThemedText
                  variant="overline"
                  translate={false}
                  style={{ color: navy[300], textTransform: "uppercase" }}
                >
                  {date}
                </ThemedText>
              ) : null}
              <ThemedText
                variant="numeric"
                translate={false}
                style={{
                  color: neutral[0],
                  fontFamily: fontFamily.extrabold,
                  marginTop: 4,
                }}
              >
                {time}
              </ThemedText>
            </View>

            {media ? null : plate(navy[800], neutral[0], vehicle)}
          </View>

          {showRoute ? (
            <ThemedText
              variant="headline"
              numberOfLines={1}
              style={{ color: neutral[0], marginTop: 10 }}
            >
              {route}
            </ThemedText>
          ) : null}

          {hasHold ? (
            capacityDisplay === "summary" ? (
              <CapacityCard
                capacity={capacity}
                available={available}
                tone="dark"
                style={{ marginTop: spacing.md }}
              />
            ) : (
              <View style={{ marginTop: 10 }}>
                <CargoBay capacity={capacity} available={available} tone="dark" />
              </View>
            )
          ) : null}

          {capacityDisplay === "bay" ? <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            {hasHold ? (
              <ThemedText
                variant="caption"
                style={{ color: orange[400] }}
              >
                {isFull
                  ? noSpacesLabel
                  : spaceCountLabel
                      .replace("{available}", String(available))
                      .replace("{capacity}", String(capacity))}
              </ThemedText>
            ) : (
              <View />
            )}
            {onPress ? <AppIcon name="arrow-forward" size={14} color={navy[400]} /> : null}
          </View> : null}
        </View>
      </View>
    ) : (
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: theme.borderSubtle,
          padding: spacing.md,
          ...shadows.sm,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: spacing.md,
          }}
        >
          <View style={{ width: 58 }}>
            <ThemedText
              variant="button"
              translate={false}
              style={{ color: theme.textPrimary }}
            >
              {time}
            </ThemedText>
            <ThemedText
              variant="caption"
              translate={false}
              numberOfLines={1}
              style={{
                color: theme.textTertiary,
                fontSize: 10,
                lineHeight: 14,
                marginTop: 2,
              }}
            >
              {date}
            </ThemedText>
          </View>

          <View style={{ flex: 1, gap: 5 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing.sm,
              }}
            >
              <ThemedText
                variant="headline"
                numberOfLines={1}
                style={{ color: theme.textPrimary, flex: 1 }}
              >
                {route}
              </ThemedText>

              {!isBookable ? (
                <Badge label={status.label} tone={status.tone} />
              ) : hasHold ? (
                <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: theme.accentSoft }}>
                  <ThemedText variant="overline" translate={false} style={{ color: theme.accent, fontSize: 9 }}>
                    {`${Math.round(availableRatio * 100)}%`}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {plate(theme.textOnAccent, theme.primary, vehicle)}
          </View>
        </View>

        {hasHold ? (
          capacityDisplay === "summary" ? (
            <CapacityCard
              capacity={capacity}
              available={available}
              tone="light"
              style={{ marginTop: spacing.md }}
            />
          ) : (
            <View style={{ marginTop: 10 }}>
              <CargoBay capacity={capacity} available={available} tone="light" />
            </View>
          )
        ) : null}
      </View>
    );

  if (!onPress) {
    return <View style={{ width: "100%" }}>{card}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      haptic="light"
      pressedScale={0.985}
      style={{ width: "100%" }}
    >
      {card}
    </PressableScale>
  );
}
