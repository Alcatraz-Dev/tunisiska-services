import React from "react";
import { View, SafeAreaView, TouchableOpacity, Alert } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AdminDataList } from "@/app/components/admin/AdminDataList";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";
import { client } from "@/sanityClient";

export default function AdminManageScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();

  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleDelete = async (item: any) => {
    if (!item._id) return;

    Alert.alert(
      "Radera objekt",
      "Är du säker på att du vill radera detta objekt? Detta går inte att ångra.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Radera",
          style: "destructive",
          onPress: async () => {
            try {
              await client.delete(item._id);
              setRefreshKey((prev) => prev + 1);
            } catch (error) {
              console.error("Delete failed:", error);
              Alert.alert("Fel", "Kunde inte radera objektet.");
            }
          },
        },
      ],
    );
  };

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
        };
      case "shipping-orders":
        return {
          title: "Sändningar",
          subtitle: "Hantera logistik och frakt",
          query:
            '*[_type == "shippingOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, totalPrice, route } | order(scheduledDateTime desc)',
          columns: [
            { key: "customerName", label: "Kund" },
            { key: "status", label: "Status", type: "status" as const },
            { key: "route", label: "Rutt" },
            { key: "scheduledDateTime", label: "Datum", type: "date" as const },
          ],
          searchField: "customerName",
          canAdd: true,
        };
      case "container-shipping-orders":
        return {
          title: "Container Bokningar",
          subtitle: "Större fraktuppdrag",
          query:
            '*[_type == "containerShippingOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, totalPrice } | order(scheduledDateTime desc)',
          columns: [
            { key: "customerName", label: "Kund" },
            { key: "status", label: "Status", type: "status" as const },
            { key: "totalPrice", label: "Pris", type: "currency" as const },
            { key: "scheduledDateTime", label: "Datum", type: "date" as const },
          ],
          searchField: "customerName",
          canAdd: true,
        };
      case "shipping-schedules":
        return {
          title: "Sändnings Schema",
          subtitle: "Planera rutter och avgångar",
          query:
            '*[_type == "shippingSchedule"] { _id, route, departureTime, status, isActive } | order(departureTime desc)',
          columns: [
            { key: "route", label: "Rutt" },
            { key: "departureTime", label: "Avgång", type: "date" as const },
            { key: "status", label: "Status", type: "status" as const },
            { key: "isActive", label: "Aktiv", type: "status" as const },
          ],
          searchField: "route",
          canAdd: true,
        };
      case "container-shipping-schedules":
        return {
          title: "Container Schema",
          subtitle: "Båtrutter och tider",
          query:
            '*[_type == "containerShippingSchedule"] { _id, route, departureTime, status } | order(departureTime desc)',
          columns: [
            { key: "route", label: "Rutt" },
            { key: "departureTime", label: "Avgång", type: "date" as const },
            { key: "status", label: "Status", type: "status" as const },
          ],
          searchField: "route",
          canAdd: true,
        };
      case "taxi-orders":
        return {
          title: "Taxibokningar",
          subtitle: "Övervaka och hantera taxiresor",
          query:
            '*[_type == "taxiOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, pickupAddress } | order(scheduledDateTime desc)',
          columns: [
            { key: "customerName", label: "Kund" },
            { key: "status", label: "Status", type: "status" as const },
            { key: "pickupAddress", label: "Upphämtning" },
            { key: "scheduledDateTime", label: "Datum", type: "date" as const },
          ],
          searchField: "customerName",
          canAdd: true,
        };
      case "move-orders":
        return {
          title: "Flyttordrar",
          subtitle: "Hantera flyttbeställningar",
          query:
            '*[_type == "moveOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, pickupAddress } | order(scheduledDateTime desc)',
          columns: [
            { key: "customerName", label: "Kund" },
            { key: "status", label: "Status", type: "status" as const },
            { key: "pickupAddress", label: "Från" },
            { key: "scheduledDateTime", label: "Datum", type: "date" as const },
          ],
          searchField: "customerName",
          canAdd: true,
        };
      case "notification-history":
        return {
          title: "Notifikations Historik",
          subtitle: "Tidigare utskickade notiser",
          query: '*[_type == "notificationHistory"] | order(dateSent desc)',
          columns: [
            { key: "title", label: "Rubrik" },
            { key: "message", label: "Meddelande" },
            { key: "dateSent", label: "Datum", type: "date" as const },
            { key: "notificationType", label: "Typ" },
          ],
          searchField: "title",
          canAdd: false,
        };
      case "move-clean-orders":
        return {
          title: "Flytt & Städ",
          subtitle: "Kombinerade uppdrag",
          query:
            '*[_type == "moveCleaningOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, totalPrice } | order(scheduledDateTime desc)',
          columns: [
            { key: "customerName", label: "Kund" },
            { key: "status", label: "Status", type: "status" as const },
            { key: "totalPrice", label: "Pris", type: "currency" as const },
            { key: "scheduledDateTime", label: "Datum", type: "date" as const },
          ],
          searchField: "customerName",
          canAdd: true,
        };
      case "announcements":
        return {
          title: "Annonser",
          subtitle: "Dela nyheter och erbjudanden",
          query: '*[_type == "announcement"] | order(date desc)',
          columns: [
            { key: "title", label: "Titel" },
            { key: "message", label: "Meddelande" },
            { key: "date", label: "Datum", type: "date" as const },
          ],
          searchField: "title",
          canAdd: true,
        };
      case "friend-requests":
        return {
          title: "Vänförfrågningar",
          subtitle: "Hantera nätverk & Poäng",
          query:
            '*[_type == "friendRequest"] { _id, fromUserName, toUserId, status, pointsToTransfer, _createdAt } | order(_createdAt desc)',
          columns: [
            { key: "fromUserName", label: "Från" },
            { key: "toUserId", label: "Till (ID)" },
            { key: "pointsToTransfer", label: "Poäng" },
            { key: "status", label: "Status", type: "status" as const },
          ],
          searchField: "fromUserName",
          canAdd: false,
        };
      case "live-status":
        return {
          title: "Live Status",
          subtitle: "Systemets hälsa",
          query: '*[_type == "liveStatus"]',
          columns: [
            { key: "title", label: "Titel" },
            { key: "statuses", label: "Meddelanden" },
            { key: "isActive", label: "Status", type: "status" as const },
          ],
          searchField: "title",
          canAdd: true,
        };
      case "footer":
        return {
          title: "Footer",
          subtitle: "Applikationens fot",
          query: '*[_type == "footer"]',
          columns: [
            { key: "copyrightText", label: "Copyright" },
            { key: "footerLinks", label: "Länkar" },
            { key: "socialMedia", label: "Sociala Medier" },
          ],
          searchField: "copyrightText",
          canAdd: true,
        };
      case "terms":
        return {
          title: "Användarvillkor",
          subtitle: "Legal text",
          query: '*[_type == "terms"]',
          columns: [
            { key: "title", label: "Titel" },
            { key: "lastUpdated", label: "Uppdaterad", type: "date" as const },
          ],
          searchField: "title",
          canAdd: true,
        };
      case "privacy":
        return {
          title: "Integritetspolicy",
          subtitle: "GDPR Information",
          query: '*[_type == "policy"]',
          columns: [
            { key: "title", label: "Titel" },
            { key: "lastUpdated", label: "Uppdaterad", type: "date" as const },
          ],
          searchField: "title",
          canAdd: true,
        };
      default:
        return null;
    }
  };

  const config = getEntityConfig(type || "");

  if (!config) {
    return (
      <View
        className={`flex-1 justify-center items-center ${isDark ? "bg-dark" : "bg-white"}`}
      >
        <AutoText className={isDark ? "text-white" : "text-black"}>
          Ogiltig kategori
        </AutoText>
      </View>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header with Back Button */}
      <View className="px-6 pt-6 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <AutoText
            className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {config.title}
          </AutoText>
        </View>

        {config.canAdd ? (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: "/profile/admin-form/[type]/[id]",
                params: { type: type, id: "new" },
              });
            }}
            className="p-2 rounded-2xl bg-primary/10"
          >
            <Ionicons name="add" size={24} color="#3b82f6" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      <View className="flex-1 mt-4">
        <View className="px-6 mb-6">
          <AutoText className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            {config.subtitle}
          </AutoText>
        </View>

        <AdminDataList
          key={refreshKey}
          title={config.title}
          query={config.query}
          columns={config.columns as any}
          searchField={config.searchField}
          onItemPress={(item) => {
            router.push({
              pathname: "/profile/admin-form/[type]/[id]",
              params: { type: type, id: item._id },
            });
          }}
          onDelete={handleDelete}
        />
      </View>
    </SafeAreaView>
  );
}
