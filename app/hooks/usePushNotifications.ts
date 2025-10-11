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

// Notification handler is now managed in NotificationContext.tsx

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
      console.log('🔄 Starting Native Notify inbox sync...');

      // Check if we're in Expo Go (limited native module support)
      const isExpoGo = Platform.OS === 'web' || !Device.isDevice;
      console.log('📱 Is Expo Go:', isExpoGo);

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
      console.log('🔑 Using App ID: 32172, Token: PNF5T5VibvtV6lj8i7pbil');

      const inboxResp = await getNotificationInbox(32172, "PNF5T5VibvtV6lj8i7pbil", 10, 99);
      console.log('📬 Raw inbox response:', JSON.stringify(inboxResp, null, 2));

      // Handle different API response formats - sometimes direct array, sometimes wrapped in data
      const inbox = Array.isArray(inboxResp) ? inboxResp : (inboxResp?.data ?? []);
      console.log('📬 Processed inbox:', inbox.length, 'notifications');

      if (inbox.length > 0) {
        console.log('📋 First notification sample:', JSON.stringify(inbox[0], null, 2));
      }

      const mapped = inbox.map((n: any) => ({
        id: n.notification_id.toString(),
        title: n.title,
        message: n.message,
        type: n.category ?? "default",
        read: n.read ?? false,
        date: n.date ?? n.date_sent ?? new Date().toISOString(),
      }));

      console.log('✅ Mapped notifications:', mapped.length);
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

   console.log('🔄 Initializing push notifications...');
   console.log('📱 Platform:', Platform.OS);
   console.log('🔍 Is device:', Device.isDevice);
   console.log('👤 User ID:', userId);

   // Only register for push notifications on native platforms
   if (Platform.OS !== 'web') {
     registerForPushNotificationsAsync().then(async (token) => {
       console.log('📲 Push token result:', token ? 'SUCCESS' : 'FAILED');
       if (token) {
         console.log('🔑 Expo push token:', token.substring(0, 20) + '...');
         setExpoPushToken(token);

         // Register user with Native Notify if we have a userId
         if (userId && userId.trim()) {
           try {
             console.log('🚀 Registering user with Native Notify...');
             console.log('👤 User ID:', userId);
             console.log('🔑 Token preview:', token.substring(0, 20) + '...');

             const registerResult = await nativeNotifyAPI.registerUser(userId, token);
             console.log('✅ User registration result:', registerResult);

             if (!registerResult.success) {
               console.error('❌ User registration failed:', registerResult.error);
               // Try to register again after a short delay in case of temporary issues
               setTimeout(async () => {
                 console.log('🔄 Retrying user registration...');
                 const retryResult = await nativeNotifyAPI.registerUser(userId, token);
                 console.log('✅ Retry registration result:', retryResult);
               }, 2000);
             }
           } catch (error) {
             console.error('❌ Failed to register user with Native Notify:', error);
           }
         } else {
           console.log('⚠️ No valid userId available for Native Notify registration');
         }
       } else {
         console.error('❌ No push token received from Expo');
       }
     }).catch((error) => {
       console.error('❌ Push notification registration failed:', error);
       // Don't show alert for Expo Go failures, just log
     });
   } else {
     console.log('🌐 Skipping push notifications on web platform');
   }

   syncNativeNotifyInbox();

    // Listen for foreground notifications
    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log('🔔 Foreground notification received:', JSON.stringify(notification, null, 2));
        const newNotification: NotificationItem = {
          id: notification.request.identifier,
          title: notification.request.content.title ?? "No title",
          message: notification.request.content.body ?? "",
          type: (notification.request.content.data as any)?.type ?? "general",
          read: false,
          date: new Date().toISOString() as any ,
        };
        console.log('📝 Adding notification to state:', newNotification);
        addNotification(newNotification);
        saveNotifications([newNotification]);
        const newCount = unreadCount + 1;
        setUnreadCount(newCount);
        await saveUnreadCount(newCount);
        console.log('✅ Notification processed, new count:', newCount);
      }
    );

    // User taps notification
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        console.log('👆 Notification response received:', JSON.stringify(response, null, 2));
        const notifId = response.notification.request.identifier;
        console.log('📖 Marking notification as read:', notifId);
        markAsRead(notifId);
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        await saveUnreadCount(newCount);
        console.log('✅ Notification marked as read, new count:', newCount);
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

  // Test function to send a notification directly
  const testNotification = async () => {
    if (!userId) {
      console.log('❌ No userId available for test notification');
      return;
    }

    try {
      console.log('🧪 Sending test notification...');

      // For Expo Go testing, also add to local notifications
      const isExpoGo = Platform.OS === 'web' || !Device.isDevice;
      if (isExpoGo) {
        console.log('🧪 Expo Go detected - adding local test notification');
        const testNotif = {
          id: `test-${Date.now()}`,
          title: 'Test Notification',
          message: 'This is a test notification from the app',
          type: 'test',
          read: false,
          date: new Date().toISOString(),
        };
        addNotification(testNotif);
        saveNotifications([testNotif]);
        const newCount = unreadCount + 1;
        setUnreadCount(newCount);
        await saveUnreadCount(newCount);
        return { success: true, message: 'Local test notification added' };
      }

      // For real devices, send via Native Notify
      const result = await nativeNotifyAPI.sendNotification({
        title: 'Test Notification',
        message: 'This is a test notification from the app',
        subID: userId,
        pushData: { type: 'test', timestamp: new Date().toISOString() }
      });
      console.log('🧪 Test notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return { expoPushToken, unreadCount, syncNativeNotifyInbox, testNotification };
}

// Register Expo Push Notifications
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  console.log('🚀 Starting push notification registration...');

  // Skip push notification registration on web unless VAPID is configured
  if (Platform.OS === 'web') {
    console.log('🌐 Push notifications are not supported on web without VAPID configuration');
    return;
  }

  console.log('📱 Checking if device:', Device.isDevice);
  if (!Device.isDevice) {
    console.log('📱 Not a real device - Expo Go detected, push notifications not available');
    console.log('💡 To test push notifications, build a development build: npx expo run:ios or npx expo run:android');
    // Don't show alert in Expo Go, just log the information
    return;
  }

  console.log('🔐 Checking notification permissions...');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('🔐 Existing permission status:', existingStatus);

  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    console.log('🔐 Requesting permissions...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('🔐 Permission request result:', finalStatus);
  }

  if (finalStatus !== "granted") {
    console.log('❌ Permission not granted, showing alert');
    showAlert("Push notifications", "Permission not granted.");
    return;
  }

  console.log('🔑 Getting Expo push token...');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || "c7b65ce0-2aa6-4b42-b6d7-4f04277bc839";
  console.log('📋 Using project ID:', projectId);

  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    console.log('✅ Push token obtained successfully');

    // Android channel
    if (Platform.OS === "android") {
      console.log('🤖 Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
      console.log('✅ Android channel configured');
    }

    return tokenResp.data;
  } catch (error) {
    console.error('❌ Failed to get push token:', error);
    return undefined;
  }
}