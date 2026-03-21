import { useState, useEffect, useRef, useCallback } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform, Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotifications } from "@/app/context/NotificationContext";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { client } from "@/sanityClient";
// Removed static import of native-notify to prevent 'missing navigation context' error
// during initial module load. Functions will be required dynamically.

const NOTIFICATIONS_KEY = "user_notifications_list";
const UNREAD_COUNT_KEY = "notification_unread_count";
const APP_ID = 32172;
const APP_TOKEN = "PNF5T5VibvtV6lj8i7pbil";

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  return (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })
  ).data;
}

export const usePushNotifications = (userId?: string | number | null) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { addMultipleNotifications, markAsRead } = useNotifications();

  const isRealDevice = Device.isDevice;
  const isUsingOneSignal =
    process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID && !Constants.appOwnership;

  const saveNotifications = async (notifs: any[]) => {
    try {
      const existing = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const list = existing ? JSON.parse(existing) : [];
      const merged = [...notifs, ...list];
      const unique = Array.from(
        new Map(merged.map((n) => [n.id || n.notification_id, n])).values(),
      );
      await AsyncStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(unique.slice(0, 100)),
      );
    } catch {}
  };

  const saveUnreadCount = async (count: number) => {
    try {
      await AsyncStorage.setItem(UNREAD_COUNT_KEY, count.toString());
    } catch {}
  };

  const syncSanityNotifications = useCallback(async () => {
    // Fetch from Sanity (Main source now)
    try {
      const sanityData = await client.fetch(
        `*[_type == "notificationHistory"] | order(sentAt desc)[0...50]{ 
           ..., 
           "id": _id, 
           "title": title, 
           "message": message, 
           "type": type, 
           "date": sentAt, 
           "image": imageUrl,
           "video": videoUrl 
         }`
      );
      if (Array.isArray(sanityData)) {
        const sanityMapped = sanityData.map((n: any) => ({
          id: n.id || n._id,
          title: n.title || "Update",
          message: n.message || "",
          type: n.type || "admin_broadcast",
          isSanity: true,
          read: false,
          date: n.date || n._createdAt,
          image: n.image,
          video: n.video,
        }));
        
        if (sanityMapped.length > 0) {
          addMultipleNotifications(sanityMapped);
          saveNotifications(sanityMapped);
          // Estimate unread based on what we don't have in local state yet
          setUnreadCount(sanityMapped.filter(n => !n.read).length);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch Sanity notifications:", e);
    }
  }, [addMultipleNotifications]);

  const handleIncomingNotification = async (notification: any) => {
    setUnreadCount((prev) => prev + 1);
  };

  // 1. Initial Load
  useEffect(() => {
    const loadData = async () => {
      // Load count
      const count = await AsyncStorage.getItem(UNREAD_COUNT_KEY);
      if (count) setUnreadCount(parseInt(count));

      // Load stored notifications
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        try {
          const list = JSON.parse(stored);
          if (Array.isArray(list) && list.length > 0) {
            addMultipleNotifications(list);
          }
        } catch {}
      }

      syncSanityNotifications();
    };
    loadData();
  }, [syncSanityNotifications, addMultipleNotifications]);

  // 2. Registration & AppState
  useEffect(() => {
    if (isRealDevice) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          if (userId) {
             // Save token to Sanity user document
             try {
                const users = await client.fetch('*[_type == "users" && clerkId == $id]', { id: userId.toString() });
                if (users.length > 0) {
                   await client.patch(users[0]._id).set({ expoPushToken: token }).commit();
                   console.log("✅ Expo token saved to Sanity for user:", userId);
                }
             } catch (e) {
                console.warn("❌ Failed to save token to Sanity:", e);
             }
             
             // Optionally keep NN as backup if it somehow still works occasionally
             nativeNotifyAPI.registerUser(userId.toString(), token).catch(() => {});
          }
        }
      });
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncSanityNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userId, isRealDevice, syncSanityNotifications]);

  // 3. Notification Listeners
  useEffect(() => {
    let notificationListener: any = null;
    let responseListener: any = null;

    if (Notifications) {
      notificationListener = Notifications.addNotificationReceivedListener(
        handleIncomingNotification,
      );
      responseListener = Notifications.addNotificationResponseReceivedListener(
        async (response: any) => {
          const id = response.notification.request.identifier;
          markAsRead(id);
          setUnreadCount((prev) => Math.max(0, prev - 1));
        },
      );
    }

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, [markAsRead]);

  return {
    expoPushToken,
    unreadCount,
    setUnreadCount,
    markAsRead,
    syncNativeNotifyInbox: syncSanityNotifications, // Alias for backward compatibility
  };
};
