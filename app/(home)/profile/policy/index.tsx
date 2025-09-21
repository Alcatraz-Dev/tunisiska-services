import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "@/app/components/ui/AutoText";

export default function Policy() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Header */}
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
            className={`text-2xl font-extrabold text-center ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Policy
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Läs vår integritetspolicy och användarvillkor
        </AutoText>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Integritetspolicy */}
        <View className="mb-6">
          <AutoText
            className={`text-lg font-semibold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Integritetspolicy
          </AutoText>
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Vi samlar endast in den information som är nödvändig för att kunna
            erbjuda dig våra tjänster, som namn, e-postadress och
            kontaktuppgifter. Din information delas aldrig med tredje part utan
            ditt samtycke.
          </AutoText>
        </View>

        {/* Användarvillkor */}
        <View className="mb-6">
          <AutoText
            className={`text-lg font-semibold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Användarvillkor
          </AutoText>
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Genom att använda denna app godkänner du våra villkor. Du förbinder
            dig att inte missbruka tjänsten och att alltid följa gällande lagar.
            Vi förbehåller oss rätten att ändra villkoren vid behov.
          </AutoText>
        </View>

        {/* Uppdatering */}
        <AutoText
          className={`text-xs text-center mt-10 mb-6 ${
            isDark ? "text-gray-500" : "text-gray-500"
          }`}
        >
          Senast uppdaterad: September 2025
        </AutoText>
      </ScrollView>
    </SafeAreaView>
  );
}
