import React, { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import SectionHeader from "@/app/components/ui/SectionHeader";
import EmptyState from "@/app/components/ui/EmptyState";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { stagger } from "@/app/theme/motion";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText, translateNow } from "@/app/hooks/useTranslation";

type Service = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  category: string;
};

type ServiceCategory = {
  /** Stable filter id, never shown or translated. */
  id: string;
  /** English source label, translated at render time. */
  label: string;
};

/**
 * The catalogue.
 *
 * These are the services the app already exposes — carried over from the
 * previous Home screen so nothing was dropped in the redesign.
 */
const SERVICES: Service[] = [
  {
    id: "1",
    title: "Shipping Sweden & Tunisia",
    description:
      "Fast and secure shipping of packages between Sweden and Tunisia.",
    icon: "cube-outline",
    route: "/(home)/services/shipping",
    category: "transport",
  },
  {
    id: "2",
    title: "Container shipping",
    description:
      "Book large containers for shipping between Sweden and Tunisia.",
    icon: "boat-outline",
    route: "/(home)/services/container-shipping",
    category: "transport",
  },
  {
    id: "3",
    title: "Moving & cleaning help",
    description: "Book professional moving and cleaning together.",
    icon: "construct-outline",
    route: "/(home)/services/move-cleaning",
    category: "cleaning-moving",
  },
  {
    id: "4",
    title: "Moving without cleaning",
    description: "Simple moving help for furniture and belongings.",
    icon: "cube",
    route: "/(home)/services/move",
    category: "moving",
  },
  {
    id: "5",
    title: "Taxi to the airport",
    description: "Book transport to and from airports.",
    icon: "car-outline",
    route: "/(home)/services/taxi",
    category: "airport-taxi",
  },
];

const CATEGORIES: ServiceCategory[] = [
  { id: "all", label: "All" },
  { id: "transport", label: "Transport" },
  { id: "cleaning-moving", label: "Cleaning & Moving" },
  { id: "moving", label: "Moving" },
  { id: "airport-taxi", label: "Airport taxi" },
];

const TOOLS = [
  { icon: "wallet-outline" as const, title: "Wallet & points", href: "/(home)/profile/wallet" },
  { icon: "map-outline" as const, title: "Map", href: "/(home)/map/overview" },
  { icon: "pulse-outline" as const, title: "Live status", href: "/(home)/liveStatus" },
];

/**
 * The Services hub.
 *
 * A searchable catalogue of every service the company offers, plus the
 * supporting tools. This replaces the placeholder that previously sat in the
 * tab bar and carries over the search and category filtering from the
 * previous Home screen.
 */
export default function ServicesScreen() {
  const styles = createStyles();
  const theme = useThemeColors();
  const { language } = useLanguage();
  const searchPlaceholder = useTranslationText("Search services", language);
  const clearSearchLabel = useTranslationText("Clear search", language);
  const backLabel = useTranslationText("Back", language);
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((service) => {
      // Match both the English source and the language the user is reading.
      const haystack = [
        service.title,
        service.description,
        translateNow(service.title, language),
        translateNow(service.description, language),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = q.length === 0 || haystack.includes(q);
      const matchesCategory =
        category === "all" || service.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category, language]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          {router.canGoBack() ? (
            <PressableScale
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              haptic="light"
              style={[
                styles.backButton,
                { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
              ]}
            >
              <AppIcon name="chevron-back" size={20} color={theme.textPrimary} />
            </PressableScale>
          ) : null}
          <View style={{ flex: 1 }}>
            <ThemedText variant="title1">Services</ThemedText>
            <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              Everything we offer, in one place
            </ThemedText>
          </View>
        </View>
      </View>

      {/* ── Search ────────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchField,
            { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
          ]}
        >
          <AppIcon name="search" size={18} color={theme.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.textQuaternary}
            accessibilityLabel={searchPlaceholder}
            returnKeyType="search"
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
          {query.length > 0 ? (
            <PressableScale
              onPress={() => setQuery("")}
              accessibilityRole="button"
              accessibilityLabel={clearSearchLabel}
              haptic="selection"
            >
              <AppIcon name="close-circle" size={18} color={theme.textTertiary} />
            </PressableScale>
          ) : null}
        </View>
      </View>

      {/* ── Categories ────────────────────────────────────────────── */}
      <View style={styles.categoryWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((item) => {
            const active = category === item.id;
            const label = translateNow(item.label, language);
            return (
              <PressableScale
                key={item.id}
                onPress={() => setCategory(item.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
                haptic="selection"
                pressedScale={0.97}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                ]}
              >
                <ThemedText
                  variant="caption"
                  translate={false}
                  style={{ color: active ? "#FFFFFF" : theme.textSecondary }}
                >
                  {label}
                </ThemedText>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.gutter,
          paddingBottom: 120,
        }}
      >
        <Animated.View entering={FadeIn.duration(300)}>
          <SectionHeader
            title="Book a service"
            subtitle={`${filtered.length} ${filtered.length === 1 ? "service" : "services"}`}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="No services found"
              description="Try a different search term or category."
            />
          ) : (
            <View style={{ gap: spacing.md }}>
              {filtered.map((service, index) => (
                <Animated.View
                  key={service.id}
                  entering={FadeInDown.delay(index * stagger.step).duration(360)}
                >
                  <PressableScale
                    onPress={() => router.push(service.route as any)}
                    accessibilityRole="button"
                    accessibilityLabel={service.title}
                    haptic="light"
                    pressedScale={0.98}
                    style={[
                      styles.serviceCard,
                      { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                      shadows.sm,
                    ]}
                  >
                    <View
                      style={[styles.serviceIcon, { backgroundColor: theme.primarySoft }]}
                    >
                      <AppIcon name={service.icon} size={22} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="title3">{service.title}</ThemedText>
                      <ThemedText
                        variant="bodySm"
                        tone="secondary"
                        style={{ marginTop: 2 }}
                      >
                        {service.description}
                      </ThemedText>
                    </View>
                    <AppIcon
                      name="chevron-forward"
                      size={18}
                      color={theme.textQuaternary}
                    />
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(stagger.step * 6).duration(360)}
          style={{ marginTop: spacing.xxl }}
        >
          <SectionHeader title="Tools" />
          <View style={{ gap: spacing.md }}>
            {TOOLS.map((tool) => (
              <PressableScale
                key={tool.href}
                onPress={() => router.push(tool.href as any)}
                accessibilityRole="button"
                accessibilityLabel={tool.title}
                haptic="selection"
                pressedScale={0.98}
                style={[
                  styles.toolRow,
                  { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                  shadows.sm,
                ]}
              >
                <AppIcon name={tool.icon} size={20} color={theme.textSecondary} />
                <ThemedText variant="body" style={{ flex: 1, marginLeft: spacing.md }}>
                  {tool.title}
                </ThemedText>
                <AppIcon
                  name="chevron-forward"
                  size={17}
                  color={theme.textQuaternary}
                />
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Built on first render, not at module scope: Expo Router 58 evaluates route
 * modules through an async registry on the server, so imported token modules can
 * still be empty while the module body runs. Reading `spacing`/`radii` eagerly
 * throws during static rendering.
 */
const createStyles = () => ({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  header: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  searchWrap: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.md,
  },
  searchField: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  categoryWrap: {
    paddingBottom: spacing.md,
  },
  categoryRow: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  serviceCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  serviceIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  toolRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
