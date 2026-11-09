import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";

import ThemedText from "./ThemedText";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  /** Optional call to action. */
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A designed empty state.
 *
 * Every data-driven screen in the redesign uses this rather than an empty
 * scroll view, so "nothing here" always looks intentional.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  const theme = useThemeColors();

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing.huge,
          paddingHorizontal: spacing.xxl,
          gap: spacing.md,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.xxl,
          backgroundColor: theme.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppIcon name={icon} size={28} color={theme.primary} />
      </View>

      <ThemedText variant="title3" align="center">
        {title}
      </ThemedText>

      {description ? (
        <ThemedText variant="bodySm" tone="secondary" align="center">
          {description}
        </ThemedText>
      ) : null}

      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}
