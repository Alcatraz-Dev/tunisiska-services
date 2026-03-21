import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { NotificationItem } from "@/app/types/notification";
import Constants, { ExecutionEnvironment } from "expo-constants";

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
        console.log(
          "🔔 Notification handler called:",
          JSON.stringify(notification, null, 2),
        );

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

interface NotificationContextProps {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  addNotification: (notif: NotificationItem) => void;
  addMultipleNotifications: (notifs: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
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

  useEffect(() => {
    // Initialize permissions and load settings
    const initializeNotifications = async () => {
      // Load notificationsEnabled from AsyncStorage
      const value = await AsyncStorage.getItem("notificationsEnabled");
      if (value !== null) setNotificationsEnabled(value === "true");

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

        // If permissions are granted, set initial badge count
        if (status.granted) {
          await Notifications.setBadgeCountAsync(0);
        }

        console.log("📱 Notification permissions:", status);
      } catch (error) {
        console.warn("⚠️ Failed to initialize notifications:", error);
      }
    };

    initializeNotifications();
  }, []);

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

      console.log("🔔 Permission request result:", status, newStatus);
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
      await AsyncStorage.setItem("notificationsEnabled", value.toString());
    },
    [permissionStatus, requestPermissions],
  );

  const addNotification = useCallback((notif: NotificationItem) => {
    setNotifications((prev) => [notif, ...prev]);
  }, []);

  const addMultipleNotifications = useCallback((notifs: NotificationItem[]) => {
    setNotifications((prev) => {
      const merged = [...notifs, ...prev];
      const unique = Array.from(new Map(merged.map((n) => [n.id, n])).values());
      return unique;
    });
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        // Update badge count only if permissions are granted
        const unreadCount = updated.filter((n) => !n.read).length;

        if (
          Notifications &&
          permissionStatus?.granted &&
          notificationsEnabled
        ) {
          Notifications.setBadgeCountAsync(unreadCount).catch((error: any) => {
            console.warn("⚠️ Failed to set badge count:", error);
          });
        }

        return updated;
      });
    },
    [permissionStatus, notificationsEnabled],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Clear badge when all notifications are read, only if permissions granted
    if (Notifications && permissionStatus?.granted && notificationsEnabled) {
      try {
        await Notifications.setBadgeCountAsync(0);
      } catch (error) {
        console.warn("⚠️ Failed to clear badge count:", error);
      }
    }
  }, [permissionStatus, notificationsEnabled]);

  const contextValue = useMemo(
    () => ({
      notifications,
      setNotifications,
      addNotification,
      addMultipleNotifications,
      markAsRead,
      markAllAsRead,
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
