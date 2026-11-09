import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { AutoText } from "../../components/ui/AutoText";
import { useTheme } from "../../context/ThemeContext";
import { nativeNotifyAPI } from "../../services/nativeNotifyApi";
import { client } from "../../../sanityClient";
import { showAlert } from "../../utils/showAlert";
import Input from "@/app/components/ui/Input";
import { useThemeColors } from "@/app/theme";
import { currentDateLocale } from "@/app/lib/time";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

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
  const theme = useThemeColors();

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
                title: item.title || item.notification?.title || "Unknown title",
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

      // Tombstones (status == "deleted") withdraw the notification from every
      // user inbox on next sync — hide them here too, whether they carry a
      // NativeNotify id or are composer-only Sanity docs.
      const deletedRecords: Array<{ _id?: string; nativeNotifyId?: string }> =
        await client.fetch(
          '*[_type == "notificationHistory" && status == "deleted"]{ _id, nativeNotifyId }',
        ).catch(() => []);
      const deletedSanityIds = new Set(
        (Array.isArray(deletedRecords) ? deletedRecords : [])
          .map((r) => r?._id)
          .filter(Boolean) as string[],
      );
      const deletedNativeIds = new Set(
        (Array.isArray(deletedRecords) ? deletedRecords : [])
          .map((r) => r?.nativeNotifyId)
          .filter(Boolean) as string[],
      );
      setGloballyDeletedIds(
        new Set([
          ...deletedSanityIds,
          ...deletedNativeIds,
          ...Array.from(deletedSanityIds, (id) => `sanity-${id}`),
        ]),
      );

      const visible = combined.filter((item) => {
        if (item.source === "sanity" && item._id && deletedSanityIds.has(item._id)) return false;
        if (deletedNativeIds.has(item.rawId)) return false;
        return true;
      });

      // Sort by date descending
      visible.sort(
        (a, b) =>
          new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime()
      );

      setAllFetchedNotifications(visible);
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
    void showAlert(
      "Delete notification",
      `Delete "${item.title}" from the list? This also deletes it for all users.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Mark as globally deleted in Sanity. Composer-sent rows are
              // patched directly by _id; NativeNotify rows are matched by
              // their native id (or tombstoned when no record exists yet).
              const queryId = item.rawId;
              const existingRecord = item._id
                ? { _id: item._id }
                : await client.fetch(
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
              showAlert("Deleted", "The notification was deleted.");
            } catch (error) {
              console.error("Failed to delete notification globally:", error);
              showAlert("Error", "The notification could not be deleted. Please try again.");
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
      return d.toLocaleDateString(currentDateLocale(), {
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
        return { bg: "bg-orange-500/15", text: "text-orange-400", icon: "notifications" as const };
    }
  };

  const { language } = useLanguage();
  const refreshLabel = useTranslationText("Refresh history", language);
  const sentUnit = useTranslationText(visibleNotifications.length === 1 ? "sent notification" : "sent notifications", language);
  const historySubtitle = `${visibleNotifications.length} ${sentUnit}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Notification history" subtitle={historySubtitle} showBack rightIcon="refresh-outline" onRightPress={onRefresh} rightAccessibilityLabel={refreshLabel || "Refresh history"} />

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
          <AppIcon name="search-outline" size={20} color={theme.primary} />
          <Input
            placeholder="Search history..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ flex: 1, marginLeft: 10, fontSize: 14, color: theme.textPrimary }}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <AppIcon name="close-circle" size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#132B55" />
          <AutoText className="text-gray-500 mt-3 text-sm">Loading history...</AutoText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => {
            const { bg, text, icon } = getTypeColor(item.notificationType);
            return (
              <View
                style={{ marginBottom: 10, borderRadius: 17, overflow: "hidden", borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface }}
              >
                <View style={{ padding: 16 }}>
                  {/* Top row */}
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${bg}`}>
                        <AppIcon name={icon} size={18} color={isDark ? "#a78bfa" : "#7c3aed"} />
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
                      <AppIcon name="trash-outline" size={15} color="#ef4444" />
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
                      <AppIcon name="time-outline" size={12} color="#6b7280" />
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
                <AppIcon
                  name="notifications-off-outline"
                  size={36}
                  color={isDark ? "#374151" : "#d1d5db"}
                />
              </View>
              <AutoText className={`text-base font-black mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                No notifications found
              </AutoText>
              <AutoText className="text-gray-500 text-sm text-center px-8">
                Sent notifications appear here. Pull down to refresh.
              </AutoText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
