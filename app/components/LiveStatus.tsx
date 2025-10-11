import React, { useEffect, useState, useRef } from "react";
import { View, Animated } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getPremiumGradientWithOpacity } from "../utils/getPremiumGradient";
import { AutoText } from "./ui/AutoText";

import { liveStatusQuery } from "../hooks/useQuery";
import { client } from "@/sanityClient";

export default function LiveStatus() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const data = await client.fetch(liveStatusQuery);
        if (data?.statuses) {
          setStatus(data.statuses);
        }
        if (data?.title) {
          setTitle(data.title);
        }
      } catch (err) {
        console.error("Error fetching statuses:", err);
      }
    };
    fetchStatuses();
  }, []);

  useEffect(() => {
    if (status.length === 0) return;

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
    <View className="rounded-xl bottom-2">
      <LinearGradient
        colors={getPremiumGradientWithOpacity() as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-xl px-6 py-10 shadow-lg flex-row items-center justify-center"
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
          {/* Header */}
          <View className="flex-row items-center mb-1 ">
            <Ionicons
              name="pulse"
              size={10}
              color={isDark ? "#fff" : "#000"}
              style={{ opacity: 0.8 }}
            />
            <AutoText
              className={`text-[9px] ml-1 mt-0.5 mb-1 ${
                isDark ? "text-gray-200" : "text-gray-800"
              }`}
            >
              {title ? title : "direkt för idag"}-{status.length}
            </AutoText>
          </View>
          <View className="flex-col items-center">
            {/* Status text */}
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
                {status.length > 0
                  ? status[index]
                  : "Ingen Active Status i direkt just nu ..."}
              </AutoText>
            </Animated.View>
            {/* Dots */}
            <View className="items-center justify-center flex-row mt-3 mb-1">
              {status.map((_, i) => (
                <View
                  key={i}
                  className={`h-1 w-1 rounded-full mx-0.5 ${
                    i === index
                      ? "bg-white w-4"
                      : isDark
                      ? "bg-zinc-100/30"
                      : "bg-zinc-900/20"
                  }`}
                />
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
