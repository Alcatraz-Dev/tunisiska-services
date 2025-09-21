import React from "react";
import {  View, Image, Switch } from "react-native";
import { useTheme } from "../context/ThemeContext";
import icons from "../constants/icons";
import { AutoText } from "./ui/AutoText";

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
        <Image
          source={
            theme === "system"
              ? icons.system
              : resolvedTheme === "dark"
                ? icons.moon
                : icons.sun
          }
          className="mr-3 w-5 h-5"
          style={{
            tintColor: resolvedTheme === "dark" ? "#94a3b8" : "#64748b",
          }}
        />
        <AutoText
          className={`${resolvedTheme === "dark" ? "text-dark-text" : "text-light-text"}`}
        >
          {theme === "system"
            ? "System"
            : theme === "dark"
              ? "Mörkt "
              : "Ljust "}
        </AutoText>
      </View>

      <Switch onChange={cycleTheme} value={resolvedTheme === "dark"}/>
      
    </View>
  );
};
