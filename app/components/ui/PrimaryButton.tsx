import React from "react";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";

import PressableScale from "./PressableScale";
import ThemedText from "./ThemedText";
import { useThemeColors } from "@/app/theme";
import { radii, shadows, spacing, minTouchTarget } from "@/app/theme/spacing";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

export type ButtonVariant = "primary" | "secondary" | "accent" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "leading" | "trailing";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The design-system button.
 *
 * A single, restrained action language: one primary action per surface, a navy
 * fill, and orange reserved for genuinely attention-worthy actions.
 */
export default function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "leading",
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityLabel,
  style,
  testID,
}: PrimaryButtonProps) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const translatedLabel = useTranslationText(label, language);
  const translatedAccessibilityLabel = useTranslationText(accessibilityLabel ?? label, language);
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      bg: theme.primary,
      pressed: theme.primaryPressed,
      fg: theme.textOnAccent,
      border: "transparent",
      shadow: shadows.navy,
    },
    secondary: {
      bg: theme.surface,
      pressed: theme.surfaceSunken,
      fg: theme.primary,
      border: theme.border,
      shadow: shadows.sm,
    },
    accent: {
      bg: theme.accent,
      pressed: theme.accentPressed,
      fg: theme.textOnAccent,
      border: "transparent",
      shadow: shadows.md,
    },
    outline: {
      bg: "transparent",
      pressed: theme.surfaceSunken,
      fg: theme.primary,
      border: theme.primary,
      shadow: shadows.none,
    },
    ghost: {
      bg: "transparent",
      pressed: theme.surfaceSunken,
      fg: theme.primary,
      border: "transparent",
      shadow: shadows.none,
    },
  }[variant];

  const height = size === "lg" ? 54 : size === "sm" ? 40 : 48;

  const content = (
    <View
      style={{
        height,
        borderRadius: radii.md,
        backgroundColor: palette.bg,
        borderWidth: palette.border === "transparent" ? 0 : 1,
        borderColor: palette.border,
        paddingHorizontal: spacing.xl,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        opacity: isDisabled ? 0.45 : 1,
        width: fullWidth ? "100%" : undefined,
        minHeight: minTouchTarget,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon && iconPosition === "leading" ? (
            <AppIcon name={icon} size={18} color={palette.fg} />
          ) : null}
          <ThemedText
            variant="button"
            translate={false}
            style={{ color: palette.fg }}
          >
            {translatedLabel || label}
          </ThemedText>
          {icon && iconPosition === "trailing" ? (
            <AppIcon name={icon} size={18} color={palette.fg} />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={translatedAccessibilityLabel || accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      haptic="light"
      pressedScale={0.985}
      pressedOpacity={0.94}
      style={[fullWidth ? { width: "100%" } : null, style]}
      testID={testID}
    >
      {content}
    </PressableScale>
  );
}
