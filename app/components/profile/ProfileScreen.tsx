import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useUser, useAuth } from "@clerk/clerk-expo";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { semantic, useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { stagger } from "@/app/theme/motion";
import { useNotifications } from "@/app/context/NotificationContext";
import RedirectIfSignedOut from "@/app/components/RedirectIfSignedOut";
import { showAlert } from "@/app/utils/showAlert";
import * as Clipboard from "expo-clipboard";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useAdminAccess } from "@/app/hooks/useAdminAccess";

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
  points: number;
  membershipTier: string;
};

export function getMembershipTier(points: number, lang: string = "en"): string {
  const tiers: Record<string, { en: string; sv: string; ar: string }> = {
    vip: { en: "VIP Member", sv: "Vipmedlem", ar: "عضو VIP" },
    super: { en: "Super Member", sv: "Supermedlem", ar: "عضو سوبر" },
    master: { en: "Master Member", sv: "Mastermedlem", ar: "عضو ماستر" },
    diamond: { en: "Diamond Member", sv: "Diamondmedlem", ar: "عضو الماس" },
    platinum: { en: "Platinum Member", sv: "Platinummedlem", ar: "عضو بلاتين" },
    gold: { en: "Gold Member", sv: "Goldmedlem", ar: "عضو ذهبي" },
    silver: { en: "Silver Member", sv: "Silvermedlem", ar: "عضو فضي" },
    standard: { en: "Standard Member", sv: "Standardmedlem", ar: "عضو عادي" },
  };
  const key = points >= 50000 ? "vip" : points >= 20000 ? "super" : points >= 10000 ? "master" : points >= 5000 ? "diamond" : points >= 2000 ? "platinum" : points >= 1000 ? "gold" : points >= 500 ? "silver" : "standard";
  return tiers[key][lang as "en" | "sv" | "ar"] ?? tiers[key].en;
}

