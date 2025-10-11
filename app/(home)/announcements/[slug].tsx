import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import { AutoText } from "@/app/components/ui/AutoText";
import { client } from "@/sanityClient";
import { singleAnnouncementQuery } from "@/app/hooks/useQuery";
import icons from "@/app/constants/icons";
import { TranslatableDateText } from "@/app/utils/dateFormat";

type AnnouncementMedia =
  | { type: "image"; imageUrl: string }
  | { type: "video"; videoUrl: string };

type Announcement = {
  id: string;
  title: string;
  message: string;
  description: string;
  date: string;
  slug: string;
  link?: string;
  media?: AnnouncementMedia;
};

export default function AnnouncementDetails() {
  const { slug } = useLocalSearchParams();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const data: Announcement = await client.fetch(singleAnnouncementQuery, {
          slug,
        });
        setAnnouncement(data || null);
      } catch (error) {
        console.error("Error fetching announcement:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark" : "bg-light"
        }`}
      >
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
      </SafeAreaView>
    );
  }

  if (!announcement) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark" : "bg-light"
        }`}
      >
        <AutoText className={isDark ? "text-white" : "text-gray-900"}>
          Meddelande hittades inte
        </AutoText>
      </SafeAreaView>
    );
  }

  const openLink = () => {
    if (announcement.link) {
      Linking.openURL(announcement.link);
    }
  };

  const AnnouncementMedia = ({ media }: { media?: AnnouncementMedia }) => {
    if (!media) return null;

    if (media.type === "video") {
      const player = useVideoPlayer({ uri: media.videoUrl }, (p) => {
        p.loop = true;
        p.muted = false;
        p.play();
      });
      return (
        <View
          style={{ aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden" }}
        >
          <VideoView
            style={{ width: "100%", height: "100%" }}
            player={player}
            surfaceType="textureView"
          />
        </View>
      );
    }

    if (media.type === "image") {
      return (
        <Image
          source={{ uri: media.imageUrl }}
          style={{ width: "100%", height: 200, borderRadius: 12 }}
          resizeMode="cover"
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <View className="flex-row items-center justify-center relative mb-4">
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
            className={`text-2xl font-extrabold text-center mx-10 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {announcement.title}
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-500" : "text-gray-500"
          }`}
        >
          {announcement.message}
        </AutoText>
      </View>

      <Animated.View
        entering={FadeInUp.delay(200 * parseInt(announcement.id))}
        exiting={FadeOutDown}
      >
        <ScrollView className="px-6 mt-10">
          {/* Media */}
          {announcement.media && (
            <AnnouncementMedia media={announcement.media} />
          )}

          {/* Description */}
          <AutoText
            className={`text-base leading-6 mt-10 mb-4 ${
              isDark ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {announcement.description}
          </AutoText>

          {/* Date */}
          <View className="flex-row items-center justify-between">
            <AutoText
              className={`text-xs mb-6 ${
                isDark ? "text-gray-500" : "text-gray-500"
              }`}
            >
              Publicerad
            </AutoText>

            <TranslatableDateText
              dateString={announcement.date}
              className={`text-xs mb-6 ${
                isDark ? "text-gray-500" : "text-gray-500"
              }`}
            />
          </View>

          {/* External link */}
          {announcement.link && (
            <TouchableOpacity
              onPress={openLink}
              className="flex-row items-center justify-center bg-blue-600 rounded-xl p-4 gap-1"
            >
              <AutoText className="text-white font-semibold text-sm">
                Besök länk och läs mer
              </AutoText>
              <Image
                source={icons.glob}
                style={{ width: 16, height: 16 }}
                tintColor={resolvedTheme === "dark" ? "#fff" : "#fff"}
              />
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
