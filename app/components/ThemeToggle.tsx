import React from "react";
import { View, Image, Switch } from "react-native";
import { useTheme } from "../context/ThemeContext";
import icons from "../constants/icons";
import { AutoText } from "./ui/AutoText";

const ThemeToggle: React.FC = () => {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <View className="flex-row items-center justify-between p-4">
      <View className="flex-row items-center">
        <Image
          source={resolvedTheme === "dark" ? icons.moon : icons.sun}
          className="mr-3 w-5 h-5"
          style={{
            tintColor: resolvedTheme === "dark" ? "#94a3b8" : "#64748b",
          }}
        />
        <AutoText
          className={`${resolvedTheme === "dark" ? "text-dark-text" : "text-light-text"}`}
        >
          {resolvedTheme === "dark" ? "Dark" : "Light"}
        </AutoText>
      </View>

      <Switch
        accessibilityLabel="Dark appearance"
        onValueChange={(enabled) => setTheme(enabled ? "dark" : "light")}
        value={resolvedTheme === "dark"}
      />
      
    </View>
  );
}

export default ThemeToggle;
