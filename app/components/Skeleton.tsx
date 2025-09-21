// components/Skeleton.tsx
import React, { useEffect } from "react";
import { ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/app/context/ThemeContext";

type SkeletonProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  radius = 10,
  style,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any, // ✅ cast to satisfy reanimated
          height,
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: isDark ? "#2D2D2D" : "#E5E7EB",
        },
        animatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={
          isDark
            ? ["#2D2D2D", "#3D3D3D", "#2D2D2D"]
            : ["#E5E7EB", "#F3F4F6", "#E5E7EB"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

export default Skeleton;