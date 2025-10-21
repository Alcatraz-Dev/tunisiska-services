import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { useTheme } from "@/app/context/ThemeContext";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { showAlert } from "@/app/utils/showAlert";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import VideoPlayer from "@/app/components/VideoPlayer";
import { SafeAreaView } from "react-native-safe-area-context";
import { client } from "@/sanityClient";
import {
  NotificationType,
  NOTIFICATION_TYPE_CONFIGS,
} from "@/app/types/notification";
import { VideoView, useVideoPlayer } from "expo-video";

export default function AdminNotificationsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notificationType, setNotificationType] =
    useState<NotificationType>("general");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<string>("");
  // const [videoPlayers, setVideoPlayers] = useState<{ [key: string]: any }>({});

  // Fetch announcements for selection
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await client.fetch(
          '*[_type == "announcement" && !(_id in path("drafts.**"))] | order(date desc)[0...10]{ ..., title, slug, media, _id }'
        );

        // Process announcements to get real URLs
        const processedAnnouncements = (response || []).map(
          (announcement: any) => {
            let processedMedia = announcement.media;

            if (processedMedia) {
              if (
                processedMedia.type === "image" &&
                processedMedia.image?.asset?._ref
              ) {
                // Construct real image URL from Sanity asset reference
                const imageAssetRef = processedMedia.image.asset._ref;
                const imageId = imageAssetRef
                  .replace("image-", "")
                  .replace(/-[a-z]+$/g, "");
                processedMedia.imageUrl = `https://cdn.sanity.io/images/ci4uj541/production/${imageId}.jpg`;
              } else if (
                processedMedia.type === "video" &&
                processedMedia.video?.asset?._ref
              ) {
                // Construct real video URL from Sanity asset reference
                const videoAssetRef = processedMedia.video.asset._ref;
                const videoId = videoAssetRef
                  .replace("file-", "")
                  .replace(/-[a-z]+$/g, "");
                processedMedia.videoUrl = `https://cdn.sanity.io/files/ci4uj541/production/${videoId}.mov`;

                // Also construct thumbnail URL from the image asset if available
                if (processedMedia.image?.asset?._ref) {
                  const imageAssetRef = processedMedia.image.asset._ref;
                  const imageId = imageAssetRef
                    .replace("image-", "")
                    .replace(/-[a-z]+$/g, "");
                  processedMedia.thumbnailUrl = `https://cdn.sanity.io/images/ci4uj541/production/${imageId}.jpg`;
                }
              }
            }

            return {
              ...announcement,
              media: processedMedia,
            };
          }
        );

        setAnnouncements(processedAnnouncements);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
    };

    if (notificationType === "announcement") {
      fetchAnnouncements();
    }
  }, [notificationType]);

  const uploadImageToSanity = async (
    imageUri: string
  ): Promise<string | null> => {
    try {
      console.log("Uploading image to Sanity:", imageUri);

      // Convert image URI to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create a File object from the blob
      const file = new File([blob], `notification-image-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Upload to Sanity
      const result = await client.assets.upload("image", file, {
        filename: `notification-image-${Date.now()}.jpg`,
      });

      // Get the URL of the uploaded image
      const uploadedUrl = result.url;

      console.log("Image uploaded to Sanity successfully:", uploadedUrl);
      return uploadedUrl;
    } catch (error) {
      console.error("Error uploading image to Sanity:", error);
      return null;
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Behörighet nekad",
          "Vi behöver åtkomst till ditt bildbibliotek för att välja bilder"
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);

        // Upload image and get URL
        showAlert("Laddar upp...", "Vänligen vänta medan bilden laddas upp");
        const uploadedUrl = await uploadImageToSanity(imageUri);

        if (uploadedUrl) {
          setImageUrl(uploadedUrl);
          showAlert(
            "Lyckades",
            "Bilden har laddats upp och är klar att användas"
          );
        } else {
          showAlert("Fel", "Kunde inte ladda upp bilden. Försök igen.");
          setSelectedImage(null);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert("Fel", "Kunde inte välja bild");
    }
  };

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert("Fel", "Titel och meddelande krävs");
      return;
    }

    // For announcement type, announcement selection is required
    if (
      notificationType === "announcement" &&
      (!selectedAnnouncement ||
        (typeof selectedAnnouncement === "string" &&
          selectedAnnouncement.trim() === ""))
    ) {
      showAlert("Fel", "Välj en annons att länka till");
      return;
    }

    // For announcement type, ensure we have the selected announcement data
    let selectedAnnouncementData = null;
    if (notificationType === "announcement" && selectedAnnouncement) {
      selectedAnnouncementData = announcements.find(
        (a) => a.slug === selectedAnnouncement
      );
      if (!selectedAnnouncementData) {
        showAlert("Fel", "Kunde inte hitta vald annons");
        return;
      }
    }

    setLoading(true);
    try {
      const notificationData: any = {
        title: title.trim(),
        message: message.trim(),
        pushData: {
          type:
            notificationType === "announcement"
              ? "announcement"
              : "admin_broadcast",
          notificationType: notificationType,
          timestamp: new Date().toISOString(),
        },
      };

      // Add image if provided
      if (imageUrl.trim()) {
        notificationData.image = imageUrl.trim();
        notificationData.pushData.image = imageUrl.trim();
      }

      // Add route and media for announcements
      if (notificationType === "announcement") {
        const selectedAnnouncementData = announcements.find(
          (a) => a.slug === selectedAnnouncement
        );
        const routeSlug =
          typeof selectedAnnouncement === "string"
            ? selectedAnnouncement
            : (selectedAnnouncement as any)?.current ||
              String(selectedAnnouncement);
        notificationData.pushData.route = `/(home)/announcements/${routeSlug}`;
        console.log(
          "Setting route to:",
          notificationData.pushData.route,
          "from selectedAnnouncement:",
          selectedAnnouncement,
          "routeSlug:",
          routeSlug
        );
        const announcementSlug =
          typeof selectedAnnouncement === "string"
            ? selectedAnnouncement
            : (selectedAnnouncement as any)?.current ||
              String(selectedAnnouncement);
        notificationData.pushData.announcementSlug = announcementSlug;
        notificationData.pushData.announcementTitle =
          selectedAnnouncementData?.title || "";

        // Use the announcement's media (image or video) for the notification
        if (selectedAnnouncementData?.media) {
          console.log(
            "Announcement media found:",
            selectedAnnouncementData.media
          );
          console.log("Media type:", selectedAnnouncementData.media.type);

          if (selectedAnnouncementData.media.type === "video") {
            console.log("Processing video announcement");
            // Priority: resolved videoUrl > constructed from asset reference
            let videoUrl = selectedAnnouncementData.media.videoUrl;

            if (
              !videoUrl &&
              selectedAnnouncementData.media.video?.asset?._ref
            ) {
              // Construct video URL from asset reference
              const videoAssetRef =
                selectedAnnouncementData.media.video.asset._ref;
              const videoId = videoAssetRef
                .replace("file-", "")
                .replace("-mov", "")
                .replace("-mp4", "")
                .replace("-webm", "");
              videoUrl = `https://cdn.sanity.io/files/ci4uj541/production/${videoId}.mov`;
              console.log("Constructed video URL from asset ref:", videoUrl);
            }

            if (videoUrl) {
              console.log("Using video URL:", videoUrl);
              notificationData.image = videoUrl;
              notificationData.pushData.image = videoUrl;
              notificationData.pushData.screenImage = videoUrl;
              notificationData.pushData.mediaType = "video";
              notificationData.pushData.videoUrl = videoUrl;
            } else {
              console.log(
                "No video URL found, falling back to image if available"
              );
              // Fallback to image if video URL construction failed
              if (selectedAnnouncementData.media.imageUrl) {
                notificationData.image =
                  selectedAnnouncementData.media.imageUrl;
                notificationData.pushData.image =
                  selectedAnnouncementData.media.imageUrl;
                notificationData.pushData.screenImage =
                  selectedAnnouncementData.media.imageUrl;
                notificationData.pushData.mediaType = "image";
              }
            }
          } else if (selectedAnnouncementData.media.type === "image") {
            console.log("Processing image announcement");
            // Priority: resolved imageUrl > constructed from asset reference
            let imageUrl = selectedAnnouncementData.media.imageUrl;

            if (
              !imageUrl &&
              selectedAnnouncementData.media.image?.asset?._ref
            ) {
              // Construct image URL from asset reference
              const imageAssetRef =
                selectedAnnouncementData.media.image.asset._ref;
              const imageId = imageAssetRef
                .replace("image-", "")
                .replace("-jpg", "")
                .replace("-png", "")
                .replace("-webp", "");
              imageUrl = `https://cdn.sanity.io/images/ci4uj541/production/${imageId}.jpg`;
              console.log("Constructed image URL from asset ref:", imageUrl);
            }

            if (imageUrl) {
              console.log("Using image URL:", imageUrl);
              notificationData.image = imageUrl;
              notificationData.pushData.image = imageUrl;
              notificationData.pushData.screenImage = imageUrl;
              notificationData.pushData.mediaType = "image";
            }
          } else {
            console.log(
              "Unknown media type:",
              selectedAnnouncementData.media.type
            );
          }
        } else {
          console.log("No announcement media found, using fallback");
          if (imageUrl.trim()) {
            // Fallback to uploaded image if announcement has no media
            notificationData.pushData.screenImage = imageUrl.trim();
            notificationData.pushData.mediaType = "image";
          }
        }
      }

      console.log("Sending notification with data:", notificationData);

      // Try the suggested approach with mediaURL
      const mediaURL =
        notificationData.pushData.screenImage || notificationData.image;
      console.log("Using mediaURL:", mediaURL);

      let result;
      // Send broadcast notification (no subID for all users)
      result = await nativeNotifyAPI.sendNotification({
        title: notificationData.title,
        message: notificationData.message,
        mediaURL: mediaURL,
        pushData: notificationData.pushData,
      });
      console.log("Notification result:", result);

      console.log("Notification send result:", result);

      if (result.success) {
        const successMessage =
          notificationType === "announcement"
            ? "Annonsnotifikation skickad till alla användare! Bilden kommer att visas och länka till annonssidan."
            : "Notifikation skickad till alla användare!";
        showAlert("Lyckades", successMessage);
        setTitle("");
        setMessage("");
        setImageUrl("");
        setSelectedImage(null);
        setNotificationType("general");
        setSelectedAnnouncement("");
      } else {
        showAlert("Fel", result.error || "Kunde inte skicka notifikation");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      showAlert("Fel", "Ett fel uppstod när notifikationen skulle skickas");
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center mb-4 relative">
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
            className={`text-2xl font-extrabold text-center ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Skicka Notifikation
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 mx-5 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Skicka notifikationer till alla användare
        </AutoText>
      </View>

      <ScrollView
        className={`flex-1 px-6 ${isDark ? "bg-dark" : "bg-light"}`}
        showsVerticalScrollIndicator={false}
      >
        <View className="my-6">
          {/* Notification Type Selector */}
          <View>
            <AutoText
              className={`text-lg font-semibold mt-2 mb-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Typ av notifikation
            </AutoText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row gap-2">
                {(Object.keys(NOTIFICATION_TYPE_CONFIGS) as NotificationType[])
                  .map((type) => {
                    const config = NOTIFICATION_TYPE_CONFIGS[type];
                    return {
                      value: type,
                      label: config.label,
                      icon: config.icon,
                    };
                  })
                  .map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() =>
                        setNotificationType(type.value as NotificationType)
                      }
                      onPressIn={() =>
                        setNotificationType(type.value as NotificationType)
                      }
                      className={`flex-row items-center px-4 py-3 rounded-xl border ${
                        notificationType === type.value
                          ? isDark
                            ? "border-blue-500 bg-blue-500/20"
                            : "border-blue-500 bg-blue-50"
                          : isDark
                            ? "border-gray-700 bg-dark-card"
                            : "border-gray-300 bg-white"
                      }`}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={18}
                        color={
                          notificationType === type.value
                            ? "#3B82F6"
                            : isDark
                              ? "#9CA3AF"
                              : "#6B7280"
                        }
                        style={{ marginRight: 8 }}
                      />
                      <AutoText
                        className={`text-sm font-medium ${
                          notificationType === type.value
                            ? "text-blue-600"
                            : isDark
                              ? "text-gray-300"
                              : "text-gray-700"
                        }`}
                      >
                        {type.label}
                      </AutoText>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
            {notificationType === "announcement" && (
              <View className="my-3 ">
                <AutoText
                  className={`text-sm  mb-4 font-semibold ${isDark ? "text-amber-400" : "text-amber-600 "}`}
                >
                  Välj en annons att länka till
                </AutoText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  <View className="flex-row gap-3">
                    {announcements.map((announcement, index) => (
                      <TouchableOpacity
                        key={`${announcement.slug}-${index}`}
                        onPress={() =>
                          setSelectedAnnouncement(announcement.slug)
                        }
                        onPressIn={() =>
                          setSelectedAnnouncement(announcement.slug)
                        }
                        className={`p-3 rounded-xl border min-w-[280px] ${
                          selectedAnnouncement === announcement.slug
                            ? isDark
                              ? "border-blue-500 bg-blue-500/20"
                              : "border-blue-500 bg-blue-50"
                            : isDark
                              ? "border-gray-700 bg-dark-card"
                              : "border-gray-300 bg-white"
                        }`}
                      >
                        <View className="flex-row items-center">
                          {/* Media Preview */}
                          {announcement.media && (
                            <View className="mr-3">
                              {announcement.media.type === "image" &&
                              announcement.media.imageUrl ? (
                                <Image
                                  source={{ uri: announcement.media.imageUrl }}
                                  style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 8,
                                    resizeMode: "cover",
                                  }}
                                />
                              ) : announcement.media.type === "video" &&
                                announcement.media.videoUrl ? (
                                <>
                                  <View className="w-[60px] h-[60px] rounded-lg overflow-hidden relative">
                                    <View
                                      style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: isDark
                                          ? "#374151"
                                          : "#e5e7eb",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <VideoPlayer
                                        uri={announcement.media.videoUrl}
                                        muted
                                        aspectRatio={1}
                                      />
                                    </View>
                                  </View>
                                </>
                              ) : null}
                            </View>
                          )}

                          <View className="flex-1 mb-8 max-w-[300px] ">
                            <AutoText
                              className={`text-sm font-semibold mb-1  line-clamp-1 ${
                                selectedAnnouncement === announcement.slug
                                  ? "text-blue-600"
                                  : isDark
                                    ? "text-gray-300"
                                    : "text-gray-700"
                              }`}
                            >
                              {announcement.title}
                            </AutoText>
                            <AutoText
                              className={`text-xs font-semibold  line-clamp-1 mr-5 ${
                                selectedAnnouncement === announcement.slug
                                  ? "text-blue-600"
                                  : isDark
                                    ? "text-gray-300"
                                    : "text-gray-700"
                              }`}
                            >
                              {announcement.message}
                            </AutoText>
                             
                          </View>

                          {selectedAnnouncement === announcement.slug && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#3B82F6"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {/* Title Input */}
          <View>
            <AutoText
              className={`text-lg font-semibold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Titel
            </AutoText>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Ange notifikationstitel"
              className={`w-full p-4 rounded-xl border mb-4 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            />
          </View>

          {/* Message Input */}
          <View>
            <AutoText
              className={`text-lg font-semibold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Meddelande
            </AutoText>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Ange notifikationsmeddelande"
              multiline
              numberOfLines={4}
              className={`w-full p-4 rounded-xl border mb-4 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
              style={{ height: 120, textAlignVertical: "top" }}
            />
          </View>

          {/* Image Selection */}
          {notificationType !== "announcement" && (
            <View>
              <AutoText
                className={`text-lg font-semibold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Bild (valfritt)
              </AutoText>

              {/* Image Picker Button */}
              <TouchableOpacity
                onPress={pickImage}
                className={`w-full p-4 rounded-xl border mb-4 items-center ${
                  isDark
                    ? "border-gray-700 bg-dark-card"
                    : "border-gray-300 bg-white"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="image-outline"
                    size={20}
                    color={isDark ? "#fff" : "#666"}
                  />
                  <AutoText
                    className={`ml-2 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {selectedImage ? "Ändra bild" : "Välj bild från galleri"}
                  </AutoText>
                </View>
              </TouchableOpacity>

              {/* Selected Image Preview */}
              {selectedImage && (
                <View className="mb-4">
                  <Image
                    source={{ uri: selectedImage }}
                    style={{
                      width: "100%",
                      height: 200,
                      borderRadius: 12,
                      resizeMode: "cover",
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedImage(null);
                      setImageUrl("");
                    }}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              {/* URL Display (read-only) */}
              {imageUrl && (
                <View className="mb-2">
                  <AutoText
                    className={`text-sm font-medium mb-1 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Bild-URL:
                  </AutoText>
                  <View
                    className={`p-3 rounded-xl border ${
                      isDark
                        ? "border-gray-700 bg-dark-card"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <AutoText
                      className={`text-xs break-all ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {imageUrl}
                    </AutoText>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Send Button */}
          <TouchableOpacity
            onPress={sendNotification}
            disabled={loading}
            className={`w-full p-4 rounded-xl items-center mt-2 ${
              isDark ? "bg-blue-600" : "bg-blue-500"
            } ${loading ? "opacity-50" : ""}`}
          >
            <AutoText className="text-white font-semibold text-lg">
              {loading ? "Skickar..." : "Skicka Notifikation"}
            </AutoText>
          </TouchableOpacity>

          {/* Info Section */}
          <View
            className={`rounded-2xl p-5 mt-5 ${
              isDark ? "bg-dark-card" : "bg-gray-100"
            }`}
          >
            <AutoText
              className={`text-base font-semibold mb-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Information
            </AutoText>
            <AutoText
              className={`text-xs mb-2 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Notifikationer skickas till alla registrerade användare
            </AutoText>
            <AutoText
              className={`text-xs mb-2 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Användare måste ha push-notifikationer aktiverade
            </AutoText>
            <AutoText
              className={`text-xs ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Notifikationer visas även i appens notifikationsflöde
            </AutoText>
          </View>
        </View>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
