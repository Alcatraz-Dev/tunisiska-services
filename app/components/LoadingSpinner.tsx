import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useTheme } from "../context/ThemeContext";

const LoadingSpinner: React.FC<{
  fullscreen?: boolean;
  size?: string;
}> = ({ fullscreen = false, size }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <View
      className={`${
        fullscreen ? "flex-1" : "absolute inset-0"
      } justify-center items-center `}
    >
      <ActivityIndicator
        //@ts-ignore
        size={size}
        color={isDark ? "#132B55" : "#0B1B33"}
      />
      {/* <Text className={`mt-4 ${isDark ? "text-white" : "text-gray-800"}`}>
        Loading...
      </Text> */}
    </View>
  );
}

export default LoadingSpinner;
