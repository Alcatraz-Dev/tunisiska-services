import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppIcon from "@/app/components/ui/AppIcon";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { client } from "@/sanityClient";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { AutoText } from "@/app/components/ui/AutoText";
import { AdminDataList } from "@/app/components/admin/AdminDataList";
import { useThemeColors } from "@/app/theme";
import { showAlert } from "@/app/utils/showAlert";

interface Column {
  key: string;
  label: string;
  type?: "text" | "date" | "status" | "currency" | "image";
}

const getEntityConfig = (entityType: string) => {
  switch (entityType) {
    case "users":
      return {
        title: "Användare",
        subtitle: "Hantera alla registrerade brukare",
        query: '*[_type == "users"] | order(_createdAt desc)',
        columns: [
          { key: "email", label: "Email" },
          { key: "clerkId", label: "Clerk ID" },
          { key: "isAdmin", label: "Admin", type: "status" as const },
          { key: "_createdAt", label: "Skapad", type: "date" as const },
        ],
        searchField: "email",
        canAdd: true,
        docType: "users",
      };
    case "shipping-orders":
      return {
        title: "Sändningar",
        subtitle: "Hantera logistik och frakt",
        query: '*[_type == "shippingOrder"] | order(_createdAt desc)',
        columns: [
          { key: "_id", label: "ID" },
          { key: "status", label: "Status", type: "status" as const },
          { key: "totalPrice", label: "Pris", type: "currency" as const },
          { key: "_createdAt", label: "Datum", type: "date" as const },
        ],
        searchField: "_id",
        canAdd: true,
        docType: "shippingOrder",
      };
    case "container-shipping-orders":
      return {
        title: "Container Bokningar",
        subtitle: "Större fraktuppdrag",
        query: '*[_type == "containerShippingOrder"] | order(_createdAt desc)',
        columns: [
          { key: "_id", label: "ID" },
          { key: "status", label: "Status", type: "status" as const },
          { key: "totalPrice", label: "Pris", type: "currency" as const },
          { key: "_createdAt", label: "Datum", type: "date" as const },
        ],
        searchField: "_id",
        canAdd: true,
        docType: "containerShippingOrder",
      };
    case "taxi-orders":
      return {
        title: "Taxibokningar",
        subtitle: "Övervaka och hantera taxiresor",
        query: '*[_type == "taxiOrder"] | order(_createdAt desc)',
        columns: [
          { key: "_id", label: "ID" },
          { key: "status", label: "Status", type: "status" as const },
          { key: "_createdAt", label: "Datum", type: "date" as const },
        ],
        searchField: "_id",
        canAdd: true,
        docType: "taxiOrder",
      };
    case "move-orders":
      return {
        title: "Flyttordrar",
        subtitle: "Hantera flyttbeställningar",
        query: '*[_type == "moveOrder"] | order(_createdAt desc)',
        columns: [
          { key: "_id", label: "ID" },
          { key: "status", label: "Status", type: "status" as const },
          { key: "_createdAt", label: "Datum", type: "date" as const },
        ],
        searchField: "_id",
        canAdd: true,
        docType: "moveOrder",
      };
    case "announcements":
      return {
        title: "Annonser",
        subtitle: "Dela nyheter och erbjudanden",
        query: '*[_type == "announcement"] | order(_createdAt desc)',
        columns: [
          { key: "title", label: "Titel" },
          { key: "message", label: "Meddelande" },
          { key: "_createdAt", label: "Datum", type: "date" as const },
        ],
        searchField: "title",
        canAdd: true,
        docType: "announcement",
      };
    case "friend-requests":
      return {
        title: "Vänförfrågningar",
        subtitle: "Hantera nätverk & Poäng",
        query: '*[_type == "friendRequest"] | order(_createdAt desc)',
        columns: [
          { key: "fromUserName", label: "Från" },
          { key: "status", label: "Status", type: "status" as const },
          { key: "_createdAt", label: "Datum", type: "date" as const },
        ],
        searchField: "fromUserName",
        canAdd: false,
        docType: "friendRequest",
      };
    case "shipping-schedules":
      return {
        title: "Sändningsschema",
        subtitle: "Planera rutter och avgångar",
        query: '*[_type == "shippingSchedule"] | order(_createdAt desc)',
        columns: [
          { key: "route", label: "Rutt" },
          { key: "departureTime", label: "Avgång", type: "date" as const },
          { key: "status", label: "Status", type: "status" as const },
        ],
        searchField: "route",
        canAdd: true,
        docType: "shippingSchedule",
      };
    case "container-shipping-schedules":
      return {
        title: "Container Schema",
        subtitle: "Båtrutter och tider",
        query: '*[_type == "containerShippingSchedule"] | order(_createdAt desc)',
        columns: [
          { key: "route", label: "Rutt" },
          { key: "departureTime", label: "Avgång", type: "date" as const },
          { key: "status", label: "Status", type: "status" as const },
        ],
        searchField: "route",
        canAdd: true,
        docType: "containerShippingSchedule",
      };
    case "move-clean-orders":
      return {
        title: "Flytt & Städ",
        subtitle: "Kombinerade uppdrag",
        query: '*[_type == "moveCleaningOrder"] | order(_createdAt desc)',
        columns: [
          { key: "_id", label: "ID" },
          { key: "status", label: "Status", type: "status" as const },
          { key: "totalPrice", label: "Pris", type: "currency" as const },
          { key: "_createdAt", label: "Datum", type: "date" as const },
        ],
        searchField: "_id",
        canAdd: true,
        docType: "moveCleaningOrder",
      };
    case "live-status":
      return {
        title: "Live Status",
        subtitle: "Systemets hälsa",
        query: '*[_type == "liveStatus"] | order(_createdAt desc)',
        columns: [
          { key: "title", label: "Titel" },
          { key: "isActive", label: "Aktiv", type: "status" as const },
          { key: "_createdAt", label: "Skapad", type: "date" as const },
        ],
        searchField: "title",
        canAdd: true,
        docType: "liveStatus",
      };
    case "footer":
      return {
        title: "Footer",
        subtitle: "Applikationens fot",
        query: '*[_type == "footer"] | order(_createdAt desc)',
        columns: [
          { key: "copyright", label: "Copyright" },
          { key: "_createdAt", label: "Skapad", type: "date" as const },
        ],
        searchField: "copyright",
        canAdd: true,
        docType: "footer",
      };
    case "terms":
      return {
        title: "Användarvillkor",
        subtitle: "Legal text",
        query: '*[_type == "terms"] | order(_createdAt desc)',
        columns: [
          { key: "title", label: "Titel" },
          { key: "lastUpdated", label: "Uppdaterad", type: "date" as const },
        ],
        searchField: "title",
        canAdd: true,
        docType: "terms",
      };
    case "privacy":
      return {
        title: "Integritetspolicy",
        subtitle: "GDPR Information",
        query: '*[_type == "policy"] | order(_createdAt desc)',
        columns: [
          { key: "title", label: "Titel" },
          { key: "lastUpdated", label: "Uppdaterad", type: "date" as const },
        ],
        searchField: "title",
        canAdd: true,
        docType: "policy",
      };
    case "notification-history":
      return {
        title: "Notifikationer",
        subtitle: "Notifikationshistorik",
        query: '*[_type == "notificationHistory"] | order(dateSent desc)',
        columns: [
          { key: "title", label: "Titel" },
          { key: "dateSent", label: "Datum", type: "date" as const },
          { key: "status", label: "Status", type: "status" as const },
        ],
        searchField: "title",
        canAdd: true,
        docType: "notificationHistory",
      };
    default:
      return null;
  }
};

