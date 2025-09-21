import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { StatusBar } from "expo-status-bar";
import BookingProgress from "@/app/components/BookingProgress";
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
    price: "450 kr",
    duration: "40 min",
    vehicle: "Premium Sedan",
    driver: "Anders Svensson",
  },
  {
    id: "2",
    category: "Flytt",
    date: "2025-09-10",
    pickup: "Göteborg",
    dropoff: "Malmö",
    status: "Avbokad",
    slug: "flytt",
    price: "3500 kr",
    duration: "5 h",
    vehicle: "Stor flyttbil",
    driver: "Maria Karlsson",
  },
  {
    id: "3",
    category: "Städning & Flytt",
    date: "2025-09-05",
    pickup: "Uppsala",
    dropoff: "Uppsala",
    status: "Pågående",
    slug: "stadning-flytt",
    price: "1200 kr",
    duration: "2 h",
    vehicle: "Kombibil",
    driver: "Johan Nilsson",
  },
];

export default function BookingDetailsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    const found = demoBookings.find((b) => b.slug === slug);
    setBooking(found);

    if (found?.status === "Avslutad") progress.value = 1;
    else if (found?.status === "Pågående") progress.value = 0.5;
    else progress.value = 0;
  }, [slug]);

  const progressStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress.value * 100}%`, { duration: 600 }),
  }));

  if (!booking) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
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
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Bokningsdetaljer
            </AutoText>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Bokning hittades inte
          </AutoText>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = () => {
    switch (booking.status) {
      case "Avslutad":
        return "#10B981";
      case "Pågående":
        return "#F59E0B";
      case "Avbokad":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        className={`px-6  pb-2  `}
      >
        <View className="flex-row items-center justify-center relative my-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-0 p-2 "
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isDark ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <AutoText
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Bokningsdetaljer
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Se din historik detailjer av bokade tjänster
        </AutoText>
      </Animated.View>

      {/* Details */}
      <ScrollView
        className="flex-1 px-5 mt-4"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.duration(600).delay(100)}
          className={`px-3 py-6 `}
        >
          {/* Header with status badge */}
          <View className="flex-row justify-between items-start mb-5">
            <AutoText
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {booking.category}
            </AutoText>
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getStatusColor() + "20" }}
            >
              <AutoText
                className="text-xs font-semibold"
                style={{ color: getStatusColor() }}
              >
                {booking.status}
              </AutoText>
            </View>
          </View>

          {/* Service Info Cards */}
          <View className="mb-6">
            <View
              className={`p-4 rounded-xl mb-3  ${
                isDark ? "bg-dark-card" : "bg-light-card"
              }`}
               style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
            >
              <View className="flex-row items-center mb-2">
                <View
                  className={`p-2 rounded-full ${
                    isDark ? "bg-gray-500" : "bg-blue-100"
                  }`}
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
                    size={16}
                    color={isDark ? "#ffffff" : "#3B82F6"}
                  />
                </View>
                <AutoText
                  className={`ml-3 font-medium ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {booking.date}
                </AutoText>
              </View>
            </View>

            <View
              className={`p-4 rounded-xl mb-3 ${
                isDark ? "bg-dark-card" : "bg-light-card"
              }`}
               style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
            >
              <View className="flex-row items-center mb-2">
                <View
                  className={`p-2 rounded-full ${
                    isDark ? "bg-gray-500" : "bg-green-100"
                  }`}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={isDark ? "#ffffff" : "#10B981"}
                  />
                </View>
                <View className="ml-3">
                  <AutoText
                    className={`font-medium ${
                      isDark ? "text-gray-200" : "text-gray-800"
                    }`}
                    
                  >
                    {booking.pickup}
                  </AutoText>
                  <View className="flex-row items-center mt-1">
                    <Ionicons
                      name="arrow-down"
                      size={12}
                      color={isDark ? "#6B7280" : "#9CA3AF"}
                    />
                    <AutoText
                      className={`ml-1 text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {booking.dropoff}
                    </AutoText>
                  </View>
                </View>
              </View>
            </View>

            <View
              className={`p-4 rounded-xl mb-3 ${
                isDark ? "bg-dark-card" : "bg-light-card"
              }`}
               style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
            >
              <View className="flex-row items-center mb-2">
                <View
                  className={`p-2 rounded-full ${
                    isDark ? "bg-gray-500" : "bg-amber-100"
                  }`}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isDark ? "#ffffff" : "#F59E0B"}
                  />
                </View>
                <AutoText
                  className={`ml-3 font-medium ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {booking.duration}
                </AutoText>
              </View>
            </View>

            <View
              className={`p-4 rounded-xl mb-3 ${
                isDark ? "bg-dark-card" : "bg-light-card"
              }`}
               style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
            >
              <View className="flex-row items-center mb-2">
                <View
                  className={`p-2 rounded-full ${
                    isDark ? "bg-gray-500" : "bg-purple-100"
                  }`}
                >
                  <Ionicons
                    name="car-outline"
                    size={16}
                    color={isDark ? "#ffffff" : "#8B5CF6"}
                  />
                </View>
                <AutoText
                  className={`ml-3 font-medium ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {booking.vehicle}
                </AutoText>
              </View>
            </View>

            <View
              className={`p-4 rounded-xl ${
                isDark ? "bg-dark-card" : "bg-light-card"
              }`}
               style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
            >
              <View className="flex-row items-center mb-2">
                <View
                  className={`p-2 rounded-full ${
                    isDark ? "bg-gray-500" : "bg-indigo-100"
                  }`}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={isDark ? "#ffffff" : "#6366F1"}
                  />
                </View>
                <AutoText
                  className={`ml-3 font-medium ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {booking.driver}
                </AutoText>
              </View>
            </View>
          </View>

          {/* Price */}
          <View
            className={`p-4 rounded-xl mb-6 ${
              isDark ? "bg-dark-card" : "bg-light-card"
            }`}
             style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <View className="flex-row justify-between items-center">
              <AutoText
                className={`font-medium ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Totalpris
              </AutoText>
              <AutoText
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {booking.price}
              </AutoText>
            </View>
          </View>

          {/* Progress Timeline */}

          {/* <View className="mb-6">
            <BookingProgress currentStatus={booking.status} isDark={isDark} />
          </View> */}

          {/* Action buttons */}
          <View className="flex-row space-x-3 gap-3 -bottom-32">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center ${
                isDark ? " bg-light-card" : "bg-dark-card"
              }`}
              onPress={() => alert("Kontakta support")}
            >
              <AutoText
                className={`font-medium ${
                  isDark ? "text-gray-700 " : "text-gray-300"
                }`}
              >
                Support
              </AutoText>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-3 rounded-xl items-center bg-blue-600"
              onPress={() => alert("Hantera din bokning")}
            >
              <AutoText className="text-white font-medium">Hantera</AutoText>
            </TouchableOpacity>
          </View>
        </Animated.View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ScrollView>
    </SafeAreaView>
  );
}
