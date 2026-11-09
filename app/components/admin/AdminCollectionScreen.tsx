import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { AdminDataList } from "@/app/components/admin/AdminDataList";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

type CollectionKey = "users" | "shipping-orders" | "taxi-orders" | "announcements";

const collections = {
  users: {
    title: "Users",
    subtitle: "Manage registered accounts and access",
    query: '*[_type == "users"] | order(_createdAt desc)',
    searchField: "email",
    columns: [
      { key: "userName", label: "Name" },
      { key: "email", label: "Email" },
      { key: "isAdmin", label: "Admin", type: "status" as const },
      { key: "isDriver", label: "Driver", type: "status" as const },
      { key: "_createdAt", label: "Created", type: "date" as const },
    ],
  },
  "shipping-orders": {
    title: "Shipping orders",
    subtitle: "Review and manage deliveries",
    query: '*[_type == "shippingOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, totalPrice } | order(scheduledDateTime desc)',
    searchField: "customerName",
    columns: [
      { key: "customerName", label: "Customer" },
      { key: "status", label: "Status", type: "status" as const },
      { key: "totalPrice", label: "Price", type: "currency" as const },
      { key: "scheduledDateTime", label: "Date", type: "date" as const },
    ],
  },
  "taxi-orders": {
    title: "Taxi bookings",
    subtitle: "Review and manage taxi journeys",
    query: '*[_type == "taxiOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, totalPrice } | order(scheduledDateTime desc)',
    searchField: "customerName",
    columns: [
      { key: "customerName", label: "Customer" },
      { key: "status", label: "Status", type: "status" as const },
      { key: "totalPrice", label: "Price", type: "currency" as const },
      { key: "scheduledDateTime", label: "Date", type: "date" as const },
    ],
  },
  announcements: {
    title: "Announcements",
    subtitle: "Publish updates and offers",
    query: '*[_type == "announcement"] | order(date desc)',
    searchField: "title",
    columns: [
      { key: "title", label: "Title" },
      { key: "message", label: "Message" },
      { key: "date", label: "Date", type: "date" as const },
    ],
  },
} satisfies Record<CollectionKey, {
  title: string;
  subtitle: string;
  query: string;
  searchField: string;
  columns: Array<{ key: string; label: string; type?: "text" | "date" | "status" | "currency" | "image" }>;
}>;

export default function AdminCollectionScreen({ type }: { type: CollectionKey }) {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const config = collections[type];
  const { language } = useLanguage();
  const addRecordLabel = useTranslationText("Add record", language);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader
        title={config.title}
        subtitle={config.subtitle}
        showBack
        rightIcon="add"
        rightAccessibilityLabel={addRecordLabel || "Add record"}
        onRightPress={() => router.push(`/profile/admin-form?type=${type}&id=new` as any)}
      />
      <AdminDataList
        title={config.title}
        query={config.query}
        columns={config.columns}
        searchField={config.searchField}
        onItemPress={(item) => router.push(`/profile/admin-form?type=${type}&id=${encodeURIComponent(item._id)}` as any)}
      />
    </SafeAreaView>
  );
}
