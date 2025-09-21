import React, { useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/app/context/ThemeContext";
import { useRouter } from "expo-router";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { AutoText } from "@/app/components/ui/AutoText";
import { showAlert } from "@/app/utils/showAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotifications, NotificationItem } from "@/app/context/NotificationContext";

export default function Notification() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { notifications, setNotifications } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = notifications.some((n) => !n.read);

  const getIcon = (type: string) => {
    switch (type) {
      case "message": return "chatbubble-ellipses-outline";
      case "booking": return "calendar-outline";
      case "warning": return "warning-outline";
      case "info": return "information-circle-outline";
      case "success": return "checkmark-circle-outline";
      case "error": return "close-circle-outline";
      case "system": return "settings-outline";
      case "offer": return "pricetag-outline";
      case "delivery": return "cube-outline";
      case "service": return "construct-outline";
      case "security": return "lock-closed-outline";
      case "review": return "star-outline";
      default: return "notifications-outline";
    }
  };

  const getIconColor = (type: string, read: boolean) => {
    if (read) return "#A3A3A3"; // Gray for read notifications
    const typeColors: Record<string, string> = {
      message: "#3B82F6",
      booking: "#8B5CF6",
      warning: "#F59E0B",
      info: "#0EA5E9",
      success: "#10B981",
      error: "#EF4444",
      offer: "#F472B6",
      delivery: "#FBBF24",
      service: "#60A5FA",
      security: "#F97316",
      review: "#14B8A6",
      system: "#A78BFA",
    };
    return typeColors[type] || "#3B82F6";
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showAlert("Bekräftelse", "Alla markerade som lästa");
  };

  // Refresh to restore notifications
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setNotifications((prev) => [...prev]); // Simply refresh current notifications
      setRefreshing(false);
      showAlert("Uppdaterad", "Notifikationerna har uppdaterats");
    }, 500);
  };

const renderItem = ({ item, index }: { item: NotificationItem; index: number }) => (
  <Animated.View
    entering={FadeInUp.delay(100 * index)}
    exiting={FadeOutDown}
    className="flex-row items-start p-4 gap-3 bg-white dark:bg-gray-800 rounded-md mb-2"
  >
    {/* Icon */}
    <Ionicons
      name={getIcon(item.type) as any}
      size={20}
      color={getIconColor(item.type, item.read)}
      style={{ marginRight: 12, marginTop: 12 }}
    />

    {/* Content */}
    <View className="flex-1">
      <AutoText className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
        {item.title}
      </AutoText>
      <AutoText className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
        {item.message}
      </AutoText>
      <AutoText className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {item.date}
      </AutoText>
    </View>

    {/* Actions */}
    <View className="flex-row items-center gap-3">
      {!item.read && (
        <TouchableOpacity
          onPress={() =>
            setNotifications((prev) =>
              prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
            )
          }
        >
          <Ionicons name="eye-outline" size={22} color="#3B82F6" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() =>
          setNotifications((prev) => prev.filter((n) => n.id !== item.id))
        }
      >
        <Ionicons name="trash-outline" size={22} color="#EF4444" />
      </TouchableOpacity>
    </View>
  </Animated.View>
);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className="px-6 py-4 relative">
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full p-2 absolute left-6 top-1/2 -translate-y-1/2"
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#111"} />
        </TouchableOpacity>

        <View className="items-center">
          <AutoText className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}>
            Notifikationer
          </AutoText>
          <AutoText className={`text-center text-sm mt-5 mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Här hittar du alla dina senaste aviseringar
          </AutoText>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          onPress={onRefresh}
          className="absolute right-6 top-1/2 -translate-y-1/2 p-2"
        >
          <Ionicons name="refresh-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {hasUnread && (
        <TouchableOpacity
          onPress={markAllAsRead}
          className="p-2 flex items-end justify-end mx-2"
        >
          <AutoText className="text-sm text-blue-500 font-medium flex items-center justify-end">
            Läs alla
          </AutoText>
        </TouchableOpacity>
      )}

      {/* Notification List */}
      <View className="flex-1 px-6 mt-5">
        {notifications.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="notifications-off-outline" size={48} color={isDark ? "#9CA3AF" : "#6B7280"} />
            <AutoText className={`mt-4 text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Inga notifikationer just nu
            </AutoText>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}