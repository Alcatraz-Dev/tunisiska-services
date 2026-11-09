import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAdminAccess } from "@/app/hooks/useAdminAccess";
import { useThemeColors } from "@/app/theme";

const ADMIN_ROUTES = new Set([
  "admin-dashboard",
  "admin-manage",
  "admin-form",
  "admin-history",
  "admin-notifications",
  "admin-backup",
  "admin-users",
  "admin-shipping-orders",
  "admin-taxi-orders",
  "admin-announcements",
  "admin-whatsapp",
]);

export default function ProfileLayout() {
  const segments = useSegments();
  const router = useRouter();
  const colors = useThemeColors();
  const { isAdmin, loading } = useAdminAccess();
  const isAdminRoute = segments.some((segment) => ADMIN_ROUTES.has(segment));

  useEffect(() => {
    if (isAdminRoute && !loading && !isAdmin) {
      router.replace("/(tabs)/profile");
    }
  }, [isAdminRoute, loading, isAdmin, router]);

  if (isAdminRoute && loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isAdminRoute && !isAdmin) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="admin-dashboard/index" />
      <Stack.Screen name="admin-manage/index" />
      <Stack.Screen name="admin-form/index" />
      <Stack.Screen name="admin-history" />
      <Stack.Screen name="admin-notifications/index" />
      <Stack.Screen name="admin-backup/index" />
      <Stack.Screen name="admin-whatsapp/index" />
    </Stack>
  );
}
