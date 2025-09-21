import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { AutoText } from "@/app/components/ui/AutoText";
import { SafeAreaView } from "react-native-safe-area-context";

const demoBookings = [
  {
    id: "1",
    category: "Transport",
    date: "2025-09-15",
    pickup: "Stockholm Central",
    dropoff: "Arlanda Flygplats",
    status: "Avslutad",
    slug: "transport",
  },
  {
    id: "2",
    category: "Flytt",
    date: "2025-09-10",
    pickup: "Göteborg",
    dropoff: "Malmö",
    status: "Avbokad",
    slug: "flytt",
  },
  {
    id: "3",
    category: "Städning & Flytt",
    date: "2025-09-05",
    pickup: "Uppsala",
    dropoff: "Uppsala",
    status: "Avslutad",
    slug: "stadning-flytt",
  },
];

export default function BookingHistoryScreen() {
  const { resolvedTheme } = useTheme(); // Add a ready flag
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [bookings, setBookings] = useState(demoBookings);

  useEffect(() => {
    setBookings([...demoBookings]);
  }, [resolvedTheme]);

  const renderBooking = ({ item, index }: any) => (
    <Animated.View
      key={item.id + index}
      entering={FadeInUp.delay(120 * index)}
      exiting={FadeOutDown}
      className="flex-1 mb-4"
    >
      {/* Card */}
      <View
        style={{
          backgroundColor: isDark ? "#2c2c2e" : "#ffffff",
          padding: 20,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }}
      >
        {/* Header row */}
        <View className="flex-row justify-between items-center mb-3">
          <AutoText
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {item.category}
          </AutoText>

          <View
            className={`px-3 py-1 rounded-full ${
              item.status === "Avslutad" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <AutoText
              className={`text-xs font-bold ${
                item.status === "Avslutad" ? "text-green-700" : "text-red-600"
              }`}
            >
              {item.status}
            </AutoText>
          </View>
        </View>

        {/* Details */}
        <View className="space-y-2">
          <AutoText
            className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            Datum: {item.date}
          </AutoText>
          <AutoText
            className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            Från: {item.pickup}
          </AutoText>
          <AutoText
            className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            Till: {item.dropoff}
          </AutoText>
        </View>

        {/* Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/profile/booking/${item.slug}`)}
          style={{
            backgroundColor: isDark ? "#ffffff" : "#111111",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
          className="mt-4 px-4 py-2.5 rounded-xl items-center"
        >
          <AutoText
            className={`text-sm font-bold ${
              isDark ? "text-gray-900" : "text-white"
            }`}
          >
            Se detaljer
          </AutoText>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-3 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center relative mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-0 p-2"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <AutoText
            className={`text-2xl font-extrabold text-center ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Mina bokningar
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Se din historik av bokade tjänster
        </AutoText>
      </View>

      {/* Content */}
      {bookings.length === 0 ? (
        <View
          className="flex-1 justify-center items-center"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={60}
            color={isDark ? "#6B7280" : "#9CA3AF"}
          />
          <AutoText
            className={`mt-4 text-base ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Inga bokningar än
          </AutoText>
        </View>
      ) : (
        <FlatList
          className="flex-1 px-6 mt-2"
          data={bookings}
          keyExtractor={(item) => item?.id}
          renderItem={renderBooking}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
