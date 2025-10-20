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
import { SafeAreaView } from "react-native-safe-area-context";
import { client } from "@/sanityClient";

type NotificationType =
  | "message"
  | "booking"
  | "warning"
  | "info"
  | "success"
  | "error"
  | "offer"
  | "delivery"
  | "service"
  | "security"
  | "review"
  | "system"
  | "update"
  | "announcement"
  | "maintenance"
  | "promotion"
  | "general";

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

  // Fetch announcements for selection
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await client.fetch(
          '*[_type == "announcement" && !(_id in path("drafts.**"))] | order(date desc)[0...10]{ title, slug, media }'
        );
        setAnnouncements(response || []);
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
        notificationData.pushData.route = `/(home)/announcements/${selectedAnnouncement}`;
        console.log("Setting route to:", notificationData.pushData.route);
        notificationData.pushData.announcementSlug = selectedAnnouncement;
        notificationData.pushData.announcementTitle = selectedAnnouncementData?.title || "";

        // Use the announcement's media (image or video) for the notification
        if (selectedAnnouncementData?.media) {
          console.log("Announcement media found:", selectedAnnouncementData.media);
          console.log("Media type:", selectedAnnouncementData.media.type);

          if (selectedAnnouncementData.media.type === "video") {
            console.log("Processing video announcement");
            // Priority: resolved videoUrl > constructed from asset reference
            let videoUrl = selectedAnnouncementData.media.videoUrl;

            if (!videoUrl && selectedAnnouncementData.media.video?.asset?._ref) {
              // Construct video URL from asset reference
              const videoAssetRef = selectedAnnouncementData.media.video.asset._ref;
              const videoId = videoAssetRef.replace('file-', '').replace('-mov', '').replace('-mp4', '').replace('-webm', '');
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
              console.log("No video URL found, falling back to image if available");
              // Fallback to image if video URL construction failed
              if (selectedAnnouncementData.media.imageUrl) {
                notificationData.image = selectedAnnouncementData.media.imageUrl;
                notificationData.pushData.image = selectedAnnouncementData.media.imageUrl;
                notificationData.pushData.screenImage = selectedAnnouncementData.media.imageUrl;
                notificationData.pushData.mediaType = "image";
              }
            }
          } else if (selectedAnnouncementData.media.type === "image") {
            console.log("Processing image announcement");
            // Priority: resolved imageUrl > constructed from asset reference
            let imageUrl = selectedAnnouncementData.media.imageUrl;

            if (!imageUrl && selectedAnnouncementData.media.image?.asset?._ref) {
              // Construct image URL from asset reference
              const imageAssetRef = selectedAnnouncementData.media.image.asset._ref;
              const imageId = imageAssetRef.replace('image-', '').replace('-jpg', '').replace('-png', '').replace('-webp', '');
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
            console.log("Unknown media type:", selectedAnnouncementData.media.type);
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
      const mediaURL = notificationData.pushData.screenImage || notificationData.image;
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
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[
                {
                  value: "general",
                  label: "Allmänt",
                  icon: "notifications-outline",
                },
                {
                  value: "message",
                  label: "Meddelande",
                  icon: "chatbubble-ellipses-outline",
                },
                {
                  value: "booking",
                  label: "Bokning",
                  icon: "calendar-outline",
                },
                {
                  value: "warning",
                  label: "Varning",
                  icon: "warning-outline",
                },
                {
                  value: "info",
                  label: "Info",
                  icon: "information-circle-outline",
                },
                {
                  value: "success",
                  label: "Framgång",
                  icon: "checkmark-circle-outline",
                },
                {
                  value: "error",
                  label: "Fel",
                  icon: "close-circle-outline",
                },
                {
                  value: "offer",
                  label: "Erbjudande",
                  icon: "pricetag-outline",
                },
                {
                  value: "delivery",
                  label: "Leverans",
                  icon: "cube-outline",
                },
                {
                  value: "service",
                  label: "Service",
                  icon: "construct-outline",
                },
                {
                  value: "security",
                  label: "Säkerhet",
                  icon: "lock-closed-outline",
                },
                {
                  value: "review",
                  label: "Recension",
                  icon: "star-outline",
                },
                {
                  value: "system",
                  label: "System",
                  icon: "settings-outline",
                },
                {
                  value: "update",
                  label: "Uppdatering",
                  icon: "refresh-outline",
                },
                {
                  value: "announcement",
                  label: "Annons",
                  icon: "megaphone-outline",
                },
                {
                  value: "maintenance",
                  label: "Underhåll",
                  icon: "construct-outline",
                },
                {
                  value: "promotion",
                  label: "Kampanj",
                  icon: "pricetag-outline",
                },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() =>
                    setNotificationType(type.value as NotificationType)
                  }
                    onPressIn={() =>
                    setNotificationType(type.value as NotificationType)
                  }
                  className={`flex-row items-center px-4 py-2 rounded-xl border ${
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
                    size={16}
                    color={
                      notificationType === type.value
                        ? "#3B82F6"
                        : isDark
                          ? "#9CA3AF"
                          : "#6B7280"
                    }
                    style={{ marginRight: 6 }}
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
            {notificationType === "announcement" && (
              <View className="my-3 ">
                <AutoText className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                  ℹ️ Välj en annons att länka till
                </AutoText>
                <View className="space-y-2">
                  {announcements.map((announcement, index) => (
                    <TouchableOpacity
                      key={`${announcement.slug}-${index}`}
                      onPress={() => setSelectedAnnouncement(announcement.slug)}
                      onPressIn={() =>
                        setSelectedAnnouncement(announcement.slug)
                      }
                      className={`p-3 rounded-xl border mb-3 ${
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
                            {announcement.media.type === 'image' && announcement.media.imageUrl ? (
                              <Image
                                source={{ uri: announcement.media.imageUrl }}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 6,
                                  resizeMode: 'cover',
                                }}
                              />
                            ) : announcement.media.type === 'video' ? (
                              <View className="w-10 h-10 bg-gray-300 rounded-lg items-center justify-center">
                                <Ionicons name="videocam" size={16} color="#666" />
                              </View>
                            ) : null}
                          </View>
                        )}

                        <View className="flex-1">
                          <AutoText
                            className={`text-sm font-medium ${
                              selectedAnnouncement === announcement.slug
                                ? "text-blue-600"
                                : isDark
                                  ? "text-gray-300"
                                  : "text-gray-700"
                            }`}
                          >
                            {announcement.title}
                          </AutoText>
                          {announcement.media && (
                            <AutoText className="text-xs text-gray-500 mt-1">
                              {announcement.media.type === "image"
                                ? "📷 Bild"
                                : "🎥 Video"}
                            </AutoText>
                          )}
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
