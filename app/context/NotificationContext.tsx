import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NotificationItem } from "@/app/types/notification";

// Configure notification handler for production
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextProps {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  addNotification: (notif: NotificationItem) => void;
  addMultipleNotifications: (notifs: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  permissionStatus: Notifications.NotificationPermissionsStatus | null;
  requestPermissions: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.NotificationPermissionsStatus | null>(null);

  useEffect(() => {
    // Initialize permissions and load settings
    const initializeNotifications = async () => {
      // Load notificationsEnabled from AsyncStorage
      const value = await AsyncStorage.getItem("notificationsEnabled");
      if (value !== null) setNotificationsEnabled(value === "true");
      
      // Get current permission status
      const status = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      
      // If permissions are granted, set initial badge count
      if (status.granted) {
        await Notifications.setBadgeCountAsync(0);
      }
      
      console.log('📱 Notification permissions:', status);
    };
    
    initializeNotifications();
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
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
          allowAnnouncements: false,
        },
      });
      
      const newStatus = await Notifications.getPermissionsAsync();
      setPermissionStatus(newStatus);
      
      console.log('🔔 Permission request result:', status, newStatus);
      return status === 'granted' || newStatus.granted;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  };

  const saveNotificationsEnabled = async (value: boolean) => {
    if (value && permissionStatus && !permissionStatus.granted) {
      const granted = await requestPermissions();
      if (!granted) {
        console.log('⚠️ Permissions not granted, keeping notifications disabled');
        return;
      }
    }
    
    setNotificationsEnabled(value);
    await AsyncStorage.setItem("notificationsEnabled", value.toString());
  };

  const addNotification = (notif: NotificationItem) => {
    setNotifications((prev) => [notif, ...prev]);
  };

  const addMultipleNotifications = (notifs: NotificationItem[]) => {
    setNotifications((prev) => {
      const merged = [...notifs, ...prev];
      const unique = Array.from(new Map(merged.map((n) => [n.id, n])).values());
      return unique;
    });
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      // Update badge count only if permissions are granted
      const unreadCount = updated.filter(n => !n.read).length;
      
      if (permissionStatus?.granted && notificationsEnabled) {
        Notifications.setBadgeCountAsync(unreadCount).catch((error) => {
          console.warn('⚠️ Failed to set badge count:', error);
        });
      }
      
      return updated;
    });
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    
    // Clear badge when all notifications are read, only if permissions granted
    if (permissionStatus?.granted && notificationsEnabled) {
      try {
        await Notifications.setBadgeCountAsync(0);
      } catch (error) {
        console.warn('⚠️ Failed to clear badge count:', error);
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a Provider");
  return context;
};