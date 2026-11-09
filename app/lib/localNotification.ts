import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Local notification presentation.
 *
 * Remote push cannot be fully exercised on a simulator: iOS simulators never
 * receive an APNs token and a plain Android emulator has no Play services. A
 * locally scheduled notification goes through the exact same native pipeline
 * (permission, channel, handler, banner, shade, badge), so it is the reliable
 * way to see and verify the notification UI on a simulator.
 */

let Notifications: any = null;

const isExpoGoAndroid =
  Platform.OS === "android" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGoAndroid) {
  try {
    Notifications = require("expo-notifications");
  } catch {
    Notifications = null;
  }
}

/** Must match `defaultChannel` in app.config.js. */
export const DEFAULT_CHANNEL_ID = "default";

export function notificationsAvailable() {
  return Notifications != null;
}

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android" || !Notifications?.setNotificationChannelAsync) {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: "General",
      importance: 4, // HIGH — heads-up banner
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F2761B",
      sound: "default",
      showBadge: true,
    });
  } catch (error) {
    console.warn("⚠️ Could not create notification channel:", error);
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return Boolean(requested.granted);
  } catch (error) {
    console.warn("⚠️ Could not request notification permission:", error);
    return false;
  }
}

export type LocalNotificationInput = {
  title?: string;
  body?: string;
  type?: string;
  route?: string;
  /** Image shown inside the notification itself, when the platform supports it. */
  imageUrl?: string;
};

export type LocalNotificationResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unavailable" | "permission" | "error"; error?: unknown };

/**
 * Remove one delivered notification from the system tray.
 *
 * A push the customer swipes away in the app can still sit in the phone's
 * notification shade. The native identifier is the precise handle; when an item
 * came from a sync it has none, so title/body are matched instead.
 */
export async function dismissFromTray(target: {
  nativeId?: string;
  title?: string;
  message?: string;
}): Promise<number> {
  if (!Notifications) return 0;

  let dismissed = 0;

  try {
    if (target.nativeId && Notifications.dismissNotificationAsync) {
      await Notifications.dismissNotificationAsync(target.nativeId);
      dismissed += 1;
    }
  } catch {
    // Already gone, or not supported on this platform.
  }

  if (!Notifications.getPresentedNotificationsAsync) return dismissed;

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    const title = (target.title ?? "").trim().toLowerCase();
    const body = (target.message ?? "").trim().toLowerCase();
    if (!title) return dismissed;

    for (const presentedItem of presented ?? []) {
      const content = presentedItem?.request?.content ?? {};
      const sameTitle = String(content.title ?? "").trim().toLowerCase() === title;
      const sameBody = !body || String(content.body ?? "").trim().toLowerCase() === body;

      if (sameTitle && sameBody) {
        await Notifications.dismissNotificationAsync(
          presentedItem.request.identifier,
        );
        dismissed += 1;
      }
    }
  } catch {
    // Best effort: the inbox deletion is what the customer asked for.
  }

  return dismissed;
}

/** Clear every delivered notification from the shade ("clear all"). */
export async function dismissAllFromTray(): Promise<boolean> {
  if (!Notifications?.dismissAllNotificationsAsync) return false;
  try {
    await Notifications.dismissAllNotificationsAsync();
    return true;
  } catch {
    return false;
  }
}

/** Present a notification right now, through the native presentation pipeline. */
export async function presentLocalNotification({
  title,
  body,
  type,
  route,
  imageUrl,
}: LocalNotificationInput = {}): Promise<LocalNotificationResult> {
  if (!Notifications) return { ok: false, reason: "unavailable" };

  await ensureAndroidNotificationChannel();

  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: "permission" };

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title?.trim() || "Tunisiska Mega",
        body: body?.trim() || "Testnotis från appen.",
        sound: "default",
        ...(imageUrl
          ? { attachments: [{ identifier: `media-${Date.now()}`, url: imageUrl, type: "image" }] }
          : {}),
        data: {
          type: type ?? "general",
          route,
          notificationId: `local-${Date.now()}`,
          // Presented for testing only — never added to the customer inbox.
          test: true,
          local: true,
        },
      },
      // `null` presents the notification immediately.
      trigger: null,
    });

    return { ok: true, id };
  } catch (error) {
    console.warn("⚠️ Could not present local notification:", error);
    return { ok: false, reason: "error", error };
  }
}
