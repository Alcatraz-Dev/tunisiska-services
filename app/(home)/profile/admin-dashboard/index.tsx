import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AsyncStorageModule = typeof AsyncStorage;

function isAsyncStorageSafe(module: any): module is AsyncStorageModule {
  return typeof module?.getItem === "function" && typeof module?.setItem === "function" && typeof module?.removeItem === "function";
}
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import AppIcon from "@/app/components/ui/AppIcon";
import Badge from "@/app/components/ui/Badge";
import IconButton from "@/app/components/ui/IconButton";
import PressableScale from "@/app/components/ui/PressableScale";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import SectionHeader from "@/app/components/ui/SectionHeader";
import Skeleton from "@/app/components/ui/Skeleton";
import ThemedText from "@/app/components/ui/ThemedText";
import { client } from "@/sanityClient";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { currentDateLocale } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

type DashboardStats = { trips: number; shipments: number; customers: number; announcements: number; pending: number };
type ActivityRecord = { _id: string; _type: string; customerName?: string; status?: string; route?: string; _createdAt?: string };

const INITIAL_STATS: DashboardStats = { trips: 0, shipments: 0, customers: 0, announcements: 0, pending: 0 };
const COLLECTIONS = [
  { title: "Trip schedules", subtitle: "Departures and capacity", icon: "calendar-outline" as const, type: "shipping-schedules" },
  { title: "Shipment orders", subtitle: "Customer shipments", icon: "cube-outline" as const, type: "shipping-orders" },
  { title: "Customers", subtitle: "Accounts and access", icon: "people-outline" as const, type: "users" },
  { title: "Announcements", subtitle: "Published company news", icon: "megaphone-outline" as const, type: "announcements" },
];

// Dedicated admin screens. They are real routes, so they need an entry here to
// be reachable at all; the quick access list above only opens the generic
// collection editor.
const ADMIN_SCREENS = [
  { title: "Shipping orders", subtitle: "Every shipment booking", icon: "cube-outline" as const, route: "/(home)/profile/admin-shipping-orders" },
  { title: "Taxi orders", subtitle: "Airport transfer requests", icon: "car-outline" as const, route: "/(home)/profile/admin-taxi-orders" },
  { title: "Customers", subtitle: "Accounts and access", icon: "people-outline" as const, route: "/(home)/profile/admin-users" },
  { title: "Announcements", subtitle: "Published company news", icon: "megaphone-outline" as const, route: "/(home)/profile/admin-announcements" },
  { title: "Notification history", subtitle: "Everything that was sent", icon: "time-outline" as const, route: "/(home)/profile/admin-history" },
  { title: "Data backup", subtitle: "Export the Sanity dataset", icon: "cloud-download-outline" as const, route: "/(home)/profile/admin-backup" },
];

function metricTitle(type: string) {
  if (type === "shippingSchedule" || type === "containerShippingSchedule") return "Schedule updated";
  if (type === "announcement") return "Announcement published";
  if (type === "users") return "Customer account created";
  if (type === "taxiOrder") return "Taxi request received";
  return "New shipment booking";
}

function metricIcon(type: string) {
  if (type.toLowerCase().includes("schedule")) return "calendar-outline";
  if (type === "announcement") return "megaphone-outline";
  if (type === "users") return "person-outline";
  return "cube-outline";
}

