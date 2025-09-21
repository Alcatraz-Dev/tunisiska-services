import React, { useEffect, useState, useRef } from "react";
import { View, Animated, Text } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getPremiumGradientWithOpacity } from "../utils/getPremiumGradient";
import { AutoText } from "./ui/AutoText";

export default function LiveStatus() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const status = [
    "  flyttar bokade i Stockholm idag",
    "  hemstädningar planerade i Malmö",
    "  taxibokning till Arlanda imorgon",
  ];

  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % status.length);
      animate();
    }, 3000);

    animate();
    return () => clearInterval(interval);
  }, [status.length]);

  return (
    <View className={` rounded-xl bottom-2 `}>
      <LinearGradient
        colors={getPremiumGradientWithOpacity() as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-xl px-6 py-10 shadow-lg flex-row items-center justify-center    "
        style={{
          borderColor: isDark
            ? "rgba(56, 189, 248, 0.1)"
            : "rgba(2, 132, 199, 0.1)",
          shadowColor: isDark ? "#000" : "#fff",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
          borderRadius: 10,
          borderWidth: 1,
        }}
      >
        <View className="ml-2 my-1.5">
          {/* Icon + "Status i direkt" */}
          <View className="flex-row items-center ">
            <Ionicons
              name="pulse"
              size={10}
              color={isDark ? "#fff" : "#000"}
              style={{ opacity: 0.8 }}
            />
            <AutoText
              className={`text-[9px] ml-1 mt-0.5 ${
                isDark ? "text-gray-200" : "text-gray-800"
              }`}
            >
              Status i direkt
            </AutoText>
          </View>

          {/* Status text centered */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AutoText
              style={{
                fontSize: 10,
                textAlign: "center",
                color: isDark ? "#e5e7eb" : "#1f2937",
              }}
            >
              {status && status.length > 0
                ? status[index]
                : "Ingen Active Status i direkt just nu ..."}
            </AutoText>
          </Animated.View>
        </View>

        <View className=" items-center justify-center flex-row my-2">
          {status.map((_, i) => (
            <View
              key={i}
              className={`h-1 w-1 rounded-full mx-0.5 ${
                i === index
                  ? isDark
                    ? "bg-white w-4"
                    : "bg-white w-4"
                  : isDark
                  ? "bg-zinc-100/30"
                  : "bg-zinc-900/20"
              }`}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}
