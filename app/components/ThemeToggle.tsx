import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };
  type Theme = "light" | "dark" | "system";
  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <View className="flex-row items-center justify-between p-4">
      <View className="flex-row items-center">
        <Ionicons
          name={resolvedTheme === "dark" ? "moon" : "sunny"}
          size={20}
          color={resolvedTheme === "dark" ? "#e2e8f0" : "#475569"}
          className="mr-3"
        />
        <Text
          className={`${resolvedTheme === "dark" ? "text-dark-text" : "text-light-text"}`}
        >
          {theme === "system"
            ? "System"
            : theme === "dark"
              ? "Mörkt läge"
              : "Ljust läge"}
        </Text>
      </View>

      <TouchableOpacity
        onPress={cycleTheme}
        className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full p-1"
      >
        <View
          className={`w-4 h-4 bg-white rounded-full shadow-md transform ${
            resolvedTheme === "dark" ? "translate-x-6" : "translate-x-0"
          } transition-transform duration-200`}
        />
      </TouchableOpacity>
    </View>
  );
};
