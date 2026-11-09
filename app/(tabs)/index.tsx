import React, { useCallback, useMemo, useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import ThemedText from "@/app/components/ui/ThemedText";
import CrossfadeHero from "@/app/components/ui/CrossfadeHero";
import TransportArt from "@/app/components/ui/TransportArt";
import { HERO_SLIDES } from "@/app/lib/tripImagery";
import PressableScale from "@/app/components/ui/PressableScale";
import SectionHeader from "@/app/components/ui/SectionHeader";
import DirectionCard from "@/app/components/trips/DirectionCard";
import NextDepartureCard from "@/app/components/trips/NextDepartureCard";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { DIRECTION_CARDS } from "@/app/lib/routes";
import {
  useAnnouncements,
  useDirectionDepartures,
  useNextDeparture,
} from "@/app/hooks/useAppData";
import { useLiveActivitySync } from "@/app/hooks/useLiveActivitySync";
import { useNotifications } from "@/app/context/NotificationContext";

export default function HomeScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = Math.min(460, Math.max(390, windowHeight * 0.48));
  // On iOS the native tab screen is already inset by the status bar, which
  // left a canvas strip above the hero. Pull the hero up by that inset and
  // give it the same extra height so the image runs edge-to-edge under the
  // status bar, exactly as it does on Android.
  const heroTopOverlap = Platform.OS === "ios" ? insets.top : 0;

  const [heroAtTop, setHeroAtTop] = useState(true);

  const { data: nextTrip, loading: nextTripLoading, error: nextTripError } = useNextDeparture();
  const { data: directionTrips } = useDirectionDepartures();
  const { data: announcements } = useAnnouncements(3);

  useLiveActivitySync(nextTrip ?? null, !nextTripLoading && !nextTripError);

  const { notifications } = useNotifications();
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const onRefresh = useCallback(() => {
    router.replace("/");
  }, [router]);

  const latestAnnouncement = announcements[0];

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={heroAtTop || resolvedTheme === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        // iOS otherwise inserts the status-bar safe area above the scroll
        // content, which showed as a white strip above the hero. The hero is
        // designed to run under the status bar on both platforms.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        scrollEventThrottle={100}
        onScroll={(event) => {
          const showingHero = event.nativeEvent.contentOffset.y < heroHeight - insets.top - 52;
          setHeroAtTop((current) => current === showingHero ? current : showingHero);
        }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={theme.textTertiary}
          />
        }
      >
        <Animated.View
          entering={FadeIn.duration(360)}
          style={{
            height: heroHeight + heroTopOverlap,
            marginTop: -heroTopOverlap,
            backgroundColor: theme.surfaceInverse,
          }}
        >
          <TransportArt vehicle="hero" fill style={StyleSheet.absoluteFill} />
          <CrossfadeHero images={HERO_SLIDES} intervalMs={9000} fadeMs={2000} />
          <LinearGradient
            colors={["rgba(5, 12, 24, 0.58)", "rgba(5, 12, 24, 0.08)", "rgba(5, 12, 24, 0.76)"]}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={{ flex: 1, justifyContent: "space-between", paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 48 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                  <Image source={require("@/app/assets/logo-transparent.png")} style={{ width: 38, height: 38 }} contentFit="contain" alt="Tunisiska Mega" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="headline" numberOfLines={1} translate={false} style={{ color: "#FFFFFF", fontWeight: "800" }}>Tunisiska Mega</ThemedText>
                  <ThemedText variant="caption" numberOfLines={1} translate={false} style={{ color: "rgba(255,255,255,0.78)" }}>Transport</ThemedText>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <PressableScale
                  onPress={() => router.push("/services")}
                  accessibilityRole="button"
                  accessibilityLabel="Browse services"
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" }}
                  haptic="light"
                >
                  <AppIcon name="grid-outline" size={19} color="#FFFFFF" />
                </PressableScale>
                <PressableScale
                  onPress={() => router.push("/(home)/notification")}
                  accessibilityRole="button"
                  accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" }}
                  haptic="light"
                >
                  <AppIcon name="notifications-outline" size={20} color="#FFFFFF" />
                  {unreadCount > 0 ? <View style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} /> : null}
                </PressableScale>
              </View>
            </View>

            <ThemedText variant="display" style={{ maxWidth: 360, color: "#FFFFFF", fontSize: 34, lineHeight: 39, letterSpacing: -0.8, fontWeight: "800" }}>
              Your transport between Sweden and Tunisia
            </ThemedText>
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: 20, marginTop: -26, zIndex: 2 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {DIRECTION_CARDS.map((card) => (
              <View key={card.key} style={{ flex: 1 }}>
                <DirectionCard
                  title={card.title}
                  target={card.target}
                  country={card.country}
                  nextTrip={directionTrips[card.key]}
                  onPress={() => router.push({ pathname: "/(tabs)/trips", params: { direction: card.key } })}
                />
              </View>
            ))}
          </View>
          <View style={{ marginTop: 12 }}>
            <NextDepartureCard
              trip={nextTrip}
              loading={nextTripLoading}
              onPress={() => router.push(nextTrip ? `/(home)/trips/${nextTrip.id}` : "/(home)/trips/calendar")}
            />
          </View>
        </View>

        <View className="px-5 pt-7">
          <SectionHeader title="Explore Tunisiska" subtitle="Plan a trip or find something useful" />
          <View className="flex-row" style={{ gap: 10 }}>
            {[
              { title: "Services", subtitle: "Shipping and more", icon: "grid-outline" as const, route: "/services" },
              { title: "All departures", subtitle: "Browse the schedule", icon: "calendar-outline" as const, route: "/(tabs)/trips" },
              { title: "Latest news", subtitle: "Updates from us", icon: "newspaper-outline" as const, route: "/(tabs)/news" },
            ].map((item) => (
              <PressableScale
                key={item.title}
                onPress={() => router.push(item.route as any)}
                accessibilityRole="button"
                haptic="light"
                style={{ flex: 1, minHeight: 108, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft }}>
                  <AppIcon name={item.icon} size={19} color={theme.primary} />
                </View>
                <ThemedText variant="caption" style={{ marginTop: 9, fontWeight: "700" }}>{item.title}</ThemedText>
                <ThemedText variant="caption" tone="tertiary" numberOfLines={2} style={{ marginTop: 3, fontSize: 10 }}>{item.subtitle}</ThemedText>
              </PressableScale>
            ))}
          </View>
          {latestAnnouncement ? (
            <PressableScale
              onPress={() => router.push("/(tabs)/news")}
              accessibilityRole="button"
              accessibilityLabel={`Latest news: ${latestAnnouncement.title}`}
              haptic="light"
              style={{ marginTop: 14, padding: 15, borderRadius: 18, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.borderSubtle }}
            >
              <ThemedText variant="overline" tone="accent">LATEST UPDATE</ThemedText>
              <ThemedText variant="headline" numberOfLines={1} style={{ marginTop: 5 }}>{latestAnnouncement.title}</ThemedText>
              <ThemedText variant="caption" tone="secondary" numberOfLines={2} style={{ marginTop: 4 }}>{latestAnnouncement.message}</ThemedText>
            </PressableScale>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
