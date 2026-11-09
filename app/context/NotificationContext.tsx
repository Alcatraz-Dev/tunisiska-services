import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  NotificationItem,
  isTestNotification,
  notificationKey,
  notificationTimestamp,
} from "@/app/types/notification";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { dismissAllFromTray, dismissFromTray } from "@/app/lib/localNotification";

// Conditionally import expo-notifications
let Notifications: any = null;

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (Platform.OS === "android" && isExpoGo) {
  console.log(
    "📱 Skipping expo-notifications in Expo Go on Android (functionality removed in SDK 53)",
  );
} else {
  try {
    Notifications = require("expo-notifications");

    // Configure notification handler for production if module is available
    Notifications.setNotificationHandler({
      handleNotification: async (notification: any) => {
        // Always show notifications when app is in foreground
        // For background notifications, let the system decide based on user preferences
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
  } catch (error) {
    console.log("📱 expo-notifications not available or failed to load");
  }
}

const STORAGE_KEY = "user_notifications_list";
const ENABLED_KEY = "notificationsEnabled";
/** Ids the customer removed — they must never come back on the next sync. */
const DELETED_KEY = "user_deleted_notifications";
/** Enough history to scroll, small enough to keep hydration instant. */
const MAX_STORED = 100;
/** Deletions are tiny; cap the log so it cannot grow without bound. */
const MAX_DELETED = 300;

/**
 * Merge two lists of notifications by their stable key.
 *
 * Incoming items win on content (a Sanity edit must reach the list), but a
 * notification that has been read stays read — that is the only way marking as
 * read survives the foreground sync that re-fetches every item as unread.
 */
function mergeNotifications(
  current: NotificationItem[],
  incoming: NotificationItem[],
  deletedKeys: string[] = [],
): NotificationItem[] {
  const merged = new Map<string, NotificationItem>();
  const removed = new Set(deletedKeys);

  current.forEach((item) => merged.set(notificationKey(item), item));

  incoming.forEach((item) => {
    // A test presentation and a deleted notification both stay out of the list.
    if (isTestNotification(item)) return;
    const key = notificationKey(item);
    if (removed.has(key) || removed.has(item.id ?? "") || removed.has(item.notification_id ?? "")) {
      merged.delete(key);
      return;
    }
    const previous = merged.get(key);
    merged.set(key, {
      ...previous,
      ...item,
      read: Boolean(previous?.read || item.read),
    });
  });

  return Array.from(merged.values()).sort(
    (a, b) => notificationTimestamp(b) - notificationTimestamp(a),
  );
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  addNotification: (notif: NotificationItem) => void;
  addMultipleNotifications: (notifs: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  /** Remove one notification for this user, permanently. */
  deleteNotification: (id: string, item?: NotificationItem) => void;
  /** Remove every notification for this user, permanently. */
  clearAllNotifications: () => void;
  /** Ids this device has removed; synced items matching them are skipped. */
  deletedNotifications: string[];
  unreadCount: number;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  permissionStatus: any; // Notifications.NotificationPermissionsStatus | null
  requestPermissions: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<any>(null);
  const [deletedNotifications, setDeletedNotifications] = useState<string[]>([]);
  /** Mirrors `deletedNotifications` so callbacks never read a stale list. */
  const deletedRef = useRef<string[]>([]);
  /** Mirrors the list so "clear all" can read it without a stale closure. */
  const notificationsRef = useRef<NotificationItem[]>([]);
  /** Nothing is written back to storage until the saved list has been read. */
  const [hydrated, setHydrated] = useState(false);

  // Restore saved notifications (and their read flags) once per launch.
  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const [stored, storedDeleted] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(DELETED_KEY),
        ]);

        let deleted: string[] = [];
        if (storedDeleted) {
          const parsedDeleted = JSON.parse(storedDeleted);
          if (Array.isArray(parsedDeleted)) {
            deleted = parsedDeleted.filter((id): id is string => typeof id === "string");
          }
        }

        if (active) {
          // A deletion made while storage was still loading must survive it.
          const merged = Array.from(
            new Set([...deletedRef.current, ...deleted]),
          ).slice(0, MAX_DELETED);
          deletedRef.current = merged;
          setDeletedNotifications(merged);
        }

        if (stored) {
          const parsed = JSON.parse(stored);
          if (active && Array.isArray(parsed)) {
            setNotifications((previous) =>
              mergeNotifications(previous, parsed as NotificationItem[], deleted),
            );
          }
        }
      } catch (error) {
        console.warn("⚠️ Failed to load stored notifications:", error);
      } finally {
        if (active) setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  // Persist on every change so read state outlives the process.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        notifications.filter((item) => !isTestNotification(item)).slice(0, MAX_STORED),
      ),
    ).catch(() => {
      // Persistence is an optimisation; a failure must not break the UI.
    });
  }, [notifications, hydrated]);

  // Persist deletions so a synced notification never reappears after a restart.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(DELETED_KEY, JSON.stringify(deletedNotifications)).catch(
      () => {
        // Same as above: persistence is best-effort.
      },
    );
  }, [deletedNotifications, hydrated]);

  useEffect(() => {
    // Initialize permissions and load settings
    const initializeNotifications = async () => {
      try {
        const value = await AsyncStorage.getItem(ENABLED_KEY);
        if (value !== null) setNotificationsEnabled(value === "true");
      } catch (error) {
        console.warn("⚠️ Failed to load notification preferences:", error);
      }

      if (!Notifications) {
        console.log(
          "📱 Skipping notification initialization (Notifications module missing)",
        );
        return;
      }

      // Get current permission status
      try {
        const status = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
      } catch (error) {
        console.warn("⚠️ Failed to initialize notifications:", error);
      }
    };

    initializeNotifications();
  }, []);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  // The badge mirrors the list. Kept out of state updaters so it always runs
  // once per change rather than once per render pass.
  useEffect(() => {
    if (!Notifications || !permissionStatus?.granted || !notificationsEnabled) {
      return;
    }

    Notifications.setBadgeCountAsync(unreadCount).catch((error: any) => {
      console.warn("⚠️ Failed to set badge count:", error);
    });
  }, [unreadCount, permissionStatus, notificationsEnabled]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!Notifications) {
      console.log(
        "📱 Skipping permission request (Notifications module missing)",
      );
      return false;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: false,
          allowProvisional: false,
        },
      });

      const newStatus = await Notifications.getPermissionsAsync();
      setPermissionStatus(newStatus);

      return status === "granted" || newStatus.granted;
    } catch (error) {
      console.error("❌ Error requesting permissions:", error);
      return false;
    }
  }, []);

  const saveNotificationsEnabled = useCallback(
    async (value: boolean) => {
      if (value && permissionStatus && !permissionStatus.granted) {
        const granted = await requestPermissions();
        if (!granted) {
          console.log(
            "⚠️ Permissions not granted, keeping notifications disabled",
          );
          return;
        }
      }

      setNotificationsEnabled(value);
      AsyncStorage.setItem(ENABLED_KEY, value.toString()).catch(() => {});
    },
    [permissionStatus, requestPermissions],
  );

  const addMultipleNotifications = useCallback((notifs: NotificationItem[]) => {
    if (!Array.isArray(notifs) || notifs.length === 0) return;
    setNotifications((previous) =>
      mergeNotifications(previous, notifs, deletedRef.current),
    );
  }, []);

  const addNotification = useCallback((notif: NotificationItem) => {
    if (!notif) return;
    setNotifications((previous) =>
      mergeNotifications(previous, [notif], deletedRef.current),
    );
  }, []);

  /**
   * Delete a notification for this user.
   *
   * The id is recorded and persisted, so the same item is filtered out of every
   * later sync instead of being re-added as soon as the app refetches.
   */
  const deleteNotification = useCallback(
    (id: string, item?: NotificationItem) => {
      if (!id) return;

      const next = [id, ...deletedRef.current.filter((entry) => entry !== id)].slice(
        0,
        MAX_DELETED,
      );
      deletedRef.current = next;
      setDeletedNotifications(next);

      setNotifications((previous) => {
        const filtered = previous.filter(
          (entry) =>
            notificationKey(entry) !== id &&
            entry.id !== id &&
            entry.notification_id !== id,
        );
        return filtered.length === previous.length ? previous : filtered;
      });

      // Also drop the delivered copy from the phone's notification shade.
      void dismissFromTray({
        nativeId: item?.nativeId,
        title: item?.title,
        message: item?.message,
      });
    },
    [],
  );

  /**
   * Empty the inbox.
   *
   * Every key is remembered so the next sync cannot restore the list the
   * customer just cleared, and the notification shade is cleared with it.
   */
  const clearAllNotifications = useCallback(() => {
    const current = notificationsRef.current;
    if (current.length === 0) {
      void dismissAllFromTray();
      return;
    }

    const ids = current.map((item) => notificationKey(item));
    const next = Array.from(new Set([...ids, ...deletedRef.current])).slice(
      0,
      MAX_DELETED,
    );
    deletedRef.current = next;
    setDeletedNotifications(next);
    setNotifications([]);

    void dismissAllFromTray();
  }, []);

  const markAsRead = useCallback((id: string) => {
    if (!id) return;
    setNotifications((previous) => {
      let changed = false;
      const next = previous.map((item) => {
        const matches =
          item.id === id ||
          item.notification_id === id ||
          notificationKey(item) === id;
        if (!matches || item.read) return item;
        changed = true;
        return { ...item, read: true };
      });
      return changed ? next : previous;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((previous) =>
      previous.some((item) => !item.read)
        ? previous.map((item) => ({ ...item, read: true }))
        : previous,
    );
  }, []);

  const contextValue = useMemo(
    () => ({
      notifications,
      setNotifications,
      addNotification,
      addMultipleNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      deletedNotifications,
      unreadCount,
      notificationsEnabled,
      setNotificationsEnabled: saveNotificationsEnabled,
      permissionStatus,
      requestPermissions,
    }),
    [
      notifications,
      addNotification,
      addMultipleNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      deletedNotifications,
      unreadCount,
      notificationsEnabled,
      saveNotificationsEnabled,
      permissionStatus,
      requestPermissions,
    ],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error("useNotifications must be used within a Provider");
  return context;
};