export default function AdminDashboard() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const clearOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("hasSeenOnboarding");
    } catch (error) {
      console.warn("Error clearing onboarding flag:", error);
    }
  }, []);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const { language } = useLanguage();
  const openNotificationsLabel = useTranslationText("Open notifications", language);
  const pendingUnit = useTranslationText("pending", language);
  const allCaughtUpText = useTranslationText("All caught up", language);
  const openWord = useTranslationText("Open", language);

  const load = useCallback(async (refresh = false) => {
    setError(false);
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [trips, shipments, customers, announcements, pending, recent] = await Promise.all([
        client.fetch('count(*[_type in ["shippingSchedule", "containerShippingSchedule"]])'),
        client.fetch('count(*[_type in ["shippingOrder", "taxiOrder", "containerShippingOrder", "moveOrder", "moveCleaningOrder"]])'),
        client.fetch('count(*[_type == "users"])'),
        client.fetch('count(*[_type == "announcement"])'),
        client.fetch('count(*[_type in ["shippingOrder", "taxiOrder", "containerShippingOrder", "moveOrder", "moveCleaningOrder"] && status == "pending"])'),
        client.fetch('*[_type in ["shippingSchedule", "containerShippingSchedule", "shippingOrder", "taxiOrder", "announcement"]] | order(_createdAt desc)[0...4] { _id, _type, status, _createdAt, "customerName": coalesce(customerInfo.name, customer.name, title), "route": route }'),
      ]);
      setStats({ trips: trips || 0, shipments: shipments || 0, customers: customers || 0, announcements: announcements || 0, pending: pending || 0 });
      setActivity(Array.isArray(recent) ? recent : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = [
    { label: "Trips", value: stats.trips, icon: "calendar-outline" as const },
    { label: "Shipments", value: stats.shipments, icon: "cube-outline" as const },
    { label: "Customers", value: stats.customers, icon: "people-outline" as const },
    { label: "Announcements", value: stats.announcements, icon: "megaphone-outline" as const },
  ];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader
        title="Operations"
        subtitle="Manage the transport service"
        showBack
        right={<IconButton icon="notifications-outline" onPress={() => router.push("/(home)/profile/admin-notifications" as any)} accessibilityLabel={openNotificationsLabel || "Open notifications"} surface />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 64 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <ThemedText variant="overline" tone="secondary">ADMIN OVERVIEW</ThemedText>
            <ThemedText variant="title1" style={{ marginTop: 4 }}>Good morning</ThemedText>
            <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: 3 }}>Manage trips, customers and service requests.</ThemedText>
          </View>
          <Badge label={stats.pending ? `${stats.pending} ${pendingUnit || "pending"}` : allCaughtUpText || "All caught up"} tone={stats.pending ? "warning" : "success"} translate={false} />
        </View>

        {error ? (
          <PressableScale onPress={() => void load()} accessibilityRole="button" haptic="light" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, marginBottom: spacing.md, borderRadius: radii.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
            <AppIcon name="refresh-outline" size={18} color={theme.primary} />
            <ThemedText variant="bodySm" tone="secondary" style={{ flex: 1 }}>Dashboard data could not load. Tap to retry.</ThemedText>
          </PressableScale>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {metrics.map((metric) => (
            <View key={metric.label} style={{ width: "48.5%", minHeight: 104, justifyContent: "space-between", padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface, ...shadows.sm }}>
              <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: theme.primarySoft }}>
                <AppIcon name={metric.icon} size={18} color={theme.primary} />
              </View>
              <View style={{ marginTop: spacing.sm }}>
                <ThemedText variant="title2">{loading ? "—" : metric.value.toLocaleString(currentDateLocale())}</ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>{metric.label}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Recent activity" subtitle="Latest updates" />
          <View style={{ paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface, ...shadows.sm }}>
            {loading ? [0, 1, 2].map((item) => <View key={item} style={{ height: 62, justifyContent: "center", borderBottomWidth: item < 2 ? 1 : 0, borderColor: theme.separator }}><Skeleton height={12} width="68%" radius={6} /><Skeleton height={9} width="42%" radius={5} style={{ marginTop: 7 }} /></View>) : activity.length ? activity.map((item, index) => (
              <View key={item._id} style={{ minHeight: 66, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: index < activity.length - 1 ? 1 : 0, borderColor: theme.separator }}>
                <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.primarySoft }}>
                  <AppIcon name={metricIcon(item._type)} size={17} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySm" style={{ fontWeight: "700" }}>{metricTitle(item._type)}</ThemedText>
                  <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                    {item.route || item.customerName || item.status || "Operations update"}
                  </ThemedText>
                </View>
                <ThemedText variant="caption" tone="tertiary">{item._createdAt ? new Date(item._createdAt).toLocaleTimeString(currentDateLocale(), { hour: "2-digit", minute: "2-digit" }) : "—"}</ThemedText>
              </View>
            )) : <View style={{ paddingVertical: spacing.xl, alignItems: "center" }}><ThemedText variant="bodySm" tone="secondary">No recent activity yet</ThemedText></View>}
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Automation" subtitle="Publish without the CMS" />
          <PressableScale
            onPress={() => router.push("/(home)/profile/admin-whatsapp" as any)}
            accessibilityRole="button"
            accessibilityLabel="WhatsApp gateway"
            haptic="light"
            style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft }}><AppIcon name="logo-whatsapp" size={20} color={theme.primary} /></View>
            <View style={{ flex: 1 }}><ThemedText variant="headline">WhatsApp gateway</ThemedText><ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>Photos and videos become news</ThemedText></View>
            <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
          </PressableScale>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Debug" subtitle="Testing helpers" />
          <PressableScale
            onPress={async () => {
              if (!isAsyncStorageSafe(AsyncStorage)) {
                console.warn("AsyncStorage not ready; cannot reset onboarding");
                return;
              }
              await AsyncStorage.removeItem("hasSeenOnboarding");
              router.replace("/onboarding");
            }}
            accessibilityRole="button"
            haptic="light"
            style={{ minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface }}
          >
            <AppIcon name="refresh-outline" size={19} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline">Reset onboarding</ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>Clear the welcoming screen flag so it shows again on next launch.</ThemedText>
            </View>
            <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
          </PressableScale>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Quick access" subtitle="Common admin tasks" />
          <View style={{ gap: spacing.sm }}>
            {COLLECTIONS.map((item) => (
              <PressableScale
                key={item.type}
                onPress={() => router.push(`/(home)/profile/admin-manage?type=${item.type}` as any)}
                accessibilityRole="button"
                accessibilityLabel={`${openWord || "Open"} ${item.title}`}
                haptic="light"
                style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft }}><AppIcon name={item.icon} size={19} color={theme.primary} /></View>
                <View style={{ flex: 1 }}><ThemedText variant="headline">{item.title}</ThemedText><ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>{item.subtitle}</ThemedText></View>
                <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="More tools" subtitle="Every admin screen" />
          <View style={{ gap: spacing.sm }}>
            {ADMIN_SCREENS.map((item) => (
              <PressableScale
                key={item.route}
                onPress={() => router.push(item.route as any)}
                accessibilityRole="button"
                accessibilityLabel={`${openWord || "Open"} ${item.title}`}
                haptic="light"
                style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft }}><AppIcon name={item.icon} size={19} color={theme.primary} /></View>
                <View style={{ flex: 1 }}><ThemedText variant="headline">{item.title}</ThemedText><ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>{item.subtitle}</ThemedText></View>
                <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
