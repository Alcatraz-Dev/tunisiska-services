import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin-dashboard" />
      <Stack.Screen name="admin-manage" />
      <Stack.Screen name="admin-form" />
      <Stack.Screen name="admin-history" />
      <Stack.Screen name="admin-notifications/index" />
      <Stack.Screen name="admin-backup/index" />
    </Stack>
  );
}