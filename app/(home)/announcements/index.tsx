import React, { useState } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/app/context/ThemeContext";
import { demoAnnouncements } from "@/app/constants/demoAnnouncements";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { AutoText } from "@/app/components/ui/AutoText";

export default function AnnouncementsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [announcements] = useState(demoAnnouncements);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <View className="flex-row items-center justify-center relative mb-4">
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
            className={`text-2xl font-extrabold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Announcements
          </AutoText>
        </View>
        <AutoText
          className={`text-center text-sm mb-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Senaste nyheter, kampanjer och uppdateringar
        </AutoText>
      </View>
      {/* Announcements list */}
      <ScrollView className="p-6 mt-5">
        {/* <AnimatePresence> */}
        {announcements.map((a, index) => (
          <Animated.View
            entering={FadeInUp.delay(200 * index)}
            exiting={FadeOutDown}
            key={a.id}
             style={{
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
          >
            <TouchableOpacity
              key={a.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/(home)/announcements/${a.slug}`)}
              className={`mb-5 flex-row items-start p-4 rounded-2xl shadow-sm ${
                isDark ? "bg-dark-card" : "bg-white"
              }`}
              style={{ borderLeftWidth: 1, borderLeftColor: `${a.color}`}}
            >
              {/* Icon */}
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-4 mt-4"
                style={{ backgroundColor: `${a.color}20` }}
              >
                <Ionicons name={a.icon as any} size={18} color={a.color} />
              </View>
              {/* Content */}
              <View className="flex-1">
                <AutoText
                  className={`text-base font-bold mb-1 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {a.title}
                </AutoText>
                <AutoText
                  className={`text-sm leading-5 mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                  numberOfLines={2}
                >
                  {a.message}
                </AutoText>
                <AutoText
                  className={`text-xs ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {a.date}
                </AutoText>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
