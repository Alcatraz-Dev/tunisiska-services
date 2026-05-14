import React, { useState, useEffect } from "react";
import { View, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { client } from "@/sanityClient";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = params.type as string || "";
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const config = getEntityConfig(type);

  useEffect(() => {
    console.log(`[AdminManage] Effect triggered, type: "${type}"`);
    if (!type) {
      console.log(`[AdminManage] No type, skipping`);
      setLoading(false);
      return;
    }
    
    if (!config) {
      console.log(`[AdminManage] No config found`);
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        console.log(`[AdminManage] Fetching for: ${type}`);
        const result = await client.fetch(config.query);
        console.log(`[AdminManage] Result: ${result?.length || 0} items`);
        if (isMounted) {
          setData(result || []);
        }
      } catch (error) {
        console.error("[AdminManage] Error:", error);
        if (isMounted) setData([]);
      } finally {
        if (isMounted) {
          console.log(`[AdminManage] Done loading`);
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => { isMounted = false; };
  }, [type, refreshKey]);

  const handleDelete = async (item: any) => {
    if (!item._id) return;
    Alert.alert("Radera", "Är du säker?", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Radera",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(item._id);
            setRefreshKey(k => k + 1);
          } catch (error) {
            Alert.alert("Fel", "Kunde inte radera");
          }
        },
      },
    ]);
  };

  const filteredData = searchTerm && config?.searchField
    ? data.filter(item => {
        const val = item[config.searchField];
        return val && String(val).toLowerCase().includes(searchTerm.toLowerCase());
      })
    : data;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("sv-SE");
    } catch {
      return "—";
    }
  };

  const getStatusColor = (status: string) => {
    const s = String(status || "").toLowerCase();
    if (["true", "completed", "confirmed", "active", "accepted"].includes(s)) return "bg-green-500/20 text-green-500";
    if (["pending"].includes(s)) return "bg-yellow-500/20 text-yellow-500";
    if (["false", "cancelled", "rejected"].includes(s)) return "bg-red-500/20 text-red-500";
    return isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-500/10 text-blue-600";
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => {
        const url = `/profile/admin-form?type=${encodeURIComponent(type)}&id=${encodeURIComponent(item._id)}`;
        console.log(`[AdminManage] Navigating to EDIT form: ${url}`);
        router.push(url as any);
      }}
      className={`mb-3 p-5 rounded-[24px] ${isDark ? "bg-dark-card border border-white/5" : "bg-white border border-gray-100"}`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <AutoText className={`text-sm font-black flex-1 mr-4 ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
          {item[config?.columns[0]?.key] || item._id?.slice(0, 8) || "—"}
        </AutoText>
        <View className="flex-row">
          <TouchableOpacity onPress={() => handleDelete(item)} className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${isDark ? "bg-red-500/10" : "bg-red-50"}`}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
          <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <Ionicons name="chevron-forward" size={16} color={isDark ? "#3b82f6" : "#2563eb"} />
          </View>
        </View>
      </View>
      <View className="flex-row flex-wrap">
        {config?.columns.slice(1, 4).map(col => (
          <View key={col.key} className="flex-row items-center mr-4 mt-1">
            <AutoText className={`${isDark ? "text-gray-500" : "text-gray-400"} text-[9px] uppercase font-bold mr-1`}>
              {col.label}:
            </AutoText>
            {col.type === "status" ? (
              <View className={`px-2 py-0.5 rounded-full ${getStatusColor(item[col.key])}`}>
                <AutoText className="text-[9px] font-black uppercase">{String(item[col.key] || "—")}</AutoText>
              </View>
            ) : col.type === "currency" ? (
              <AutoText className={`text-[10px] font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item[col.key] || 0} SEK</AutoText>
            ) : col.type === "date" ? (
              <AutoText className={`text-[10px] font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`}>{formatDate(item[col.key])}</AutoText>
            ) : (
              <AutoText className={`text-[10px] font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`} numberOfLines={1}>{String(item[col.key] || "—")}</AutoText>
            )}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  if (!config) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
        <View className="flex-1 justify-center items-center">
          <Ionicons name="alert-circle" size={48} color={isDark ? "#374151" : "#d1d5db"} />
          <AutoText className={`mt-4 ${isDark ? "text-white" : "text-gray-900"}`}>Ogiltig kategori</AutoText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View className="px-6 pt-6 pb-2 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
          <Ionicons name="arrow-back" size={20} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <AutoText className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>{config.title}</AutoText>
        {config.canAdd ? (
          <TouchableOpacity 
            onPress={() => {
              const url = `/profile/admin-form?type=${encodeURIComponent(type)}&id=new`;
              console.log(`[AdminManage] Navigating to ADD form: ${url}`);
              router.push(url as any);
            }} 
            className="p-2 rounded-2xl bg-primary/10"
          >
            <Ionicons name="add" size={24} color="#3b82f6" />
          </TouchableOpacity>
        ) : <View className="w-10" />}
      </View>

      <View className="px-6 mb-4">
        <AutoText className="text-gray-500 text-xs font-bold uppercase tracking-widest">{config.subtitle}</AutoText>
      </View>

      <View className={`mx-6 mb-4 flex-row items-center px-5 h-12 rounded-[24px] ${isDark ? "bg-dark-card border border-white/5" : "bg-white border border-gray-100"}`}>
        <Ionicons name="search-outline" size={18} color={isDark ? "#3b82f6" : "#2563eb"} />
        <TextInput
          placeholder={`Sök ${config.title.toLowerCase()}...`}
          placeholderTextColor={isDark ? "#4b5563" : "#94a3b8"}
          value={searchTerm}
          onChangeText={setSearchTerm}
          className={`flex-1 ml-3 text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#3b82f6" />
          <AutoText className="text-gray-500 mt-4">Laddar...</AutoText>
        </View>
      ) : filteredData.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="folder-open-outline" size={48} color={isDark ? "#1e293b" : "#cbd5e1"} />
          <AutoText className="text-gray-500 mt-4">Inga {config.title.toLowerCase()} hittades</AutoText>
          {config.canAdd && <AutoText className="text-gray-400 mt-2 text-xs">Tryck + för att lägga till</AutoText>}
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          refreshing={loading}
          onRefresh={() => setRefreshKey(k => k + 1)}
        />
      )}
    </SafeAreaView>
  );
}