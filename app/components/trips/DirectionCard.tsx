import React from "react";
import { View } from "react-native";
import AppIcon from "@/app/components/ui/AppIcon";
import PressableScale from "@/app/components/ui/PressableScale";
import ThemedText from "@/app/components/ui/ThemedText";
import CountryFlag from "@/app/components/ui/CountryFlag";
import Badge from "@/app/components/ui/Badge";
import { useThemeColors } from "@/app/theme";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { formatDepartureLabel, formatStatus, formatVehicle } from "@/app/lib/tripFormat";
import type { CountryCode } from "@/app/lib/routes";
import type { Trip } from "@/app/lib/tripTypes";

type DirectionCardProps = {
  title: string;
  target: string;
  country: CountryCode;
  nextTrip?: Trip | null;
  onPress: () => void;
};

/** Compact route selector for the two serviced directions. */
export default function DirectionCard({ title, target, country, nextTrip, onPress }: DirectionCardProps) {
  const theme = useThemeColors();
  const targetCountry: CountryCode = country === "SE" ? "TN" : "SE";
  const departureHint = nextTrip ? `, next departure ${formatDepartureLabel(nextTrip)}` : "";
  const status = nextTrip ? formatStatus(nextTrip.status) : null;
  const capacityHint =
    nextTrip?.availableCapacity != null
      ? `${nextTrip.availableCapacity} spaces left`
      : nextTrip
        ? formatVehicle(nextTrip.vehicle)
        : null;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} to ${target}${departureHint}`}
      haptic="light"
      pressedScale={0.985}
      style={{ flex: 1 }}
    >
      <View style={{ minHeight: 112, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface, ...shadows.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <CountryFlag country={country} size={23} radius={5} />
          <ThemedText variant="caption" style={{ flexShrink: 1, fontWeight: "700" }} numberOfLines={1}>{title}</ThemedText>
          <AppIcon name="arrow-forward" size={13} color={theme.textQuaternary} />
          <CountryFlag country={targetCountry} size={23} radius={5} />
          <ThemedText variant="caption" style={{ flexShrink: 1, fontWeight: "700" }} numberOfLines={1}>{target}</ThemedText>
        </View>

        <View style={{ height: 1, backgroundColor: theme.separator, marginVertical: spacing.sm }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <AppIcon name={nextTrip ? "calendar-outline" : "compass-outline"} size={15} color={theme.primary} />
          <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {nextTrip ? formatDepartureLabel(nextTrip) : "View departures"}
          </ThemedText>
          <AppIcon name="chevron-forward" size={15} color={theme.textQuaternary} />
        </View>
        {nextTrip && status ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" }}>
            <Badge label={status.label} tone={status.tone} />
            {capacityHint ? (
              <ThemedText variant="caption" tone="tertiary" numberOfLines={1} style={{ flex: 1 }}>
                {capacityHint}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}
