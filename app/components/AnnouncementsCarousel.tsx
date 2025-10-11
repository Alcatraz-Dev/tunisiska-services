import React, { useEffect, useState, useRef, use } from "react";
import { View, Text, TouchableOpacity, Animated, Linking } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getPremiumGradient } from "../utils/getPremiumGradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { AutoText } from "./ui/AutoText";
import { client } from "@/sanityClient";
import { announcementQuery } from "../hooks/useQuery";
export default function LiveAnnouncementCard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [announcements, setAnnouncements] = useState<any[]>([]);
  useEffect(() => {
    const fetchAnnouncements = async () => {
      console.log("🚀 Starting to fetch announcements...");
      console.log("🔧 Client config:", {
        projectId: client.config().projectId,
        dataset: client.config().dataset,
        useCdn: client.config().useCdn,
        hasToken: !!client.config().token,
      });
      console.log("📝 Query:", announcementQuery);

      try {
        const response = await client.fetch(announcementQuery);
        console.log("✅ Sanity fetch successful!");
        console.log("📊 Response data:", {
          type: typeof response,
          isArray: Array.isArray(response),
          length: response?.length,
          firstItem: response?.[0]
            ? JSON.stringify(response[0], null, 2)
            : "No items",
        });

        const data = response;
        setAnnouncements(data);
        console.log("✅ State updated with announcements:", data?.length || 0);
      } catch (error: any) {
        console.error("❌ Error fetching announcements:");
        console.error("Error message:", error.message || "Unknown error");
        console.error("Status code:", error.statusCode);
        console.error("Error details:", error.details);
        console.error("Full error:", JSON.stringify(error, null, 2));

        // Test basic connectivity
        try {
          console.log("🔄 Testing basic connectivity...");
          const basicTest = await client.fetch('*[_type == "announcement"][0]');
          console.log("✅ Basic test passed:", !!basicTest);
        } catch (basicError: any) {
          console.error(
            "❌ Basic connectivity also failed:",
            basicError.message
          );
        }
      }
    };
    fetchAnnouncements();
  }, [announcements.length]);

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
      animate();
    }, 5000);

    animate();
    return () => clearInterval(interval);
  }, [announcements.length]);

  // Clamp index when announcements change
  useEffect(() => {
    if (index >= announcements.length) {
      setIndex(0);
    }
  }, [announcements.length]);

  // Determine the media source
  let mediaSource: any = null;
  if (
    announcements[index]?.media?.type === "image" &&
    announcements[index]?.media.imageUrl
  ) {
    mediaSource = { uri: announcements[index]?.media.imageUrl };
  } else if (
    announcements[index]?.media?.type === "video" &&
    announcements[index]?.media.videoUrl
  ) {
    mediaSource = {
      uri: announcements[index]?.media.videoUrl,
      shouldPlay: true,
      isLooping: true,
    };
  }

  const handlePress = () => {
    if (announcements[index]?.link) {
      Linking.openURL(announcements[index]?.link);
    }
  };

  const createdAt = new Date(announcements[index]?.date || "");
  const now = new Date();
  const isNew =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) < 7;

  const optimizeImageUrl = (url?: string, width: number = 1200) =>
    url ? `${url}?auto=format,compress&fit=max&w=${width}` : undefined;

  const [mediaLoaded, setMediaLoaded] = useState(false);
  useEffect(() => {
    setMediaLoaded(false);
  }, [index]);

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
      const player = useVideoPlayer({ uri: media.videoUrl }, (p) => {
        p.loop = true;
        p.muted = true;
        p.play();
      });
      return (
        <View
          style={{
            width: "100%",
            height: 200,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <VideoView
            style={{ width: "100%", height: 200, borderRadius: 12 }}
            player={player}
            surfaceType="textureView"
            contentFit="cover"

          />
        </View>
      );
    }

    if (media.type === "image" && media.imageUrl) {
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
  const AnnouncementVideo = ({ uri }: { uri: string }) => {
    const player = useVideoPlayer({ uri }, (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    });
    return (
      <VideoView
        style={{ width: "100%", height: "100%", borderRadius: 12 }}
        player={player}
        surfaceType="textureView"
        className="w-full h-[200px] rounded-lg aspect-video"
      />
    );
  };
  const media = announcements[index]?.media as
    | any
    | { type: "image"; imageUrl?: string }
    | { type: "video"; videoUrl?: string }
    | undefined;
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

      {announcements[index] ? (
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="w-full items-center"
        >
          <View className="rounded-2xl overflow-hidden w-[95%] h-52 relative">
            <AnnouncementMedia media={media} />
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
                {announcements[index]?.title}
              </AutoText>
              <AutoText
                className="text-white text-sm mb-2 drop-shadow-md"
                numberOfLines={1}
              >
                {announcements[index]?.message}
              </AutoText>

              <TouchableOpacity
                className="bg-white/90 px-3 py-1.5 rounded-full flex-row items-center self-end mt-20  "
                onPress={() =>
                  router.push(
                    `/(home)/announcements/${announcements[index]?.slug}`
                  )
                }
              >
                <AutoText className="text-black text-xs font-semibold mr-1">
                  Läs mer
                </AutoText>
                <Ionicons name="arrow-forward" size={14} color="#000" />
              </TouchableOpacity>
              {/* Dots inside card */}
              {announcements.length > 1 && (
                <View className="flex-row justify-center items-center mb-2  drop-shadow-md">
                  {announcements.map((_, i) => (
                    <View
                      key={_.id ?? i}
                      className={`h-2 rounded-full mx-1 ${
                        i === index ? "w-6 bg-white" : "w-2 bg-white/40"
                      }`}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
