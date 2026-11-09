import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";

import PressableScale from "./PressableScale";
import ThemedText from "./ThemedText";
import { useThemeColors } from "@/app/theme";
import { radii, spacing, minTouchTarget } from "@/app/theme/spacing";

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Optional label rendered under the icon (tab bar style). */
  label?: string;
  size?: number;
  tone?: "primary" | "secondary" | "inverse" | "accent";
  /** Draw a circular surface behind the icon. */
  surface?: boolean;
  badge?: number;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Circular icon button used for headers, notifications and inline actions.
 *
 * Always requires an `accessibilityLabel` — an unlabelled icon is unusable with
 * VoiceOver.
 */
export default function IconButton({
  icon,
  onPress,
  label,
  size = 22,
  tone = "primary",
  surface = false,
  badge,
  accessibilityLabel,
  disabled,
  style,
}: IconButtonProps) {
  const theme = useThemeColors();

  const color = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    inverse: theme.textInverse,
    accent: theme.accent,
  }[tone];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      haptic="light"
      pressedScale={0.9}
      style={[{ alignItems: "center", justifyContent: "center" }, style]}
    >
      <View
        style={{
          width: minTouchTarget,
          height: minTouchTarget,
          borderRadius: radii.pill,
          alignItems: "center",
          justifyContent: "center",
            backgroundColor: surface ? theme.surface : "transparent",
            borderWidth: surface ? 1 : 0,
            borderColor: surface ? theme.border : "transparent",
        }}
      >
        <AppIcon name={icon} size={size} color={color} />

        {badge && badge > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 2,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: radii.pill,
              backgroundColor: theme.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemedText
              variant="overline"
              translate={false}
              style={{ color: theme.textOnAccent, fontSize: 10 }}
            >
              {badge > 99 ? "99+" : String(badge)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {label ? (
        <ThemedText variant="tab" tone="secondary" style={{ marginTop: 2 }}>
          {label}
        </ThemedText>
      ) : null}
    </PressableScale>
  );
}
