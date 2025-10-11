import { AutoText } from "@/app/components/ui/AutoText";
import { useNotifications } from "@/app/context/NotificationContext";
import { useTheme } from "@/app/context/ThemeContext";
import usePushNotifications from "@/app/hooks/usePushNotifications";
import { showAlert } from "@/app/utils/showAlert";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNotificationInbox } from "native-notify";
import { FlatList, RefreshControl, TouchableOpacity, View, InteractionManager } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { TranslatableDateText } from "@/app/utils/dateFormat";

// Type definitions for notifications
interface NotificationItem {
  id?: string;
  notification_id?: string;
  title: string;
  message: string;
  type?: string;
  category?: string;
  read?: boolean;
  date?: string;
  date_sent?: string;
}

// Lightweight in-memory cache for first page per user (session-scoped)
interface InboxCache {
  userId: string | null;
  page0Raw: NotificationItem[];
  ts: number;
}
let inboxCache: InboxCache | null = null;

// Parse API date format "9-23-2025 2:45AM" to JavaScript Date




export default function Notification() {
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const { unreadCount, syncNativeNotifyInbox } = usePushNotifications();
  const { resolvedTheme } = useTheme();
  const APP_ID = 32172;
  const APP_TOKEN = "PNF5T5VibvtV6lj8i7pbil";
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { userId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [iconsReady, setIconsReady] = useState(false);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const loadingRef = useRef(false);
  const ROW_HEIGHT = 88; // approximate constant row height for getItemLayout

  // Scope storage keys by Clerk userId so each user has their own read/delete state
  const READ_IDS_KEY = useMemo(() => `notification_read_ids:${userId ?? "anon"}`, [userId]);
  const HIDDEN_IDS_KEY = useMemo(() => `notification_hidden_ids:${userId ?? "anon"}`, [userId]);

  const getId = (n: NotificationItem) => ((n.id || n.notification_id) ?? '').toString();

  const filterForUser = (items: any[]): NotificationItem[] => {
    if (!userId) return items as NotificationItem[];
    const keys = [
      'subscriber_id', 'subscriberId', 'user_id', 'userId', 'indie_id', 'indieId', 'sub_id', 'subId'
    ];
    const hasAnyKey = items.some((it) => keys.some((k) => it && typeof it === 'object' && k in it));
    if (!hasAnyKey) return items as NotificationItem[];
    const filtered = items.filter((it) => keys.some((k) => it?.[k]?.toString?.() === userId?.toString()));
    return filtered as NotificationItem[];
  };

  const applyOverlays = (items: NotificationItem[], opts?: { read?: string[]; hidden?: string[] }) => {
    const readSet = new Set(opts?.read ?? readIds);
    const hiddenSet = new Set(opts?.hidden ?? hiddenIds);
    return items
      .filter((n) => !hiddenSet.has(getId(n)))
      .map((n) => {
        const id = getId(n);
        return { ...n, read: n.read || readSet.has(id) } as NotificationItem;
      });
  };

  const hasUnread = notifications.some((n) => !n.read);
  // Safely mark an item as read in both local state and context
  const saveReadIds = async (ids: string[]) => {
    try { await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(ids)); } catch {}
  };
  const saveHiddenIds = async (ids: string[]) => {
    try { await AsyncStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify(ids)); } catch {}
  };

  const markItemAsRead = async (notificationId?: string) => {
    if (!notificationId) return;
    const idStr = notificationId.toString();
    setData((prev) => prev.map((n) => (getId(n) === idStr ? { ...n, read: true } : n)));
    setReadIds((prev) => {
      if (prev.includes(idStr)) return prev;
      const next = [...prev, idStr];
      saveReadIds(next);
      return next;
    });
    try {
      markAsRead(notificationId);
    } catch {}

    // Best-effort: attempt to mark as read in Native Notify using Clerk userId as subscriber ID
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nn = require('native-notify');
      const candidates = ['handleRead', 'setNotificationRead', 'markNotificationAsRead', 'readNotificationInbox'];
      const fn = candidates.map((k) => nn?.[k]).find(Boolean);
      if (typeof fn === 'function' && userId) {
        await fn(userId.toString(), notificationId.toString(), APP_ID, APP_TOKEN);
      }
    } catch (e) {
      // silent fail; local overlay already applied
    }
  };

  // Locally delete an item from the inbox list
  // If you later want to delete from the remote inbox (Native Notify),
  // you can call the provider's delete endpoint here before updating state.
  const deleteItem = async (notificationId?: string) => {
    if (!notificationId) return;
    const idStr = notificationId.toString();
    setData((prev) => prev.filter((n) => getId(n) !== idStr));

    // Try remote delete in Native Notify with Clerk userId as subscriber ID
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nn = require('native-notify');
      const candidates = ['handleDelete', 'deleteNotificationInbox', 'removeNotificationInbox'];
      const fn = candidates.map((k) => nn?.[k]).find(Boolean);
      if (typeof fn === 'function' && userId) {
        await fn(userId.toString(), idStr, APP_ID, APP_TOKEN);
      }
    } catch (e) {
      // ignore network/SDK errors; we still hide locally
    }

    setHiddenIds((prev) => {
      if (prev.includes(idStr)) return prev;
      const next = [...prev, idStr];
      saveHiddenIds(next);
      return next;
    });
  };

  const notiser = async (opts?: { read?: string[]; hidden?: string[]; page?: number; append?: boolean }) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const currentPage = opts?.page ?? 0;
      const response = await getNotificationInbox(
        APP_ID,
        APP_TOKEN,
        PAGE_SIZE,
        currentPage * PAGE_SIZE
      );
      // Handle the API response structure - it might be response.data or just response
      const notificationData = response?.data || response || [];
      const typedData: NotificationItem[] = Array.isArray(notificationData) ? notificationData : [];
      const scoped = filterForUser(typedData);
      const processed = applyOverlays(scoped, opts);
      setData((prev) => (opts?.append ? [...prev, ...processed] : processed));
      if (!opts?.append) {
        setPage(1); // next page after initial load
        // store raw page 0 in cache for instant re-open
        inboxCache = { userId: userId ?? null, page0Raw: typedData, ts: Date.now() };
      } else {
        setPage((p) => p + 1);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      if (!opts?.append) setData([] as NotificationItem[]);
    } finally {
      loadingRef.current = false;
    }
  };

  // Defer icons to after interactions to minimize mount jank
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setIconsReady(true));
    return () => {
      // @ts-ignore: cancel might not exist on web
      if ((task as any)?.cancel) (task as any).cancel();
    };
  }, []);

  // Load local read/delete overlays from storage per user, then fetch inbox
  useEffect(() => {
    (async () => {
      try {
        const [storedRead, storedHidden] = await Promise.all([
          AsyncStorage.getItem(READ_IDS_KEY),
          AsyncStorage.getItem(HIDDEN_IDS_KEY),
        ]);
        const read = storedRead ? JSON.parse(storedRead) : [];
        const hidden = storedHidden ? JSON.parse(storedHidden) : [];
        setReadIds(read);
        setHiddenIds(hidden);
        // Use cache if fresh (< 2 minutes) and user matches
        const fresh = inboxCache && inboxCache.userId === (userId ?? null) && Date.now() - inboxCache.ts < 120000;
        if (fresh) {
          const scoped = filterForUser(inboxCache!.page0Raw);
          setData(applyOverlays(scoped, { read, hidden }));
          setPage(1);
        } else {
          await notiser({ read, hidden, page: 0, append: false });
        }
      } catch {
        setReadIds([]);
        setHiddenIds([]);
        await notiser({ read: [], hidden: [], page: 0, append: false });
      }
    })();
  }, [READ_IDS_KEY, HIDDEN_IDS_KEY , userId]);
  const notificationConfig: Record<
    string,
    { icon: keyof typeof Ionicons.glyphMap; color: string }
  > = {
    message: { icon: "chatbubble-ellipses-outline", color: "#3B82F6" },
    booking: { icon: "calendar-outline", color: "#8B5CF6" },
    warning: { icon: "warning-outline", color: "#F59E0B" },
    info: { icon: "information-circle-outline", color: "#0EA5E9" },
    success: { icon: "checkmark-circle-outline", color: "#10B981" },
    error: { icon: "close-circle-outline", color: "#EF4444" },
    offer: { icon: "pricetag-outline", color: "#F472B6" },
    delivery: { icon: "cube-outline", color: "#FBBF24" },
    service: { icon: "construct-outline", color: "#60A5FA" },
    security: { icon: "lock-closed-outline", color: "#F97316" },
    review: { icon: "star-outline", color: "#14B8A6" },
    system: { icon: "settings-outline", color: "#A78BFA" },
    default: { icon: "notifications-outline", color: "#3B82F6" },
  };

  const renderItem = useCallback(({ item, index }: { item: NotificationItem; index: number }) => {
    const { icon, color } =
      notificationConfig[item.type || item.category || 'default'] || notificationConfig.default;

    const handlePress = () => {
      if (!item.read) {
        const notificationId = item.id || item.notification_id;
        if (notificationId) {
          markItemAsRead(notificationId);
        }
      }
    };

    return (
      <Animated.View
        key={item.id || item.notification_id}
        entering={FadeInUp}
        exiting={FadeOutDown}
        className="flex-row items-start gap-3 py-2"
      >
        <TouchableOpacity
          className="flex-1 flex-row items-start p-2"
          onPress={handlePress}
          onLongPress={() => deleteItem(item.id || item.notification_id)}
          delayLongPress={300}
        >
          {iconsReady ? (
            <Ionicons
              name={icon}
              size={22}
              color={item.read ? "#A3A3A3" : color}
              style={{ marginRight: 12, marginTop: 12 }}
            />
          ) : (
            <View style={{ width: 22, height: 22, marginRight: 12, marginTop: 12 }} />
          )}
          <View className="flex-1 mx-1 my-2">
            <AutoText
              className={`text-base font-bold capitalize ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {item.title || 'No Title'}
            </AutoText>
            <AutoText
              className={`text-sm mt-1 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {item.message || 'No Message'}
            </AutoText>
            <TranslatableDateText 
              dateString={item.date || item.date_sent}
              className={`text-xs mt-3 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Delete notification"
          onPress={() => deleteItem(item.id || item.notification_id)}
          className="p-3"
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }, [isDark, markItemAsRead, deleteItem]);

  const keyExtractor = useCallback((item: any, index: number) => `${item.id || item.notification_id || index}`, []);
  const getItemLayout = useCallback((_: any, index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }), []);

  const onRefresh = async () => {
    setRefreshing(true);
    await notiser({ page: 0, append: false });
    setRefreshing(false);
    showAlert("Uppdaterad", "Notifikationerna har uppdaterats");
  };

  const markLastNotification = () => {
    if (notifications.length === 0) return;
    const lastId = notifications[notifications.length - 1].id;
    if (lastId) {
      markAsRead(lastId);
    }
  };


  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <View className="px-6 py-4 relative">
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full p-2 absolute left-6 top-1/2 -translate-y-1/2"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#111"}
          />
        </TouchableOpacity>
        <View className="items-center">
          <AutoText
            className={`text-2xl font-bold mt-1 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Notifikationer
          </AutoText>
          <AutoText
            className={`text-center text-sm mt-5 mb-2 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Här hittar du alla dina senaste aviseringar
          </AutoText>
        </View>
        <View className="flex-row justify-end items-center">
          {hasUnread && (
            <TouchableOpacity
              onPress={() => {
                // Mark all as read locally and in context
                const allIds = Array.from(new Set([
                  ...readIds,
                  ...data.map((n) => getId(n)),
                ]));
                setReadIds(allIds);
                saveReadIds(allIds);
                setData((prev) => prev.map((n) => ({ ...n, read: true })));
                markAllAsRead();
              }}
              className="p-2"
            >
              <AutoText className="text-sm text-blue-500 font-medium">
                Läs alla
              </AutoText>
            </TouchableOpacity>
          )}

        </View>
      </View>

      <View className="flex-1 px-6 mt-5">
        {(data.length === 0 && notifications.length === 0) ? (
          <View className="flex-1 justify-center items-center">
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <AutoText
              className={`mt-4 text-base ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Inga notifikationer just nu
            </AutoText>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
            getItemLayout={getItemLayout}
            onEndReachedThreshold={0.3}
            onEndReached={() => {
              notiser({ page, append: true });
            }}
          />
        )}
      </View>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
