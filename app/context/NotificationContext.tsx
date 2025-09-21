// app/context/NotificationContext.tsx
import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationItem = {
  id: string;
  read: boolean;
  title: string;
  message: string;
  type: string;
  date: string;
};

type NotificationContextType = {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  addNotification: (notif: Omit<NotificationItem, "id" | "read" | "date">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const STORAGE_KEY = "appNotifications";
const ENABLE_KEY = "notificationsEnabled";
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initial: NotificationItem[] = [
    /* your initial list (the 15 items you prepared) */
  ];

  const [notifications, setNotifications] = useState<NotificationItem[]>(initial);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  // Load saved notifications + enabled flag
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setNotifications(JSON.parse(saved));
        const enabled = await AsyncStorage.getItem(ENABLE_KEY);
        if (enabled !== null) setNotificationsEnabled(enabled === "true");
      } catch (e) {
        console.error("Failed to load notifications:", e);
      }
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    AsyncStorage.setItem(ENABLE_KEY, notificationsEnabled.toString());
  }, [notificationsEnabled]);

  const addNotification = (notif: Omit<NotificationItem, "id" | "read" | "date">) => {
    const newItem: NotificationItem = {
      id: Date.now().toString(),
      read: false,
      date: new Date().toISOString(),
      ...notif,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        notificationsEnabled,
        setNotificationsEnabled,
        addNotification,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};