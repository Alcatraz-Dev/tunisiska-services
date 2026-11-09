import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { useThemeColors } from "@/app/theme";
import { borderWidth, radii, shadows, spacing } from "@/app/theme/spacing";

export type CardVariant = "elevated" | "flat" | "outlined" | "inverse";
export type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: number;
  /** Override the border colour. */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  accessibilityLabel?: string;
};

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.xl,
};

/**
 * The design-system card.
 *
 * One elevation language across the app: soft, wide, low-opacity shadows on
 * light surfaces; a clear hairline border instead of shadow on dark surfaces.
 * Radii: lg (20) for most cards, xl (24) for featured cards
 */
export default function Card({
  variant = "elevated",
  padding = "md",
  radius = radii.lg,
  borderColor,
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useThemeColors();

  const surface =
    variant === "inverse"
      ? theme.surfaceInverse
      : variant === "flat"
        ? theme.surfaceAlt
        : theme.surface;

  const shadow =
    variant === "elevated"
      ? shadows.md
      : variant === "flat"
        ? shadows.none
        : shadows.none;

  const border =
    variant === "outlined" || variant === "inverse"
      ? {
          borderWidth: borderWidth.thin,
          borderColor: borderColor ?? theme.border,
        }
      : null;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: surface,
          borderRadius: radius,
          padding: paddingMap[padding],
        },
        shadow,
        border,
        style,
      ]}
    >
      {children}
    </View>
  );
}
