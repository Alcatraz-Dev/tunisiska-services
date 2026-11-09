import React from "react";
import { Platform } from "react-native";
import { NativeTabs } from "expo-router/native-tabs";

import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { useThemeColors } from "@/app/theme";

/**
 * The app's four customer destinations, rendered by the platform itself:
 * a real `UITabBar` on iOS and a Material `BottomNavigationView` on Android.
 *
 * The bar keeps the system look and behaviour for free — the Liquid Glass bar
 * and scroll minimisation on iOS 26, the Material indicator and ripple on
 * Android, correct safe-area and home-indicator handling on every device
 * (including the iPhone 17 family), and native press/haptic behaviour.
 *
 * Icons come from the existing `assets/icons` set, exactly as the previous
 * custom bar used them, so the artwork stays the brand's own.
 */
export default function TabLayout() {
  const theme = useThemeColors();
  const { language } = useLanguage();

  const homeLabel = useTranslationText("Home", language);
  const tripsLabel = useTranslationText("Trips", language);
  const newsLabel = useTranslationText("News", language);
  const profileLabel = useTranslationText("Profile", language);

  return (
    <NativeTabs
      tintColor={theme.accent}
      iconColor={theme.textTertiary}
      backgroundColor={Platform.OS === "android" ? theme.surface : undefined}
      labelVisibilityMode="labeled"
      // iOS 26 lets the bar shrink to a compact Liquid Glass pill while the
      // content scrolls, then expand when the user scrolls back up.
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          src={require("@/app/assets/icons/tab-24/home.png")}
          selectedColor={theme.accent}
        />
        <NativeTabs.Trigger.Label selectedStyle={{ color: theme.accent }}>
          {homeLabel}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Icon
          src={require("@/app/assets/icons/tab-24/calendar.png")}
          selectedColor={theme.accent}
        />
        <NativeTabs.Trigger.Label selectedStyle={{ color: theme.accent }}>
          {tripsLabel}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="news">
        <NativeTabs.Trigger.Icon
          src={require("@/app/assets/icons/tab-24/news.png")}
          selectedColor={theme.accent}
        />
        <NativeTabs.Trigger.Label selectedStyle={{ color: theme.accent }}>
          {newsLabel}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          src={require("@/app/assets/icons/tab-24/person.png")}
          selectedColor={theme.accent}
        />
        <NativeTabs.Trigger.Label selectedStyle={{ color: theme.accent }}>
          {profileLabel}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
