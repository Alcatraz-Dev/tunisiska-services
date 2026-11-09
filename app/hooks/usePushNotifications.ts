import { useState, useEffect, useRef, useCallback } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";
import { useNotifications } from "@/app/context/NotificationContext";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { readPushMedia } from "@/app/lib/pushPayload";
import { ensureAndroidNotificationChannel } from "@/app/lib/localNotification";
import { client } from "@/sanityClient";
import {
  NotificationItem,
  isTestNotification,
  notificationKey,
} from "@/app/types/notification";

/** How many remote notifications the inbox mirrors (newest first). */
const REMOTE_LIMIT = 50;

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

/** Turn a delivered push into an inbox item. */
function itemFromPush(notification: any): NotificationItem | null {
  const content = notification?.request?.content;
  if (!content) return null;

  const data = content.data ?? {};
  const title = content.title ?? data.title ?? "Update";
  const message = content.body ?? data.message ?? "";

  // Media rides along in the data payload so the inbox shows it immediately,
  // without waiting for the next Sanity sync.
  const { image, videoUrl, mediaType } = readPushMedia(data);

  // Local test presentations are for the admin's own device only.
  if (data.test === true || data.local === true) return null;

  const item: NotificationItem = {
    id: data.notificationId ?? data.id ?? notification.request.identifier,
    notification_id: data.notificationId ?? data.id,
    title,
    message,
    type: data.type ?? "general",
    date: new Date(
      notification.date ?? notification.request.trigger?.timestamp ?? Date.now(),
    ).toISOString(),
    route: data.route,
    image,
    videoUrl,
    mediaType,
    read: false,
    // Keep the OS handle so deleting the inbox row can also clear the tray.
    nativeId: notification.request.identifier,
  };

  return isTestNotification(item) ? null : item;
}

