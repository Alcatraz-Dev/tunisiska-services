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
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { useTheme } from "@/app/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import VideoPlayer from "@/app/components/VideoPlayer";
import { AutoText } from "@/app/components/ui/AutoText";
import {
  getAnnouncement,
  type Announcement as AnnouncementRecord,
} from "@/app/services/announcementService";
import icons from "@/app/constants/icons";
import { TranslatableDateText } from "@/app/utils/dateFormat";

type AnnouncementMedia = {
  type?: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
};

type Announcement = AnnouncementRecord;

export default function AnnouncementDetails() {
  const { slug } = useLocalSearchParams();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchAnnouncement = async () => {
      try {
        const data = await getAnnouncement(String(slug ?? ""));
        if (!cancelled) setAnnouncement(data);
      } catch (error) {
        console.error("Error fetching announcement:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (slug) {
      fetchAnnouncement();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
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

  const isGenericTitle =
    !announcement.title ||
    announcement.title === "Nytt foto" ||
    announcement.title === "Ny video" ||
    announcement.title === "Bild-uppdatering" ||
    announcement.title === "Video-uppdatering";
  const displayTitle = isGenericTitle
    ? (announcement.message ? announcement.message.slice(0, 60) : "Nyhet")
    : announcement.title;

  const AnnouncementMedia = ({ media }: { media?: AnnouncementMedia }) => {
    if (!media) return null;

    if (media.type === "video" && media.videoUrl) {
      return (
        <View style={{ width: "100%", height: 260, borderRadius: 16, overflow: "hidden", backgroundColor: "#000", marginBottom: 16 }}>
          <VideoPlayer uri={media.videoUrl} muted={false} />
        </View>
      );
    }

    if (media.type === "image" && media.imageUrl) {
      return (
        <View style={{ width: "100%", borderRadius: 16, overflow: "hidden", backgroundColor: "#0a0a0a", marginBottom: 16 }}>
          <Image
            source={{ uri: media.imageUrl }}
            style={{ width: "100%", height: 340 }}
            resizeMode="contain"
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className="px-6 pt-6 pb-2">
        <View className="flex-row items-center justify-center relative mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-0 p-2"
          >
            <AppIcon
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
            {displayTitle}
          </AutoText>
        </View>
        {announcement.message && announcement.message !== displayTitle ? (
          <AutoText
            className={`text-sm text-center mt-2 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {announcement.message}
          </AutoText>
        ) : null}
      </View>

      <Animated.View
        entering={FadeInUp.delay(200 * (parseInt(announcement.id) || 1))}
        exiting={FadeOutDown}
        style={{ flex: 1 }}
      >
        <ScrollView className="px-6 mt-4" contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Media */}
          {announcement.media && (
            <AnnouncementMedia media={announcement.media} />
          )}

          {announcement.isImportant ? (
            <View
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                marginTop: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "#F2761B",
              }}
            >
              <AppIcon name="alert-circle" size={14} color="#FFFFFF" />
              <AutoText className="text-white" style={{ marginLeft: 5 }}>
                Important
              </AutoText>
            </View>
          ) : null}

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
            <PrimaryButton label="Besök länk och läs mer" icon="open-outline" iconPosition="trailing" onPress={openLink} />
          )}
        </ScrollView>
      </Animated.View>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
