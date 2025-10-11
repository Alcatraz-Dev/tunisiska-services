import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotifications } from "@/app/context/NotificationContext";
import { showAlert } from "@/app/utils/showAlert";

import { getNotificationInbox, getUnreadNotificationInboxCount } from "native-notify";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { useAuth } from "@clerk/clerk-expo";
import { NotificationItem } from "../types/notification";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function usePushNotifications() {
  const { addNotification, addMultipleNotifications, markAsRead, markAllAsRead } =
    useNotifications();
  const { userId } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Persist notifications
  const saveNotifications = async (notifs: NotificationItem[]) => {
    await AsyncStorage.setItem("notifications", JSON.stringify(notifs));
  };
  const loadNotifications = async () => {
    const stored = await AsyncStorage.getItem("notifications");
    if (stored) addMultipleNotifications(JSON.parse(stored));
  };

  const saveUnreadCount = async (count: number) => {
    await AsyncStorage.setItem("unreadCount", count.toString());
    // Update app badge count - only on real devices, skip in Expo Go
    const isExpoGo = Platform.OS === 'web' || !Device.isDevice;
    if (!isExpoGo) {
      try {
        await Notifications.setBadgeCountAsync(count);
        console.log('✅ Badge count updated:', count);
      } catch (error) {
        console.error('❌ Failed to update badge count:', error);
      }
    } else {
      console.log('📱 Skipping badge count update in Expo Go/simulator');
    }
  };
  const loadUnreadCount = async () => {
    const stored = await AsyncStorage.getItem("unreadCount");
    if (stored) {
      const count = Number(stored);
      setUnreadCount(count);
      // Set badge count on app load - only on real devices, skip in Expo Go
      const isExpoGo = Platform.OS === 'web' || !Device.isDevice;
      if (!isExpoGo) {
        try {
          await Notifications.setBadgeCountAsync(count);
          console.log('✅ Badge count loaded:', count);
        } catch (error) {
          console.error('❌ Failed to load badge count:', error);
        }
      } else {
        console.log('📱 Skipping badge count load in Expo Go/simulator');
      }
    }
  };

  // Fetch Native Notify inbox
  const syncNativeNotifyInbox = async () => {
    try {
      // Check if we're in Expo Go (limited native module support)
      const isExpoGo = Platform.OS === 'web' || !Device.isDevice;

      if (isExpoGo) {
        console.log('📱 Running in Expo Go - using local notification state only');
        // In Expo Go, just ensure we have the latest local count
        const storedCount = await AsyncStorage.getItem("unreadCount");
        if (storedCount) {
          const count = Number(storedCount);
          setUnreadCount(count);
        }
        return;
      }

      console.log('🔄 Syncing Native Notify inbox...');
      const inboxResp = await getNotificationInbox(32172, "PNF5T5VibvtV6lj8i7pbil", 10, 99);

      // Handle different API response formats - sometimes direct array, sometimes wrapped in data
      const inbox = Array.isArray(inboxResp) ? inboxResp : (inboxResp?.data ?? []);
      console.log('📬 Inbox response:', inbox.length, 'notifications');

      const mapped = inbox.map((n: any) => ({
        id: n.notification_id.toString(),
        title: n.title,
        message: n.message,
        type: n.category ?? "default",
        read: n.read ?? false,
        date: n.date ?? n.date_sent ?? new Date().toISOString(),
      }));

      addMultipleNotifications(mapped);
      saveNotifications(mapped);

      // Handle unread count separately with proper error handling
      try {
        console.log('🔢 Getting unread count...');
        const unreadResp = await getUnreadNotificationInboxCount(32172, "PNF5T5VibvtV6lj8i7pbil");

        // Handle different API response formats more robustly
        let count = 0;
        if (unreadResp && typeof unreadResp === 'object') {
          if ('data' in unreadResp) {
            count = Number(unreadResp.data) || 0;
          } else if (typeof unreadResp === 'number') {
            count = unreadResp;
          } else {
            // If it's an object but doesn't have expected structure, log for debugging
            console.warn('Unexpected unread count response format:', unreadResp);
          }
        } else if (typeof unreadResp === 'number') {
          count = unreadResp;
        }

        console.log('📊 Unread count from API:', count);
        setUnreadCount(count);
        await saveUnreadCount(count);
      } catch (unreadErr) {
        console.warn("Failed to get unread count, using fallback", unreadErr);
        // Fallback: count unread notifications from inbox
        const unreadCount = mapped.filter((n: any) => !n.read).length;
        console.log('📊 Fallback unread count:', unreadCount);
        setUnreadCount(unreadCount);
        await saveUnreadCount(unreadCount);
      }
    } catch (err) {
      console.error("Native Notify sync failed", err);
      // Don't throw error, just log it to prevent app crashes
    }
  };

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Only register for push notifications on native platforms
    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          
          // Register user with Native Notify if we have a userId
          if (userId) {
            try {
              await nativeNotifyAPI.registerUser(userId, token);
              console.log('✅ User registered with Native Notify');
            } catch (error) {
              console.error('❌ Failed to register user with Native Notify:', error);
            }
          }
        }
      });
    }
    
    syncNativeNotifyInbox();

    // Listen for foreground notifications
    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const newNotification: NotificationItem = {
          id: notification.request.identifier,
          title: notification.request.content.title ?? "No title",
          message: notification.request.content.body ?? "",
          type: (notification.request.content.data as any)?.type ?? "general",
          read: false,
          date: new Date().toISOString() as any ,
        };
        addNotification(newNotification);
        saveNotifications([newNotification]);
        const newCount = unreadCount + 1;
        setUnreadCount(newCount);
        await saveUnreadCount(newCount);
      }
    );

    // User taps notification
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const notifId = response.notification.request.identifier;
        markAsRead(notifId);
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        await saveUnreadCount(newCount);
      });

    // Sync when app comes to foreground
    const appStateSub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        syncNativeNotifyInbox();
        // Optional: Clear badge when app opens (uncomment if desired)
        // await Notifications.setBadgeCountAsync(0);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
      appStateSub.remove();
    };
  }, []);

  return { expoPushToken, unreadCount, syncNativeNotifyInbox };
}

// Register Expo Push Notifications
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // Skip push notification registration on web unless VAPID is configured
  if (Platform.OS === 'web') {
    console.log('Push notifications are not supported on web without VAPID configuration');
    return;
  }

  if (!Device.isDevice) {
    showAlert("Push notifications", "Must use a physical device to receive push notifications.");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    showAlert("Push notifications", "Permission not granted.");
    return;
  }

  const tokenResp = await Notifications.getExpoPushTokenAsync({
    projectId: "c10467bd-bf7d-44c4-88e8-848ef7c4edbe",
  });

  // Android channel
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