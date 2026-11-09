import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import IconButton from "./IconButton";
import ThemedText from "./ThemedText";
import { useThemeColors } from "@/app/theme";
import { spacing } from "@/app/theme/spacing";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Show a back chevron that navigates back. */
  showBack?: boolean;
  /** Right-hand accessory (e.g. notification bell). */
  right?: React.ReactNode;
  /** Right-hand icon action. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  translateTitle?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Standard screen header: optional back affordance, title, optional subtitle,
 * and a single right-hand action.
 */
export default function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  right,
  rightIcon,
  onRightPress,
  rightAccessibilityLabel,
  translateTitle = true,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const backLabel = useTranslationText("Back", language);
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {showBack ? (
        <IconButton
          icon="chevron-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          accessibilityLabel={backLabel || "Back"}
          tone="secondary"
          size={24}
          surface
          style={{ marginLeft: -spacing.md }}
        />
      ) : null}

      <View style={{ flex: 1 }}>
        <ThemedText
          variant="title2"
          numberOfLines={1}
          translate={translateTitle}
        >
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            variant="caption"
            tone="secondary"
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {right}
      {rightIcon ? (
        <IconButton
          icon={rightIcon}
          onPress={onRightPress}
          accessibilityLabel={rightAccessibilityLabel ?? title}
          tone="secondary"
          surface
        />
      ) : null}
    </View>
  );
}
