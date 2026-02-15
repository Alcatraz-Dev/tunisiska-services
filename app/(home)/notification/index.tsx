import { AutoText } from "@/app/components/ui/AutoText";
import { useNotifications } from "@/app/context/NotificationContext";
import { useTheme } from "@/app/context/ThemeContext";
import usePushNotifications from "@/app/hooks/usePushNotifications";
import { showAlert } from "@/app/utils/showAlert";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

// Conditionally import getNotificationInbox
const getNotificationInbox = (() => {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS === 'android' && isExpoGo) return null;

  try {
    return require("native-notify").getNotificationInbox;
  } catch {
    return null;
  }
})();

import {
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
  InteractionManager,
  Image,
  ActivityIndicator,
} from "react-native";
import VideoPlayer from "@/app/components/VideoPlayer";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { TranslatableDateText } from "@/app/utils/dateFormat";
import {
  NOTIFICATION_TYPE_CONFIGS,
  NotificationItem,
  NotificationType,
} from "@/app/types/notification";

export default function Notification() {
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const { unreadCount, syncNativeNotifyInbox } = usePushNotifications();
  const { resolvedTheme } = useTheme();
  const APP_ID = 32172;
  const APP_TOKEN = "PNF5T5VibvtV6lj8i7pbil";
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { userId } = useAuth();
  const [data, setData] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [readIds, setReadIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [iconsReady, setIconsReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const loadingRef = useRef(false);
  const ROW_HEIGHT = 88;

  const loadNextPage = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    await notiser({ page, append: true });
    loadingRef.current = false;
  };
  const READ_IDS_KEY = useMemo(
    () => `notification_read_ids:${userId ?? "anon"}`,
    [userId]
  );
  const HIDDEN_IDS_KEY = useMemo(
    () => `notification_hidden_ids:${userId ?? "anon"}`,
    [userId]
  );
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const response = getNotificationInbox
            ? await getNotificationInbox(APP_ID, APP_TOKEN, PAGE_SIZE, 0)
            : [];
          const notifications: NotificationItem[] = (response);
          setData(applyOverlays(filterForUser(notifications)));
        } catch (err) {
          console.error("Failed fetching notifications:", err);
        }
      })();
    }, [userId])
  );
  const getId = (n: NotificationItem) =>
    ((n.id || n.notification_id) ?? "").toString();

  const filterForUser = (items: any[]): NotificationItem[] => {
    if (!userId) return items as NotificationItem[];
    const keys = [
      "subscriber_id",
      "subscriberId",
      "user_id",
      "userId",
      "indie_id",
      "indieId",
      "sub_id",
      "subId",
    ];
    const hasAnyKey = items.some((it) =>
      keys.some((k) => it && typeof it === "object" && k in it)
    );
    if (!hasAnyKey) return items as NotificationItem[];
    const isBroadcast = items.some((it) =>
      ["admin_broadcast", "announcement"].includes(
        it?.type || it?.category || it?.pushData?.type
      )
    );
    if (isBroadcast) return items as NotificationItem[];
    return items.filter((it) => {
      const hasUserKey = keys.some((k) => it?.[k] !== undefined);
      if (!hasUserKey) return true;
      return keys.some((k) => it?.[k]?.toString?.() === userId?.toString());
    }) as NotificationItem[];
  };

  const applyOverlays = (
    items: NotificationItem[],
    opts?: { read?: string[]; hidden?: string[] }
  ) => {
    const readSet = new Set(opts?.read ?? readIds);
    const hiddenSet = new Set(opts?.hidden ?? hiddenIds);
    return items
      .filter((n) => !hiddenSet.has(getId(n)))
      .map(
        (n) =>
          ({ ...n, read: n.read || readSet.has(getId(n)) }) as NotificationItem
      );
  };

  const saveReadIds = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(ids));
    } catch { }
  };
  const saveHiddenIds = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify(ids));
    } catch { }
  };

  const markItemAsRead = async (notificationId?: string) => {
    if (!notificationId) return;
    const idStr = notificationId.toString();
    setData((prev) =>
      prev.map((n) => (getId(n) === idStr ? { ...n, read: true } : n))
    );
    setReadIds((prev) => {
      if (prev.includes(idStr)) return prev;
      const next = [...prev, idStr];
      saveReadIds(next);
      return next;
    });
    try {
      markAsRead(notificationId);
    } catch { }
    try {
      if (getNotificationInbox) {
        const nn = require("native-notify");
        const candidates = [
          "handleRead",
          "setNotificationRead",
          "markNotificationAsRead",
          "readNotificationInbox",
        ];
        const fn = candidates.map((k) => nn?.[k]).find(Boolean);
        if (typeof fn === "function" && userId)
          await fn(userId.toString(), idStr, APP_ID, APP_TOKEN);
      }
    } catch { }
  };

  const deleteItem = async (notificationId?: string) => {
    if (!notificationId) return;
    const idStr = notificationId.toString();
    setData((prev) => prev.filter((n) => getId(n) !== idStr));
    try {
      if (getNotificationInbox) {
        const nn = require("native-notify");
        const candidates = [
          "handleDelete",
          "deleteNotificationInbox",
          "removeNotificationInbox",
        ];
        const fn = candidates.map((k) => nn?.[k]).find(Boolean);
        if (typeof fn === "function" && userId)
          await fn(userId.toString(), idStr, APP_ID, APP_TOKEN);
      }
    } catch { }
    setHiddenIds((prev) => {
      if (prev.includes(idStr)) return prev;
      const next = [...prev, idStr];
      saveHiddenIds(next);
      return next;
    });
  };

  const notiser = async (opts?: {
    read?: string[];
    hidden?: string[];
    page?: number;
    append?: boolean;
  }) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!opts?.append) setLoading(true); // Show loading only for initial load
    try {
      const currentPage = opts?.page ?? 0;
      const response = getNotificationInbox
        ? await getNotificationInbox(
          APP_ID,
          APP_TOKEN,
          PAGE_SIZE,
          currentPage * PAGE_SIZE
        )
        : [];
      const notificationData = response?.data || response || [];
      const typedData: NotificationItem[] = Array.isArray(notificationData)
        ? notificationData.map((n: any) => {
          let imageUrl =
            n.image ?? n.image_url ?? n.photo ?? n.picture ?? n.bigPictureURL;
          let screenImageUrl = imageUrl,
            routeUrl = undefined,
            mediaType = "image",
            videoUrl = undefined;
          if (n.pushData) {
            try {
              const pushData =
                typeof n.pushData === "string"
                  ? JSON.parse(n.pushData)
                  : n.pushData;
              console.log("📦 Push data:", pushData);
              screenImageUrl =
                pushData.screenImage || pushData.image || imageUrl;
              routeUrl = pushData.route;
              mediaType = pushData.mediaType || "image";
              videoUrl = pushData.videoUrl;

              // Extract the real notification type from pushData if available
              if (
                pushData.notificationType &&
                NOTIFICATION_TYPE_CONFIGS.hasOwnProperty(
                  pushData.notificationType
                )
              ) {
                n.type = pushData.notificationType;
                console.log(
                  "🔄 Updated notification type from pushData:",
                  n.type
                );
              }
            } catch (e) {
              console.warn("Failed to parse pushData:", n.pushData, e);
            }
          }
          return {
            id: n.notification_id?.toString() || n.id?.toString(),
            notification_id: n.notification_id?.toString(),
            title: n.title,
            message: n.message,
            type: n.category ?? n.type ?? "general",
            category: n.category ?? n.type,
            read: n.read ?? false,
            date: n.date ?? n.date_sent ?? new Date().toISOString(),
            date_sent: n.date_sent ?? n.date,
            image: imageUrl,
            screenImage: screenImageUrl,
            route: routeUrl,
            mediaType,
            videoUrl,
          };
        })
        : [];
      const scoped = filterForUser(typedData);
      const processed = applyOverlays(scoped, opts);
      setData((prev) => (opts?.append ? [...prev, ...processed] : processed));
      if (!opts?.append) {
        setPage(1);
      } else setPage((p) => p + 1);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      if (!opts?.append) setData([]);
    } finally {
      loadingRef.current = false;
      if (!opts?.append) setLoading(false); // Hide loading after initial load completes
    }
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() =>
      setIconsReady(true)
    );
    return () => {
      if ((task as any)?.cancel) (task as any).cancel();
    };
  }, []);

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
        await notiser({ read, hidden, page: 0, append: false });
      } catch {
        setReadIds([]);
        setHiddenIds([]);
        await notiser({ read: [], hidden: [], page: 0, append: false });
      }
    })();
  }, [READ_IDS_KEY, HIDDEN_IDS_KEY, userId]);

  // Reusable function for icons
  const resolveIcon = (item: NotificationItem) => {
    let type: NotificationType = "general";

    // Priority: route-based detection (announcements), then type field, then category field
    if (item.route?.includes("announcements")) {
      type = "announcement";
    } else if (
      item.type &&
      NOTIFICATION_TYPE_CONFIGS.hasOwnProperty(item.type)
    ) {
      type = item.type as NotificationType;
    } else if (
      item.category &&
      NOTIFICATION_TYPE_CONFIGS.hasOwnProperty(item.category)
    ) {
      type = item.category as NotificationType;
    }

    // For admin notifications, check if we can determine the real type from pushData
    if (
      type === "general" &&
      (item.type === ("admin_broadcast" as any) ||
        item.category === ("admin_broadcast" as any))
    ) {
      // Admin broadcasts might have the real type in pushData
      console.log(
        "Admin broadcast detected, checking for real notification type"
      );
    }

    console.log("🎨 Icon resolution for:", item.title, {
      route: item.route,
      itemType: item.type,
      itemCategory: item.category,
      resolvedType: type,
      hasConfig: NOTIFICATION_TYPE_CONFIGS.hasOwnProperty(type),
    });

    const { icon, color } = NOTIFICATION_TYPE_CONFIGS[type];
    return { icon, color };
  };

  const renderItem = useCallback(
    ({ item, index }: { item: NotificationItem; index: number }) => {
      const { icon, color } = resolveIcon(item);
      console.log(
        "🎨 Rendering notification:",
        item.title,
        "with icon:",
        icon,
        "color:",
        color
      );
      const handlePress = () => {
        if (!item.read) markItemAsRead(item.id || item.notification_id);
        if (item.route)
          router.push(
            typeof item.route === "string"
              ? item.route
              : (String(item.route) as any)
          );
      };

      return (
        <Animated.View
          key={item.id || item.notification_id}
          entering={FadeInUp}
          exiting={FadeOutDown}
          className="flex-row items-start gap-3 py-2 my-2"
          style={{
            borderBottomWidth: index < data.length - 1 ? 0.5 : 0,
            borderBottomColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)",
          }}
        >
          <TouchableOpacity
            className="flex-1 flex-row items-start p-2"
            onPress={handlePress}
            onLongPress={() => deleteItem(item.id || item.notification_id)}
            delayLongPress={300}
          >
            {iconsReady ? (
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={item.read ? "#A3A3A3" : color}
                style={{ marginRight: 12, marginTop: 12 }}
              />
            ) : (
              <View
                style={{
                  width: 22,
                  height: 22,
                  marginRight: 12,
                  marginTop: 12,
                }}
              />
            )}
            <View className="flex-1 mx-1 my-3">
              <AutoText
                className={`text-sm font-bold capitalize my-1 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {item.title || "No Title"}
              </AutoText>
              <AutoText
                className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}
              >
                {item.message || "No Message"}
              </AutoText>
              <TranslatableDateText
                dateString={item.date || item.date_sent}
                className={`text-[9px] mt-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              />
            </View>
          </TouchableOpacity>
          {(item.screenImage || item.image || item.videoUrl) && (
            <View className="relative mt-5">
              {item.mediaType === "video" && item.videoUrl ? (
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <VideoPlayer uri={item.videoUrl} muted aspectRatio={1} />
                </View>
              ) : item.mediaType === "video" ? (
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                    backgroundColor: isDark ? "#1f2937" : "#f9fafb",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="videocam"
                    size={24}
                    color={isDark ? "#9ca3af" : "#6b7280"}
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: item.screenImage || item.image }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    resizeMode: "cover",
                    borderWidth: 1,
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                  }}
                />
              )}
            </View>
          )}
          <TouchableOpacity
            accessibilityLabel="Delete notification"
            onPress={() => deleteItem(item.id || item.notification_id)}
          >
            <Ionicons
              name="trash-outline"
              size={14}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [iconsReady, isDark, data.length]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => `${item.id || item.notification_id || index}`,
    []
  );
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setLoading(true); // Show loading during refresh
    await notiser({ page: 0, append: false });
    setRefreshing(false);
    setLoading(false); // Hide loading after refresh
    showAlert("Uppdaterad", "Notifikationerna har uppdaterats");
  };
  const hasUnread = data.some((n) => !n.read);

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
            className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Notifikationer
          </AutoText>
          <AutoText
            className={`text-center text-sm mt-5 mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            Här hittar du alla dina senaste aviseringar
          </AutoText>
        </View>
        <View className="flex-row justify-end items-center">
          {hasUnread && (
            <TouchableOpacity
              onPress={() => {
                const allIds = Array.from(
                  new Set([...readIds, ...data.map((n) => getId(n))])
                );
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
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator
              size="small"
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <AutoText
              className={`mt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Laddar notifikationer...
            </AutoText>
          </View>
        ) : data.length === 0 && notifications.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={isDark ? "#6B7280" : "#9CA3AF"}
            />
            <AutoText
              className={`mt-4 text-lg font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              Inga notifikationer
            </AutoText>
            <AutoText
              className={`mt-2 text-sm text-center px-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Du har inga notifikationer just nu. Kom tillbaka senare för att se
              nya uppdateringar.
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
            onEndReached={() => notiser({ page, append: true })}
          />
        )}
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
