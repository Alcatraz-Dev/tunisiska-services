import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { demoAnnouncements } from "../constants/demoAnnouncements";
import { Ionicons } from "@expo/vector-icons";
import { getPremiumGradient } from "../utils/getPremiumGradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { AutoText } from "./ui/AutoText";
export default function LiveAnnouncementCard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % demoAnnouncements.length);
      animate();
    }, 4000);

    animate();
    return () => clearInterval(interval);
  }, []);

  const banner = demoAnnouncements[index];

  const createdAt = new Date(banner.date);
  const now = new Date();
  const isNew =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) < 7;
  const videoSource =
    banner.media === "image"
      ? { uri: banner.media }
      : { uri: banner.media, shouldPlay: true, isLooping: true };
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });
  return (
    <View className="mb-4">
      {/* Header */}
      <View className="flex-row justify-between px-4 mb-4 items-center">
        <AutoText
          className={`text-xl font-bold ${
            isDark ? "text-white" : "text-gray-800"
          }`}
        >
          Reklam
        </AutoText>
        <TouchableOpacity
          onPress={() => router.push("/(home)/announcements")}
          className="flex-row items-center"
        >
          <AutoText
            className={`text-xs mr-1 ${
              isDark ? "text-white" : "text-gray-800"
            }`}
          >
            Visa alla
          </AutoText>
          <Ionicons
            name="arrow-forward"
            size={12}
            color={isDark ? "#fff" : "#4b5563"}
          />
        </TouchableOpacity>
      </View>
      {/* Card */}

      <Animated.View
        style={{ opacity: fadeAnim }}
        className="w-full items-center"
      >
        <View className="rounded-2xl overflow-hidden w-[95%] h-52 relative">
          {/* Media */}
          {banner.media && banner.media.endsWith(".mp4") ? (
            <>
              <View style={{   aspectRatio: 16 / 9 }}>
                <VideoView
                  style={{ width: "100%", height: "100%", borderRadius: 12 }}
                  player={player}
                  surfaceType="textureView"
                  className="w-full h-[200px] rounded-lg aspect-video"
                />
              </View>
            </>
          ) : banner.media ? (
            <Image
              source={{ uri: banner.media }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : null}
          {/* Gradient */}
          <LinearGradient
            colors={getPremiumGradient() as [string, string]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              height: "100%",
              opacity: 0.5,
            }}
          />
          {/* New badge */}
          {isNew && (
            <View className="absolute top-3 right-3 bg-green-600 px-3 py-1 rounded-full z-10 rotate-[15deg] ">
              <AutoText className="text-white text-xs font-bold uppercase drop-shadow-md">
                Ny
              </AutoText>
            </View>
          )}

          {/* Text & Button */}
          <View className="absolute top-6 left-4 right-4">
            <AutoText className="text-white text-lg font-extrabold mb-1 drop-shadow-md">
              {banner.title}
            </AutoText>
            <AutoText
              className="text-white text-sm mb-2 drop-shadow-md"
              numberOfLines={1}
            >
              {banner.message}
            </AutoText>

            <TouchableOpacity
              className="bg-white/90 px-3 py-1.5 rounded-full flex-row items-center self-end mt-20  "
              onPress={() =>
                router.push(`/(home)/announcements/${banner.slug}`)
              }
            >
              <AutoText className="text-black text-xs font-semibold mr-1">
                Läs mer
              </AutoText>
              <Ionicons name="arrow-forward" size={14} color="#000" />
            </TouchableOpacity>
            {/* Dots inside card */}
            <View className="flex-row justify-center items-center mb-2  drop-shadow-md">
              {demoAnnouncements.map((_, i) => (
                <View
                  key={_.id ?? i}
                  className={`h-2 rounded-full mx-1 ${
                    i === index ? "w-6 bg-white" : "w-2 bg-white/40"
                  }`}
                />
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