export default function AdminManageScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = String(params.type ?? "");
  const [refreshKey, setRefreshKey] = useState(0);
  const config = getEntityConfig(type);
  const { language } = useLanguage();
  const addRecordLabel = useTranslationText("Add record", language);

  const handleDelete = (item: any) => {
    if (!item?._id) return;
    void showAlert("Delete record", "Delete this record from the content collection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(item._id);
            setRefreshKey((key) => key + 1);
          } catch {
            void showAlert("Could not delete", "Please try again.");
          }
        },
      },
    ]);
  };

  if (!config) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }}>
        <ScreenHeader title="Manage content" subtitle="Choose a collection to continue" showBack />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
          <AppIcon name="alert-circle-outline" size={34} color={theme.textTertiary} />
          <AutoText className="mt-4 text-center font-semibold text-gray-700 dark:text-zinc-200">This collection is unavailable.</AutoText>
          <AutoText className="mt-2 text-center text-sm text-gray-500 dark:text-zinc-400">Return to Operations and choose one of the listed collections.</AutoText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={config.title}
        subtitle={config.subtitle}
        showBack
        rightIcon={config.canAdd ? "add" : undefined}
        onRightPress={config.canAdd ? () => router.push(`/profile/admin-form?type=${encodeURIComponent(type)}&id=new` as any) : undefined}
        rightAccessibilityLabel={addRecordLabel || "Add record"}
      />
      <AdminDataList
        title={config.title}
        query={config.query}
        columns={config.columns}
        searchField={config.searchField}
        refreshKey={refreshKey}
        onItemPress={(item) => router.push(`/profile/admin-form?type=${encodeURIComponent(type)}&id=${encodeURIComponent(item._id)}` as any)}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}
