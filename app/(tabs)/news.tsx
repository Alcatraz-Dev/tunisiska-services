import React, { useCallback } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import ThemedText from "@/app/components/ui/ThemedText";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import PressableScale from "@/app/components/ui/PressableScale";
import EmptyState from "@/app/components/ui/EmptyState";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import Skeleton from "@/app/components/ui/Skeleton";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { stagger } from "@/app/theme/motion";
import { useAnnouncements } from "@/app/hooks/useAppData";
import { currentDateLocale, formatRelativeTime } from "@/app/lib/time";
import type { Announcement } from "@/app/services/announcementService";
import { useLanguage } from "@/app/hooks/useLanguage";

/**
 * News & Updates.
 *
 * Reads the real `announcement` documents. Announcements an administrator marks
 * as important carry the "Important" label; drafts never appear.
 */
export default function NewsScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const { data: announcements, loading, error, refresh } = useAnnouncements();

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScreenHeader
        title="News"
        subtitle="The latest from Tunisiska"
        showBack
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={theme.textTertiary}
          />
        }
      >
        {loading && announcements.length === 0 ? (
          <View style={{ gap: spacing.md }}>
            <View style={[styles.card, styles.featureSkeleton, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }, shadows.sm]}>
              <Skeleton height={204} radius={0} />
              <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                <Skeleton width="68%" height={18} radius={9} />
                <Skeleton width="94%" height={11} radius={6} />
                <Skeleton width="46%" height={11} radius={6} />
              </View>
            </View>
            <View style={[styles.card, styles.compact, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }, shadows.sm]}>
              <Skeleton width={40} height={40} radius={12} />
              <View style={{ flex: 1, gap: spacing.sm, paddingTop: 2 }}>
                <Skeleton width="54%" height={15} radius={8} />
                <Skeleton width="90%" height={11} radius={6} />
              </View>
            </View>
          </View>
        ) : error && announcements.length === 0 ? (
          <Animated.View entering={FadeIn.duration(260)} style={{ flex: 1 }}>
            <EmptyState
              icon="cloud-offline-outline"
              title="Kunde inte ladda nyheter"
              description="Kontrollera din anslutning och försök igen."
              action={<PrimaryButton label="Försök igen" onPress={refresh} fullWidth={false} />}
              style={{ flex: 1 }}
            />
          </Animated.View>
        ) : announcements.length === 0 ? (
          <Animated.View entering={FadeIn.duration(260)}>
            <EmptyState
              icon="newspaper-outline"
              title="Inga nyheter ännu"
              description="Företagsuppdateringar, nya avgångar och kampanjer visas här."
              style={{ flex: 1 }}
            />
          </Animated.View>
        ) : (
          announcements.map((item, index) => {
            const hasMedia = Boolean(item.media?.imageUrl || item.media?.videoUrl);
            return (
              <Animated.View
                key={item.id || item.slug}
                entering={FadeInDown.delay(Math.min(index, 6) * stagger.step).duration(360)}
              >
                <NewsCard
                  item={item}
                  featured={hasMedia}
                  onPress={() => router.push(`/(home)/announcements/${item.slug}`)}
                />
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * One announcement, rendered as a featured image card or a compact icon card.
 *
 * The reference shows the lead story large, with its cover photograph and an
 * "Important" marker, and the rest as compact rows led by a category icon — so
 * the feed scans top-to-bottom rather than reading as a uniform grid.
 */
function NewsCard({
  item,
  featured,
  onPress,
}: {
  item: Announcement;
  featured: boolean;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const summary = item.message?.trim() || item.description?.trim() || "";
  const important = item.isImportant;
  const iconName = (item.icon as keyof typeof Ionicons.glyphMap) || "newspaper-outline";
  const iconBg = important ? theme.accentSoft : theme.primarySoft;
  const iconColor = important ? theme.accent : theme.primary;

  const isGenericTitle =
    !item.title ||
    item.title === "Nytt foto" ||
    item.title === "Ny video" ||
    item.title === "Bild-uppdatering" ||
    item.title === "Video-uppdatering";
  const hasText = summary.length > 0 || !isGenericTitle;
  const hasVideo = item.media?.type === "video" || Boolean(item.media?.videoUrl);
  const mediaUri = item.media?.imageUrl || item.media?.videoUrl;

  const timestamp = item.publishedAt ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: hasText ? 10 : 0,
      }}
    >
      <AppIcon name="time-outline" size={13} color={theme.textTertiary} />
      <ThemedText variant="footnote" tone="tertiary" translate={false}>
        {formatRelativeTime(item.publishedAt, new Date(), currentDateLocale(language))}
      </ThemedText>
    </View>
  ) : null;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      haptic="light"
      pressedScale={0.98}
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
        shadows.md,
      ]}
    >
      {featured && mediaUri ? (
        <>
          <View style={{ position: "relative", backgroundColor: "#0a0a0a" }}>
            {item.media?.imageUrl ? (
              <Image
                source={{ uri: item.media.imageUrl }}
                style={styles.media}
                resizeMode={hasText ? "cover" : "contain"}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={[styles.media, { alignItems: "center", justifyContent: "center", backgroundColor: "#111827" }]}>
                <AppIcon name="videocam" size={48} color={theme.primary} />
              </View>
            )}

            {hasVideo && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.25)",
                  },
                ]}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: "rgba(0,0,0,0.65)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: "rgba(255,255,255,0.7)",
                  }}
                >
                  <AppIcon name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </View>
              </View>
            )}

            <LinearGradient
              pointerEvents="none"
              colors={["transparent", "rgba(6,16,31,0.65)"]}
              locations={[0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Badges on top of media */}
            <View
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                right: 12,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {important ? (
                <View style={[styles.importantBadge, { backgroundColor: theme.accent }]}>
                  <AppIcon name="alert-circle" size={13} color="#FFFFFF" />
                  <ThemedText variant="overline" style={{ color: "#FFFFFF", marginLeft: 4 }}>
                    Viktigt
                  </ThemedText>
                </View>
              ) : <View />}

              {item.icon === "logo-whatsapp" ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    gap: 4,
                  }}
                >
                  <AppIcon name="logo-whatsapp" size={14} color="#25D366" />
                  <ThemedText variant="caption" style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                    WhatsApp
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* If no custom text, overlay timestamp inside media so card looks complete */}
            {!hasText && item.publishedAt ? (
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 14,
                  right: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <AppIcon name="time-outline" size={13} color="rgba(255,255,255,0.9)" />
                  <ThemedText variant="footnote" style={{ color: "rgba(255,255,255,0.9)" }} translate={false}>
                    {formatRelativeTime(item.publishedAt, new Date(), currentDateLocale(language))}
                  </ThemedText>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <ThemedText variant="caption" style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" }}>
                    Visa
                  </ThemedText>
                  <AppIcon name="chevron-forward" size={13} color="rgba(255,255,255,0.8)" />
                </View>
              </View>
            ) : null}
          </View>

          {hasText ? (
            <View style={styles.body}>
              {!isGenericTitle ? (
                <ThemedText variant="title3" numberOfLines={2} style={{ lineHeight: 26, fontWeight: "700" }}>
                  {item.title}
                </ThemedText>
              ) : null}
              {summary ? (
                <ThemedText
                  variant="bodySm"
                  tone="secondary"
                  numberOfLines={3}
                  style={{ marginTop: !isGenericTitle ? 6 : 0 }}
                >
                  {summary}
                </ThemedText>
              ) : null}
              {timestamp}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.compact}>
          <View style={[styles.compactIcon, { backgroundColor: iconBg }]}>
            <AppIcon name={iconName} size={19} color={iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline" numberOfLines={1}>
              {item.title}
            </ThemedText>
            {summary ? (
              <ThemedText
                variant="bodySm"
                tone="secondary"
                numberOfLines={2}
                style={{ marginTop: 4 }}
              >
                {summary}
              </ThemedText>
            ) : null}
            {timestamp}
          </View>
          <AppIcon name="chevron-forward" size={17} color={theme.textTertiary} />
        </View>
      )}
    </PressableScale>
  );
}

/**
 * Built through getters on purpose: Expo Router 58 loads route modules through
 * an async module registry on the server, so imported token modules can still be
 * empty objects while a route's module body runs. Reading `spacing`/`radii` at
 * module scope would throw during static rendering; reading them on first style
 * access happens after the registry has settled.
 */
const styles = {
  get list() {
    return {
      flexGrow: 1,
      paddingHorizontal: spacing.gutter,
      paddingBottom: 120,
      gap: spacing.md,
    };
  },
  get card() {
    return {
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: "hidden" as const,
    };
  },
  get media() {
    return {
      width: "100%" as const,
      height: 240,
      backgroundColor: "#0d1117",
    };
  },
  get importantBadge() {
    return {
      position: "absolute" as const,
      bottom: 14,
      left: 12,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.pill,
    };
  },
  get body() {
    return {
      padding: spacing.lg,
    };
  },
  get compact() {
    return {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 14,
      padding: spacing.lg,
    };
  },
  get compactIcon() {
    return {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    };
  },
  get featureSkeleton() {
    return {
      width: "100%" as const,
    };
  },
};
