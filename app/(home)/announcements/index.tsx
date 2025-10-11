import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { AutoText } from "@/app/components/ui/AutoText";
import VideoPlayer from "@/app/components/VideoPlayer";
import { client } from "@/sanityClient";
import { announcementQuery } from "@/app/hooks/useQuery";
import { TranslatableDateText } from "@/app/utils/dateFormat";

export default function AnnouncementsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await client.fetch(announcementQuery);
        const data = response;
        setAnnouncements(data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };
    fetchAnnouncements();
  }, []);

  const AnnouncementMedia = ({
    media,
  }: {
    media:
      | { type: "image"; imageUrl?: string }
      | { type: "video"; videoUrl?: string }
      | undefined;
  }) => {
    if (!media) return null;

    if (media.type === "video" && media.videoUrl) {
      return <VideoPlayer uri={media.videoUrl} muted={true} />;
    }

    if (media.type === "image" && media.imageUrl) {
      return (
        <Image
          source={{ uri: media.imageUrl }}
          style={{ width: "100%", height: 200, borderRadius: 12, marginTop: 8 }}
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
            className={`text-2xl font-extrabold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Announcements
          </AutoText>
        </View>
        <AutoText
          className={`text-center text-sm mb-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Senaste nyheter, kampanjer och uppdateringar
        </AutoText>
      </View>

      {/* Announcements list */}
      <ScrollView className="p-6 mt-5">
        {announcements.map((a, index) => {
          const media = a.media as
            | any
            | { type: "image"; imageUrl?: string }
            | { type: "video"; videoUrl?: string }
            | undefined;

          return (
            <Animated.View
              entering={FadeInUp.delay(200 * index)}
              exiting={FadeOutDown}
              key={a.slug}
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/(home)/announcements/${a.slug}`)}
                className={`mb-5 flex-row items-start p-4 rounded-2xl shadow-sm ${
                  isDark ? "bg-dark-card" : "bg-white"
                }`}
                style={{ borderLeftWidth: 1, borderLeftColor: `${a.color}` }}
              >
                {/* Icon */}
                {/* <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-4 mt-4"
                  style={{ backgroundColor: `${a.color}20` }}
                >
                  <Ionicons name={a.icon as any} size={18} color={a.color} />
                </View> */}

                {/* Content */}
                <View className="flex-1">
                  <AutoText
                    className={`text-base font-bold mb-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {a.title}
                  </AutoText>
                  <AutoText
                    className={`text-sm leading-5 mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                    numberOfLines={2}
                  >
                    {a.message}
                  </AutoText>

                  {/* Media preview */}
                  <AnnouncementMedia media={media} />

                  <TranslatableDateText
                    dateString={a.date}
                    className={`text-xs mt-2 ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