export const usePushNotifications = (userId?: string | number | null) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const {
    addMultipleNotifications,
    addNotification,
    markAsRead,
    unreadCount,
    setNotifications,
  } = useNotifications();

  const syncing = useRef(false);

  const isRealDevice = Device.isDevice;

  const syncSanityNotifications = useCallback(async () => {
    // Fetch from Sanity (main source of the inbox)
    if (syncing.current) return;
    syncing.current = true;
    setIsSyncing(true);

    try {
      // Soft-deleted rows (status == "deleted") are tombstones: never show
      // them, and use them to purge cached copies on every device.
      const [sanityData, tombstones] = await Promise.all([
        client.fetch(
          `*[_type == "notificationHistory" && (!defined(status) || status != "deleted")] | order(coalesce(sentAt, dateSent, _createdAt) desc)[0...${REMOTE_LIMIT}]{ 
           ..., 
           "id": _id, 
           "title": title, 
           "message": message, 
           "type": coalesce(type, notificationType), 
           "date": coalesce(sentAt, dateSent), 
           "image": coalesce(posterUrl, imageUrl),
           "video": videoUrl 
         }`,
        ),
        client.fetch(
          `*[_type == "notificationHistory" && status == "deleted"]{ _id, nativeNotifyId }`,
        ).catch(() => []),
      ]);

      const deletedIds = new Set(
        (Array.isArray(tombstones) ? tombstones : [])
          .flatMap((t: any) => [t?._id, t?.nativeNotifyId])
          .filter(Boolean)
          .map(String),
      );

      const matchesDeleted = (item: any) =>
        deletedIds.has(String(item?.notification_id ?? "")) ||
        deletedIds.has(String(item?.id ?? "")) ||
        (typeof item?.id === "string" &&
          item.id.startsWith("sanity-") &&
          deletedIds.has(item.id.replace(/^sanity-/, "")));

      if (Array.isArray(sanityData)) {
        const mapped: NotificationItem[] = sanityData.map((n: any) => ({
          id: n.id || n._id,
          notification_id: n._id,
          title: n.title || "Update",
          message: n.message || "",
          type: n.type || "announcement",
          date: n.date || n.sentAt || n._createdAt,
          image: n.image,
          videoUrl: n.video,
          read: false,
          source: "remote",
        }));

        // The context keeps an item that was already read marked as read.
        addMultipleNotifications(mapped);

        // An admin deletion must disappear from the user inbox too — including
        // copies that arrived as a push (they carry no "remote" source, so
        // the orphan-prune below would keep them forever).
        if (deletedIds.size > 0) {
          setNotifications((previous) => {
            const next = previous.filter((item) => !matchesDeleted(item));
            return next.length === previous.length ? previous : next;
          });
        }

        // A notification deleted in the admin panel is gone from Sanity. Once
        // the complete list has been fetched, drop cached copies of rows that
        // no longer exist so the deletion reaches this device too.
        if (sanityData.length < REMOTE_LIMIT) {
          const remoteIds = new Set(mapped.map((item) => String(item.notification_id)));
          setNotifications((previous) => {
            const next = previous.filter(
              (item) =>
                matchesDeleted(item)
                  ? false
                  : item.source !== "remote" ||
                    remoteIds.has(String(item.notification_id ?? item.id)),
            );
            return next.length === previous.length ? previous : next;
          });
        }
      } else if (deletedIds.size > 0) {
        // Even when the inbox fetch fails, a known tombstone must still hide
        // its cached copy.
        setNotifications((previous) => {
          const next = previous.filter((item) => !matchesDeleted(item));
          return next.length === previous.length ? previous : next;
        });
      }
    } catch (e) {
      console.warn("Failed to fetch Sanity notifications:", e);
    } finally {
      syncing.current = false;
      setIsSyncing(false);
    }
  }, [addMultipleNotifications, setNotifications]);

  // Registration & foreground resync
  useEffect(() => {
    if (isRealDevice) {
      const register = async () => {
        try {
          // Android only shows a heads-up banner on a high-importance channel;
          // remote pushes land on `defaultChannel`, so it must exist at runtime.
          await ensureAndroidNotificationChannel();

          const token = await registerForPushNotificationsAsync();
          if (!token) return;
          setExpoPushToken(token);
          if (!userId) return;

          const clerkId = userId.toString();

          // Save token to the Sanity user document. A brand-new account may not
          // have a record yet, in which case create one — otherwise the first
          // sign-in on a phone would still leave the device unreachable.
          try {
            const users = await client.fetch<{ _id: string }[]>(
              '*[_type == "users" && clerkId == $id]{ _id }',
              { id: clerkId },
            );
            // Platform is stored so a send can be verified against a real
            // Android and a real iOS device instead of guessed.
            const device = {
              expoPushToken: token,
              pushPlatform: Platform.OS,
              pushUpdatedAt: new Date().toISOString(),
            };

            if (users.length > 0) {
              await client.patch(users[0]._id).set(device).commit();
            } else {
              await client.create({
                _type: "users",
                clerkId,
                ...device,
              });
            }
            console.log("✅ Expo token saved to Sanity for user:", clerkId);
          } catch (e) {
            console.warn("❌ Failed to save token to Sanity:", e);
          }

          nativeNotifyAPI.registerUser(clerkId, token).catch(() => {});
        } catch (e) {
          // Expo Go on Android cannot issue push tokens at all; the app still
          // works, it just cannot receive remote notifications there.
          console.warn("❌ Push registration failed:", e);
        }
      };

      void register();
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

  // Notification listeners
  useEffect(() => {
    let notificationListener: any = null;
    let responseListener: any = null;

    if (Notifications) {
      notificationListener = Notifications.addNotificationReceivedListener(
        (notification: any) => {
          // A push that arrives while the app is open belongs in the inbox too,
          // not just on the system tray.
          const item = itemFromPush(notification);
          if (item) addNotification(item);
        },
      );

      responseListener = Notifications.addNotificationResponseReceivedListener(
        async (response: any) => {
          const item = itemFromPush(response.notification);
          if (!item) return;

          addNotification(item);
          markAsRead(String(item.id ?? notificationKey(item)));
        },
      );
    }

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, [addNotification, markAsRead]);

  return {
    expoPushToken,
    unreadCount,
    isSyncing,
    markAsRead,
    syncNativeNotifyInbox: syncSanityNotifications, // Alias for backward compatibility
  };
};
