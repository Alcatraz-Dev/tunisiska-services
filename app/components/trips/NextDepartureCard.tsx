import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import Skeleton from "@/app/components/ui/Skeleton";

import PressableScale from "@/app/components/ui/PressableScale";
import ThemedText from "@/app/components/ui/ThemedText";
import { useThemeColors } from "@/app/theme";
import { shadows } from "@/app/theme/spacing";
import { formatDepartureLabel, formatDirection } from "@/app/lib/tripFormat";
import type { Trip } from "@/app/lib/tripTypes";

type NextDepartureCardProps = {
  trip?: Trip | null;
  loading?: boolean;
  onPress: () => void;
};

/**
 * The "Next departure" card.
 *
 * One calendar tile, the real departure date and time, the direction, and a
 * chevron. When nothing is scheduled the card says exactly that — a departure
 * is never invented.
 */
export default function NextDepartureCard({
  trip,
  loading = false,
  onPress,
}: NextDepartureCardProps) {
  const theme = useThemeColors();

  const shell = {
    backgroundColor: theme.surface,
    borderColor: theme.borderSubtle,
    ...shadows.md,
  };

  if (loading) {
    return (
      <View
        className="flex-row items-center gap-3.5 rounded-[20px] border p-3.5"
        style={shell}
        accessibilityLabel="Loading next departure"
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: theme.primarySoft }}
        >
          <AppIcon name="calendar" size={20} color={theme.primary} />
        </View>
        <View className="flex-1 gap-1.5">
          <Skeleton width={96} height={10} radius={5} />
          <Skeleton width={160} height={14} radius={7} />
          <Skeleton width={112} height={10} radius={5} />
        </View>
      </View>
    );
  }

  if (!trip) {
    return (
      <View
        className="flex-row items-center gap-3.5 rounded-[20px] border p-3.5"
        style={shell}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: theme.surfaceAlt }}
        >
          <AppIcon
            name="calendar-outline"
            size={20}
            color={theme.textTertiary}
          />
        </View>
        <View className="flex-1">
          <ThemedText variant="caption" tone="secondary">
            Next departure
          </ThemedText>
          <ThemedText variant="title3" style={{ marginTop: 2 }}>
            No departure scheduled
          </ThemedText>
          <ThemedText variant="footnote" tone="tertiary" style={{ marginTop: 2 }}>
            New departures are announced in News
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Next departure ${formatDepartureLabel(trip)}, ${formatDirection(trip)}`}
      haptic="light"
      pressedScale={0.985}
      style={{ width: "100%" }}
    >
      <View
        className="flex-row items-center gap-3.5 rounded-[20px] border p-3.5"
        style={shell}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: theme.primarySoft }}
        >
          <AppIcon name="calendar" size={20} color={theme.primary} />
        </View>

        <View className="flex-1">
          <ThemedText variant="caption" tone="secondary">
            Next departure
          </ThemedText>
          <ThemedText
            variant="title3"
            translate={false}
            style={{ marginTop: 2, letterSpacing: -0.3 }}
          >
            {formatDepartureLabel(trip)}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
            {formatDirection(trip)}
          </ThemedText>
        </View>

        <AppIcon name="chevron-forward" size={18} color={theme.textTertiary} />
      </View>
    </PressableScale>
  );
}