export default function ProfileScreen() {
  const theme = useThemeColors();
  const { resolvedTheme, theme: themePreference } = useTheme();
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const { language } = useLanguage();
  const { signOut } = useAuth();
  const { notifications } = useNotifications();
  const { isAdmin } = useAdminAccess();

  const [data, setData] = useState<ProfileData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const load = useCallback(() => {
    if (!isLoaded || !user) return;
    const points = (user.unsafeMetadata?.points as number) || 0;
    const firstName = (user.unsafeMetadata?.firstName as string) || "";
    const lastName = (user.unsafeMetadata?.lastName as string) || "";

    setData({
      firstName,
      lastName,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      imageUrl:
        (user.unsafeMetadata?.imageUrl as string) || user.imageUrl || undefined,
      points,
      membershipTier: getMembershipTier(points, language),
    });
  }, [isLoaded, user]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName =
    data && (data.firstName || data.lastName)
      ? `${data.firstName} ${data.lastName}`.trim()
      : data?.email || "Tunisiska Mega Transport";

  const handleSignOut = useCallback(() => {
    showAlert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              router.replace("/(auth)/sign-in");
            } catch (error) {
              console.error("Failed to sign out:", error);
            }
          },
        },
      ],
    );
  }, [signOut, router]);

  const performDeleteAccount = useCallback(async () => {
    if (!user || deleting) return;
    setDeleting(true);
    try {
      // Clerk removes the signed-in account; the session is invalid afterwards.
      await user.delete();
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      console.error("Failed to delete account:", error?.message || error);
      const clerkError = error?.errors?.[0];
      await showAlert(
        "Could not delete your account",
        clerkError?.longMessage ||
          clerkError?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }, [user, deleting, router]);

  const handleDeleteAccount = useCallback(() => {
    showAlert(
      "Delete account?",
      "Deleting your account permanently removes your profile, bookings and points. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: performDeleteAccount,
        },
      ],
    );
  }, [performDeleteAccount]);

  const initials = useMemo(() => {
    const source =
      (data?.firstName?.[0] ?? "") + (data?.lastName?.[0] ?? "");
    if (source.trim()) return source.trim().toUpperCase().slice(0, 2);
    return "TT";
  }, [data]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <RedirectIfSignedOut />
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <ScreenHeader
          title="Your Profile"
          showBack
          rightIcon="settings-outline"
          onRightPress={() => router.push("/(home)/settings")}
          rightAccessibilityLabel="Account settings"
        />

        <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: 16, alignItems: "center" }}>
          <View style={{ position: "relative" }}>
            {data?.imageUrl ? (
              <Image
                source={{ uri: data.imageUrl }}
                style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 5, borderColor: theme.surface }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 46,
                  backgroundColor: theme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 5,
                  borderColor: theme.surface,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 18 },
                  shadowOpacity: 0.15,
                  shadowRadius: 34,
                }}
              >
                <ThemedText style={{ color: theme.textInverse, fontWeight: "700", fontSize: 26, letterSpacing: 1 }}>
                  {initials}
                </ThemedText>
              </View>
            )}
            <View style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accent, borderWidth: 2.5, borderColor: theme.canvas, alignItems: "center", justifyContent: "center" }}>
              <AppIcon name="cube" size={13} color={theme.textInverse} />
            </View>
          </View>
          <ThemedText style={{ marginTop: 14, fontSize: 17, fontWeight: "700", color: theme.textPrimary, letterSpacing: -0.3 }}>{displayName}</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <AppIcon name="star" size={15} color={theme.accent} />
            <ThemedText style={{ color: theme.accent, fontWeight: "600", fontSize: 12.5 }}>{data?.membershipTier ?? getMembershipTier(0, language)}</ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(380)} style={{ marginHorizontal: 20, marginTop: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, overflow: "hidden", shadowColor: theme.textPrimary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: resolvedTheme === "dark" ? 0.18 : 0.06, shadowRadius: 20 }}>
            <PressableScale onPress={() => router.push("/(home)/profile/booking")} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.separator }} haptic="light">
              <AppIcon name="cube-outline" size={19} color={theme.primary} />
              <ThemedText style={{ flex: 1, fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>My Shipments</ThemedText>
              <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
            </PressableScale>
            <PressableScale onPress={() => router.push("/trips")} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.separator }} haptic="light">
              <AppIcon name="calendar-outline" size={19} color={theme.primary} />
              <ThemedText style={{ flex: 1, fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>My Trips</ThemedText>
              <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
            </PressableScale>
            <PressableScale onPress={() => router.push("/(home)/notification")} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.separator }} haptic="light">
              <AppIcon name="notifications-outline" size={19} color={theme.primary} />
              <ThemedText style={{ flex: 1, fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>Notifications</ThemedText>
              {unreadCount > 0 && (
                <View style={{ height: 19, minWidth: 19, borderRadius: 9.5, backgroundColor: "#F2761B", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                  <ThemedText style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "600" }}>{unreadCount}</ThemedText>
                </View>
              )}
              <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
            </PressableScale>
            <PressableScale onPress={() => router.push("/(home)/profile/language")} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.separator }} haptic="light">
              <AppIcon name="language-outline" size={19} color={theme.primary} />
              <ThemedText style={{ flex: 1, fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>Language</ThemedText>
              <ThemedText style={{ fontSize: 12.5, color: theme.textTertiary }}>{language === "ar" ? "العربية" : language === "sv" ? "Svenska" : "English"}</ThemedText>
              <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
            </PressableScale>
            <PressableScale onPress={() => router.push("/(home)/profile/help-support" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15 }} haptic="light">
              <AppIcon name="headset-outline" size={19} color={theme.primary} />
              <ThemedText style={{ flex: 1, fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>Help & Support</ThemedText>
              <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(stagger.step).duration(360)} style={{ marginHorizontal: 20, marginTop: 12 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            <PressableScale onPress={() => router.push("/(home)/settings/appearance")} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.separator }} haptic="light">
              <AppIcon name="contrast-outline" size={19} color={theme.primary} />
              <ThemedText style={{ flex: 1, fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>Appearance</ThemedText>
              <ThemedText style={{ fontSize: 12.5, color: theme.textTertiary }}>{themePreference === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"}</ThemedText>
              <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
            </PressableScale>
            <PressableScale onPress={() => router.push("/(home)/profile/widget-guide" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15 }} haptic="light">
              <AppIcon name="phone-portrait-outline" size={19} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: "500", color: theme.textPrimary }}>Widgets & Dynamic Island</ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: 3 }}>Setup guide and live preview</ThemedText>
              </View>
              <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
            </PressableScale>
          </View>
        </Animated.View>

        {isAdmin ? (
          <Animated.View entering={FadeInDown.delay(stagger.step * 2).duration(360)} style={{ marginHorizontal: 20, marginTop: 12 }}>
            <PressableScale
              onPress={() => router.push("/(home)/profile/admin-dashboard" as any)}
              style={{ minHeight: 68, borderRadius: 18, backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14 }}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Open admin dashboard"
            >
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
                <AppIcon name="shield-checkmark" size={21} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="headline" style={{ color: "#FFFFFF" }}>Admin dashboard</ThemedText>
                <ThemedText variant="caption" style={{ color: "#E2E8F0", marginTop: 2 }}>Manage orders and app content</ThemedText>
              </View>
              <AppIcon name="chevron-forward" size={18} color="#FFFFFF" />
            </PressableScale>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(stagger.step * 3).duration(360)} style={{ marginHorizontal: 20, marginTop: 16 }}>
          <PressableScale onPress={handleSignOut} style={{ height: 44, borderRadius: 22, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }} haptic="light">
            <ThemedText style={{ fontSize: 13.5, fontWeight: "500", color: theme.textSecondary }}>Sign out</ThemedText>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(stagger.step * 4).duration(360)} style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 20 }}>
          <PressableScale
            onPress={deleting ? undefined : handleDeleteAccount}
            disabled={deleting}
            style={{ height: 44, borderRadius: 22, backgroundColor: semantic.danger.bg, borderWidth: 1, borderColor: semantic.danger.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, opacity: deleting ? 0.6 : 1 }}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityState={{ disabled: deleting, busy: deleting }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={semantic.danger.fg} />
            ) : (
              <AppIcon name="trash-outline" size={16} color={semantic.danger.fg} />
            )}
            <ThemedText style={{ fontSize: 13.5, fontWeight: "500", color: semantic.danger.fg }}>Delete account</ThemedText>
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
