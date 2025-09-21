// app/hooks/usePushNotifications.ts
import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useNotifications } from "@/app/context/NotificationContext";
import { showAlert } from "../utils/showAlert";

// Set notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,     // show alert even when app is foreground
    shouldPlaySound: true,     // play sound
    shouldSetBadge: false,     // don't update app badge
    shouldShowBanner: true,    // show banner (iOS)
    shouldShowList: true,      // show in notification list (iOS)
  }),
});

export default function usePushNotifications() {
  const { addNotification } = useNotifications();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  useEffect(() => {
    // Register for push notifications and get token
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        console.log("Expo push token:", token);
        setExpoPushToken(token);
        // You can also send the token to your backend here
      }
    })();

    // Foreground notifications
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;
        addNotification({
          type: (data?.type as string) || "info",
          title: title || (data?.title as string) || "Notification",
          message: body || (data?.message as string) || "",
        });
      }
    );

    // User taps a notification
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Notification response data:", data);
        // You can navigate based on data.screen or similar here
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return { expoPushToken };
}

// Helper to register for push notifications
export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  if (!Device.isDevice) {
    showAlert(
      "Push notifications",
      "Must use a physical device to receive push notifications."
    );
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

  const tokenResp = await Notifications.getExpoPushTokenAsync();
  const token = tokenResp.data;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}