import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AutoText } from "../../components/ui/AutoText";
import { useTheme } from "../../context/ThemeContext";
import { nativeNotifyAPI } from "../../services/nativeNotifyApi";
import { client } from "../../../sanityClient";
import { showAlert } from "../../utils/showAlert";

const HIDDEN_IDS_KEY = "admin_hidden_notification_ids";

interface NotificationItem {
  id: string; // The UI-stable ID
  rawId: string; // The raw ID for database operations
  title: string;
  message: string;
  dateSent: string;
  notificationType?: string;
  source: "nativenotify" | "sanity";
  _id?: string;
}

export default function AdminHistoryScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [allFetchedNotifications, setAllFetchedNotifications] = useState<NotificationItem[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [globallyDeletedIds, setGloballyDeletedIds] = useState<Set<string>>(new Set());

  // Load persisted hidden IDs from AsyncStorage
  const loadHiddenIds = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(HIDDEN_IDS_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch (e) {
      console.error("Error loading hidden IDs:", e);
    }
    return new Set<string>();
  }, []);

  const saveHiddenIds = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify([...ids]));
    } catch (e) {
      console.error("Error saving hidden IDs:", e);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const currentHiddenIds = await loadHiddenIds();
      setHiddenIds(currentHiddenIds);
      // Fetch from both NativeNotify API and Sanity in parallel
      const [nnHistory, sanityHistory] = await Promise.allSettled([
        nativeNotifyAPI.getNotificationHistory(),
        client.fetch(
          `*[_type == "notificationHistory"] | order(dateSent desc)`
        ),
      ]);

      const nnItems: NotificationItem[] =
        nnHistory.status === "fulfilled"
          ? (nnHistory.value || []).map((item: any, idx: number) => {
              const rawId = (item.notification_id || item.id || "").toString();
              const contentHash = `${item.title}-${item.body || item.message}-${item.date || item.dateSent || item.created_at}`;
              const stableId = rawId ? `nn-${rawId}` : `nn-hash-${contentHash.replace(/\s+/g, '')}`;

              return {
                id: stableId,
                rawId: rawId,
                title: item.title || item.notification?.title || "Okänd titel",
                message:
                  item.body ||
                  item.message ||
                  item.notification?.body ||
                  "",
                dateSent:
                  item.date ||
                  item.dateSent ||
                  item.created_at ||
                  item.createdAt ||
                  new Date().toISOString(),
                notificationType: item.notificationType || item.type || "general",
                source: "nativenotify" as const,
              };
            })
          : [];

      const sanityItems: NotificationItem[] =
        sanityHistory.status === "fulfilled"
          ? (sanityHistory.value || []).map((item: any) => ({
              id: `sanity-${item._id}`,
              rawId: item.nativeNotifyId || item._id,
              _id: item._id,
              title: item.title || "",
              message: item.message || "",
              dateSent: item.dateSent || item._createdAt || "",
              notificationType: item.notificationType || "",
              source: "sanity" as const,
            }))
          : [];

      // Merge — prefer NativeNotify items
      // Deduplicate by title+date within 1 min window
      const combined = [...nnItems];
      for (const si of sanityItems) {
        const isDuplicate = nnItems.some(
          (ni) =>
            ni.title === si.title &&
            Math.abs(
              new Date(ni.dateSent).getTime() -
                new Date(si.dateSent).getTime()
            ) < 60 * 1000
        );
        if (!isDuplicate) combined.push(si);
      }

      // Sort by date descending
      combined.sort(
        (a, b) =>
          new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime()
      );
      // Fetch globally deleted IDs from Sanity
      const deletedRecords = await client.fetch('*[_type == "notificationHistory" && status == "deleted"].nativeNotifyId');
      setGloballyDeletedIds(new Set(deletedRecords.filter(Boolean)));

      setAllFetchedNotifications(combined);
    } catch (error) {
      console.error("Error fetching notification history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadHiddenIds().then((ids) => {
      setHiddenIds(ids);
      fetchNotifications();
    });
  }, [loadHiddenIds, fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleDelete = (item: NotificationItem) => {
    Alert.alert(
      "Radera notifikation",
      `Vill du ta bort "${item.title}" från listan? Detta raderar även notisen för alla användare.`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Radera för alla",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Mark as globally deleted in Sanity
              const queryId = item.rawId;
              const existingRecord = await client.fetch(
                '*[_type == "notificationHistory" && nativeNotifyId == $id][0]',
                { id: queryId }
              );

              if (existingRecord) {
                await client.patch(existingRecord._id).set({ status: "deleted" }).commit();
              } else {
                // Create a record just to track the global deletion
                await client.create({
                  _type: "notificationHistory",
                  title: item.title,
                  message: item.message,
                  dateSent: item.dateSent || new Date().toISOString(),
                   nativeNotifyId: queryId,
                   status: "deleted"
                 });
               }

              // 2. Hide for current admin instantly
              const newHiddenIds = new Set(hiddenIds);
              newHiddenIds.add(item.id);
              setHiddenIds(newHiddenIds);
              await saveHiddenIds(newHiddenIds);

               // 3. UI feedback
              setAllFetchedNotifications(prev => prev.filter(n => n.id !== item.id));
              setGloballyDeletedIds(prev => {
                const next = new Set(prev);
                next.add(item.id);
                return next;
              });
              showAlert("Raderad", "Notifikationen har tagits bort för alla användare.");
            } catch (error) {
              console.error("Failed to delete notification globally:", error);
              showAlert("Fel", "Kunde inte radera notifikationen globalt.");
            }
          },
        },
      ]
    );
  };

   // Filter out hidden items and apply search
  const visibleNotifications = useMemo(() => {
    return allFetchedNotifications.filter((n) => !hiddenIds.has(n.id) && !globallyDeletedIds.has(n.id));
  }, [allFetchedNotifications, hiddenIds, globallyDeletedIds]);

  const filtered = useMemo(() => {
    if (!searchTerm) return visibleNotifications;
    const lowerSearch = searchTerm.toLowerCase();
    return visibleNotifications.filter(
      (n) =>
        n.title.toLowerCase().includes(lowerSearch) ||
        n.message.toLowerCase().includes(lowerSearch)
    );
  }, [visibleNotifications, searchTerm]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "announcement":
        return { bg: "bg-blue-500/15", text: "text-blue-400", icon: "megaphone" as const };
      case "promo":
        return { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: "pricetag" as const };
      default:
        return { bg: "bg-purple-500/15", text: "text-purple-400", icon: "notifications" as const };
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>

          <AutoText className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
            Notifikationer
          </AutoText>

          <TouchableOpacity
            onPress={onRefresh}
            className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}
          >
            <Ionicons name="refresh" size={20} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
        </View>

        <AutoText className="text-gray-500 text-xs font-bold uppercase tracking-widest text-center">
          {visibleNotifications.length} skickade notiser
        </AutoText>
      </View>

      {/* Search */}
      <View className="px-6 mb-4">
        <View
          className={`flex-row items-center px-5 h-14 rounded-[24px] ${
            isDark
              ? "bg-dark-card border border-white/5"
              : "bg-white border border-gray-100"
          } shadow-sm`}
        >
          <Ionicons name="search-outline" size={20} color={isDark ? "#3b82f6" : "#2563eb"} />
          <TextInput
            placeholder="Sök i historiken..."
            placeholderTextColor={isDark ? "#4b5563" : "#94a3b8"}
            value={searchTerm}
            onChangeText={setSearchTerm}
            className={`flex-1 ml-3 text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <AutoText className="text-gray-500 mt-3 text-sm">Hämtar historik...</AutoText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item }) => {
            const { bg, text, icon } = getTypeColor(item.notificationType);
            return (
              <View
                className={`mb-3 rounded-[28px] overflow-hidden ${
                  isDark ? "bg-dark-card border border-white/5" : "bg-white border border-gray-100"
                } shadow-sm`}
              >
                <View className="p-5">
                  {/* Top row */}
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${bg}`}>
                        <Ionicons name={icon} size={18} color={isDark ? "#a78bfa" : "#7c3aed"} />
                      </View>
                      <AutoText
                        className={`text-sm font-black flex-1 ${isDark ? "text-white" : "text-gray-900"}`}
                        numberOfLines={2}
                      >
                        {item.title}
                      </AutoText>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isDark ? "bg-red-500/10" : "bg-red-50"
                      }`}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Message */}
                  {!!item.message && (
                    <AutoText
                      className={`text-xs mb-3 leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                      numberOfLines={3}
                    >
                      {item.message}
                    </AutoText>
                  )}

                  {/* Footer */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={12} color="#6b7280" />
                      <AutoText className="text-gray-500 text-[10px] ml-1 font-bold">
                        {formatDate(item.dateSent)}
                      </AutoText>
                    </View>
                    {item.notificationType ? (
                      <View className={`px-2.5 py-1 rounded-full ${bg}`}>
                        <AutoText className={`text-[9px] font-black uppercase ${text}`}>
                          {item.notificationType}
                        </AutoText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="py-24 items-center">
              <View
                className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
                  isDark ? "bg-white/5" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={36}
                  color={isDark ? "#374151" : "#d1d5db"}
                />
              </View>
              <AutoText className={`text-base font-black mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                Inga notiser hittades
              </AutoText>
              <AutoText className="text-gray-500 text-sm text-center px-8">
                Skickade notifikationer visas här. Dra ned för att uppdatera.
              </AutoText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
