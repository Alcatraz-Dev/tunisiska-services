import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useNotifications } from "@/app/context/NotificationContext";
import { showAlert } from "@/app/utils/showAlert";
import { getNotificationInbox, getUnreadNotificationInboxCount } from "native-notify";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { useAuth } from "@clerk/clerk-expo";
import { NotificationItem } from "../types/notification";

export default function usePushNotifications() {
  const { notifications, addNotification, addMultipleNotifications, markAsRead } = useNotifications();
  const { userId } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const isRealDevice = Platform.OS !== "web" && Device.isDevice;
  const isUsingOneSignal = isRealDevice && !!process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

  // Local storage helpers
  const saveNotifications = async (notifs: NotificationItem[]) => {
    await AsyncStorage.setItem("notifications", JSON.stringify(notifs));
  };
  const loadNotifications = async () => {
    const stored = await AsyncStorage.getItem("notifications");
    if (stored) addMultipleNotifications(JSON.parse(stored));
  };
  const saveUnreadCount = async (count: number) => {
    console.log("🔍 [NOTIFICATION] Saving unread count:", count);
    await AsyncStorage.setItem("unreadCount", count.toString());
    if (isRealDevice) {
      try {
        console.log("🔍 [NOTIFICATION] Setting badge count to:", count);
        await Notifications.setBadgeCountAsync(count);
      } catch (error) {
        console.warn("⚠️ Failed to set badge count:", error);
      }
    }
  };
  const loadUnreadCount = async () => {
    const stored = await AsyncStorage.getItem("unreadCount");
    console.log("🔍 [NOTIFICATION] Loading unread count from storage:", stored);
    if (stored) {
      const count = Number(stored);
      console.log("🔍 [NOTIFICATION] Setting unread count to:", count);
      setUnreadCount(count);
      if (isRealDevice) {
        try {
          console.log("🔍 [NOTIFICATION] Setting badge count to:", count);
          await Notifications.setBadgeCountAsync(count);
        } catch (error) {
          console.warn("⚠️ Failed to set badge count on load:", error);
        }
      }
    } else {
      console.log("🔍 [NOTIFICATION] No unread count in storage");
    }
  };

  // Sync Native Notify inbox
  const syncNativeNotifyInbox = async () => {
    if (!userId) {
      console.log("🔍 [NOTIFICATION] No userId, skipping sync");
      return;
    }
    try {
      console.log("🔍 [NOTIFICATION] Syncing Native Notify inbox for user:", userId);
      const inboxResp = await getNotificationInbox(32172, "PNF5T5VibvtV6lj8i7pbil", 50, 0);
      console.log("🔍 [NOTIFICATION] Inbox response:", inboxResp);
      const inbox = Array.isArray(inboxResp) ? inboxResp : (inboxResp && typeof inboxResp === 'object' && 'data' in inboxResp ? inboxResp.data : []) || [];
      console.log("🔍 [NOTIFICATION] Parsed inbox array:", inbox.length, "items");
      const userInbox = inbox.filter((n: any) => {
        const subId = n?.subscriber_id ?? n?.subscriberId ?? n?.user_id ?? n?.userId;
        console.log("🔍 [NOTIFICATION] Checking notification subId:", subId, "vs userId:", userId);
        return subId?.toString() === userId;
      });
      console.log("🔍 [NOTIFICATION] Filtered user inbox:", userInbox.length, "items");
      const mapped = userInbox.map((n: any) => ({
        id: n?.notification_id?.toString() || n?.id?.toString(),
        title: n?.title || "No Title",
        message: n?.message || "No Message",
        type: n?.category ?? "default",
        read: n?.read ?? false,
        date: n?.date ?? n?.date_sent ?? new Date().toISOString(),
        image: n?.image ?? n?.image_url,
      }));
      console.log("🔍 [NOTIFICATION] Mapped notifications:", mapped.length, "items");
      if (mapped.length > 0) {
        addMultipleNotifications(mapped);
        saveNotifications(mapped);
      }

      const unreadResp = await getUnreadNotificationInboxCount(32172, "PNF5T5VibvtV6lj8i7pbil");
      console.log("🔍 [NOTIFICATION] Unread count response:", unreadResp);
      const apiUnreadCount = typeof unreadResp === "number" ? unreadResp : (unreadResp && typeof unreadResp === 'object' && 'data' in unreadResp ? Number(unreadResp.data) : 0) || 0;
      console.log("🔍 [NOTIFICATION] Setting unread count to:", apiUnreadCount);
      setUnreadCount(apiUnreadCount);
      await saveUnreadCount(apiUnreadCount);
    } catch (err) {
      console.warn("Native Notify sync failed, continuing without it", err);
      // Don't throw error, just continue silently
    }
  };

  // Handle incoming notification
  const handleIncomingNotification = async (notif: any) => {
    console.log("🔍 [NOTIFICATION] Incoming notification:", JSON.stringify(notif, null, 2));
    const data = notif?.notification || notif?.request?.content?.data || {};
    const pushData = data?.pushData || data;
    const newNotification: NotificationItem = {
      id: notif.notificationId || notif.request?.identifier || `notif-${Date.now()}`,
      title: notif.title || notif.request?.content?.title || "No title",
      message: notif.body || notif.request?.content?.body || "",
      type: pushData?.notificationType || pushData?.type || data?.type || "general",
      read: false,
      date: new Date().toISOString() as any,
      image: data?.image ?? data?.bigPicture ?? data?.smallIcon,
      route: pushData?.route,
      screenImage: pushData?.screenImage,
    };
    console.log("🔍 [NOTIFICATION] Processed notification:", newNotification);
    addNotification(newNotification);
    saveNotifications([newNotification]);
    // Update unread count immediately
    const newCount = unreadCount + 1;
    console.log("🔍 [NOTIFICATION] Updating unread count:", unreadCount, "->", newCount);
    setUnreadCount(newCount);
    await saveUnreadCount(newCount);
    if (!isRealDevice) showAlert(newNotification.title, newNotification.message);
  };

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // OneSignal initialization
    if (isUsingOneSignal) {
      try {
        const OneSignal = require('react-native-onesignal');
        OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID);
        OneSignal.Notifications.addEventListener("opened", async (e: any) => {
          const id = e?.notification?.notificationId;
          if (id) {
            markAsRead(id);
            const newCount = Math.max(0, unreadCount - 1);
            setUnreadCount(newCount);
            await saveUnreadCount(newCount);
          }
        });
        OneSignal.Notifications.addEventListener("received", handleIncomingNotification);
      } catch (error) {
        console.warn('OneSignal not available:', error);
      }
    }

    // Expo push notifications
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) setExpoPushToken(token);
      if (token && userId) {
        await AsyncStorage.setItem(`expo_token_${userId}`, token);
        await nativeNotifyAPI.registerUser(userId, token);
        if (isUsingOneSignal) {
          try {
            const OneSignal = require('react-native-onesignal');
            OneSignal.User.addTag('userId', userId);
          } catch (error) {
            console.warn('OneSignal not available for user registration:', error);
          }
        }
      }
    });

    // Sync Native Notify inbox initially
    syncNativeNotifyInbox();

    // Expo foreground notifications
    const notificationListener = Notifications.addNotificationReceivedListener(handleIncomingNotification);
    const responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const id = response.notification.request.identifier;
      markAsRead(id);
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      await saveUnreadCount(newCount);
    });

    // App comes to foreground
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncNativeNotifyInbox();
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
      appStateSub.remove();
      if (isUsingOneSignal) {
        try {
          const OneSignal = require('react-native-onesignal');
          OneSignal.Notifications.removeEventListener("opened");
          OneSignal.Notifications.removeEventListener("received");
        } catch (error) {
          console.warn('OneSignal cleanup failed:', error);
        }
      }
    };
  }, [userId]); // Add userId as dependency to prevent stale closures

  const testNotification = async () => {
    if (!userId) return;
    const result = await nativeNotifyAPI.sendNotification({
      title: "Test Notification",
      message: "This is a test",
      subID: userId,
    });
    return result;
  };

  return {
    expoPushToken,
    unreadCount,
    syncNativeNotifyInbox,
    testNotification,
  };
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === "web" || !Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const tokenResp = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  return tokenResp.data;
}