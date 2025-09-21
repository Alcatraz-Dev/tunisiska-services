import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AutoText } from "./ui/AutoText";

export default function AppFooter() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  return (
    <View
      className={`mt-6 py-6 border-t mb-20 ${
        isDark ? "border-gray-700" : "border-gray-200"
      }`}
    >
      {/* Links */}
      <View className="flex-row justify-center mb-3">
        <TouchableOpacity
          className="mx-3"
          onPress={() => router.push('/(home)/profile/terms')}
        >
          <AutoText
            className={`text-xs font-medium ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Villkor
          </AutoText>
        </TouchableOpacity>
        <TouchableOpacity
          className="mx-3"
        onPress={() => router.push('/(home)/profile/policy')}
        >
          <AutoText
            className={`text-xs font-medium ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Sekretess
          </AutoText>
        </TouchableOpacity>
      </View>

      {/* Social Icons */}
      <View className="flex-row justify-center space-x-6 mb-3 gap-3">
        <Ionicons
          name="logo-facebook"
          size={18}
          color={isDark ? "#9CA3AF" : "#4B5563"}
        />
        <Ionicons
          name="logo-instagram"
          size={18}
          color={isDark ? "#9CA3AF" : "#4B5563"}
        />
        <Ionicons
          name="logo-whatsapp"
          size={18}
          color={isDark ? "#9CA3AF" : "#4B5563"}
        />
      </View>

      {/* Copyright */}
      <AutoText
        className={`text-center text-xs ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        © {new Date().getFullYear()} Tunis Service. Alla rättigheter
        förbehållna.
      </AutoText>
    </View>
  );
}
