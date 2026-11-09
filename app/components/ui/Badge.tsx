import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";

import ThemedText from "./ThemedText";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  translate?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact status pill.
 *
 * Status is always conveyed by the label as well as the colour, so meaning is
 * never carried by colour alone.
 */
export default function Badge({
  label,
  tone = "neutral",
  icon,
  translate = true,
  style,
}: BadgeProps) {
  const theme = useThemeColors();

  const palette = {
    neutral: { fg: theme.textSecondary, bg: theme.surfaceAlt, border: theme.border },
    accent: { fg: theme.accent, bg: theme.accentSoft, border: theme.accentBorder },
    primary: { fg: theme.primary, bg: theme.primarySoft, border: theme.primaryBorder },
    success: { fg: "#147A48", bg: "#E7F5EE", border: "#BFE5D1" },
    warning: { fg: "#9A5B06", bg: "#FEF3E2", border: "#F6DFB8" },
    danger: { fg: "#B32525", bg: "#FDECEC", border: "#F5C9C9" },
    info: { fg: "#1D4ED8", bg: "#E8EFFE", border: "#C6D6FB" },
  }[tone];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: spacing.md,
          paddingVertical: 5,
          borderRadius: radii.pill,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      {icon ? <AppIcon name={icon} size={12} color={palette.fg} /> : null}
      <ThemedText
        variant="overline"
        translate={translate}
        style={{ color: palette.fg, textTransform: "uppercase" }}
      >
        {label}
      </ThemedText>
    </View>
  );
}
