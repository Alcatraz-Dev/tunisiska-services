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

export default function Terms() {
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
            Användarvillkor
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Läs våra villkor för att använda appen
        </AutoText>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Villkor */}
        <View className="mb-6">
          <AutoText
            className={`text-lg font-semibold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Allmänna villkor
          </AutoText>
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Genom att använda denna app godkänner du att följa våra regler och
            riktlinjer. Du ansvarar för att all information du tillhandahåller är
            korrekt och uppdaterad.
          </AutoText>
        </View>

        {/* Ansvar */}
        <View className="mb-6">
          <AutoText
            className={`text-lg font-semibold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Ansvar
          </AutoText>
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Vi strävar efter att erbjuda en säker och stabil tjänst, men vi kan
            inte hållas ansvariga för eventuella störningar eller förlust av
            data. Användare är ansvariga för sitt eget konto och aktivitet.
          </AutoText>
        </View>

        {/* Uppdateringar */}
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