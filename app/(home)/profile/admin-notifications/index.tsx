import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { useTheme } from "@/app/context/ThemeContext";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { showAlert } from "@/app/utils/showAlert";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { client } from "@/sanityClient";
import {
  NotificationType,
  NOTIFICATION_TYPE_CONFIGS,
} from "@/app/types/notification";

export default function AdminNotificationsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notificationType, setNotificationType] = useState<NotificationType>("general");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"send" | "inbox">("send");
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [fetchingPending, setFetchingPending] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await client.fetch(
        '*[_type == "announcement" && !(_id in path("drafts.**"))] | order(date desc)[0...10]{ ..., title, slug, media, _id }'
      );

      const processedAnnouncements = (response || []).map((announcement: any) => {
        let processedMedia = announcement.media;
        if (processedMedia) {
          if (processedMedia.type === "image" && processedMedia.image?.asset?._ref) {
            const imageAssetRef = processedMedia.image.asset._ref;
            const imageId = imageAssetRef.replace("image-", "").replace(/-[a-z]+$/g, "");
            processedMedia.imageUrl = `https://cdn.sanity.io/images/ci4uj541/production/${imageId}.jpg`;
          } else if (processedMedia.type === "video" && processedMedia.video?.asset?._ref) {
            const videoAssetRef = processedMedia.video.asset._ref;
            const videoId = videoAssetRef.replace("file-", "").replace(/-[a-z]+$/g, "");
            processedMedia.videoUrl = `https://cdn.sanity.io/files/ci4uj541/production/${videoId}.mov`;
            if (processedMedia.image?.asset?._ref) {
              const imageAssetRef = processedMedia.image.asset._ref;
              const imageId = imageAssetRef.replace("image-", "").replace(/-[a-z]+$/g, "");
              processedMedia.thumbnailUrl = `https://cdn.sanity.io/images/ci4uj541/production/${imageId}.jpg`;
            }
          }
        }
        return { ...announcement, media: processedMedia, slug: announcement.slug?.current || announcement.slug };
      });

      setAnnouncements(processedAnnouncements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  }, []);

  const fetchPendingItems = useCallback(async () => {
    setFetchingPending(true);
    try {
      const response = await client.fetch(`
        *[_type in ["shippingOrder", "taxiOrder", "containerShippingOrder", "moveOrder", "moveCleaningOrder"] && status == "PENDING"] | order(_createdAt desc) [0...20] {
          _id,
          _type,
          status,
          _createdAt,
          totalPrice,
          "customerName": customerInfo.name,
          "title": coalesce(title, _type)
        }
      `);
      setPendingItems(response || []);
    } catch (err) {
      console.error("Error fetching pending items:", err);
    } finally {
      setFetchingPending(false);
    }
  }, []);

  useEffect(() => {
    if (notificationType === "announcement") {
      fetchAnnouncements();
    }
  }, [notificationType, fetchAnnouncements]);

  useEffect(() => {
    fetchPendingItems();
  }, [fetchPendingItems, activeTab]);

  const uploadImageToSanity = async (imageUri: string): Promise<string | null> => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const file = new File([blob], `notification-image-${Date.now()}.jpg`, { type: "image/jpeg" });
      const result = await client.assets.upload("image", file, { filename: `notification-image-${Date.now()}.jpg` });
      return result.url;
    } catch (error) {
      console.error("Error uploading image to Sanity:", error);
      return null;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert("Behörighet nekad", "Vi behöver åtkomst till ditt bildbibliotek");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        showAlert("Laddar upp...", "Vänligen vänta");
        const uploadedUrl = await uploadImageToSanity(imageUri);
        if (uploadedUrl) {
          setImageUrl(uploadedUrl);
          showAlert("Lyckades", "Bilden har laddats upp");
        } else {
          showAlert("Fel", "Kunde inte ladda upp bilden");
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
    if (notificationType === "announcement" && !selectedAnnouncement) {
      showAlert("Fel", "Välj en annons att länka till");
      return;
    }

    setLoading(true);
    try {
      const notificationData: any = {
        title: title.trim(),
        message: message.trim(),
        pushData: {
          type: notificationType === "announcement" ? "announcement" : "admin_broadcast",
          notificationType: notificationType,
          timestamp: new Date().toISOString(),
        },
      };

      if (imageUrl.trim()) {
        notificationData.image = imageUrl.trim();
        notificationData.pushData.image = imageUrl.trim();
      }

      if (notificationType === "announcement") {
        const selectedAnnouncementData = announcements.find((a) => a.slug === selectedAnnouncement);
        notificationData.pushData.route = `/(home)/announcements/${selectedAnnouncement}`;
        notificationData.pushData.announcementSlug = selectedAnnouncement;
        notificationData.pushData.announcementTitle = selectedAnnouncementData?.title || "";

        if (selectedAnnouncementData?.media) {
          if (selectedAnnouncementData.media.type === "video" && selectedAnnouncementData.media.videoUrl) {
            notificationData.image = selectedAnnouncementData.media.videoUrl;
            notificationData.pushData.image = selectedAnnouncementData.media.videoUrl;
            notificationData.pushData.mediaType = "video";
            notificationData.pushData.videoUrl = selectedAnnouncementData.media.videoUrl;
          } else if (selectedAnnouncementData.media.type === "image" && selectedAnnouncementData.media.imageUrl) {
            notificationData.image = selectedAnnouncementData.media.imageUrl;
            notificationData.pushData.image = selectedAnnouncementData.media.imageUrl;
            notificationData.pushData.mediaType = "image";
          }
        }
      }

      const mediaURL = notificationData.pushData.image || notificationData.image;
      const result = await nativeNotifyAPI.sendNotification({
        title: notificationData.title,
        message: notificationData.message,
        mediaURL: mediaURL,
        pushData: notificationData.pushData,
      });

      if (result.success) {
        showAlert("Framgång", "Notifikationen har skickats!");
        setTitle("");
        setMessage("");
        setImageUrl("");
        setSelectedImage(null);
        setSelectedAnnouncement("");
      } else {
        showAlert("Fel", "Kunde inte skicka: " + result.error);
      }
    } catch (error: any) {
      showAlert("Fel", "Systemfel: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center mb-4 relative">
          <TouchableOpacity onPress={() => router.back()} className="absolute left-0 p-2">
            <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
          <AutoText className={`text-2xl font-extrabold text-center ${isDark ? "text-white" : "text-gray-900"}`}>
            Notifikationscenter
          </AutoText>
        </View>
        <AutoText className={`text-sm text-center mt-1 mx-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Hantera utskick och inkommande händelser
        </AutoText>
      </View>

      <View className="flex-1 px-6">
        <View className="flex-row mb-6 mt-2">
          <TouchableOpacity
            onPress={() => setActiveTab("send")}
            className={`flex-1 py-3 items-center border-b-2 ${activeTab === "send" ? "border-blue-500" : "border-transparent"}`}
          >
            <AutoText className={`font-bold ${activeTab === "send" ? (isDark ? "text-white" : "text-gray-900") : "text-gray-500"}`}>
              Skicka
            </AutoText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("inbox")}
            className={`flex-1 py-3 items-center border-b-2 ${activeTab === "inbox" ? "border-blue-500" : "border-transparent"}`}
          >
            <View className="flex-row items-center">
              <AutoText className={`font-bold ${activeTab === "inbox" ? (isDark ? "text-white" : "text-gray-900") : "text-gray-500"}`}>
                Inkorg
              </AutoText>
              {pendingItems.length > 0 && (
                <View className="ml-2 bg-red-500 rounded-full px-1.5 py-0.5">
                  <AutoText className="text-white text-[10px] font-bold">{pendingItems.length}</AutoText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="pb-10">
            {activeTab === "send" ? (
              <View>
                <AutoText className={`text-lg font-semibold mt-2 mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Typ av notifikation
                </AutoText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {(Object.keys(NOTIFICATION_TYPE_CONFIGS) as NotificationType[]).map((type) => {
                      const config = NOTIFICATION_TYPE_CONFIGS[type];
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setNotificationType(type)}
                          className={`flex-row items-center px-4 py-3 rounded-xl border ${
                            notificationType === type
                              ? (isDark ? "border-blue-500 bg-blue-500/20" : "border-blue-500 bg-blue-50")
                              : (isDark ? "border-gray-700 bg-dark-card" : "border-gray-300 bg-white")
                          }`}
                        >
                          <Ionicons
                            name={config.icon as any}
                            size={20}
                            color={notificationType === type ? "#3b82f6" : (isDark ? "#9ca3af" : "#4b5563")}
                            style={{ marginRight: 8 }}
                          />
                          <AutoText className={`font-medium ${notificationType === type ? "text-blue-500" : (isDark ? "text-gray-400" : "text-gray-600")}`}>
                            {config.label}
                          </AutoText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <View className="mb-4">
                  <AutoText className={`text-base font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Titel
                  </AutoText>
                  <Input value={title} onChangeText={setTitle} placeholder="Ange rubrik" className={`mb-1 p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                </View>

                <View className="mb-4">
                  <AutoText className={`text-base font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Meddelande
                  </AutoText>
                  <Input value={message} onChangeText={setMessage} placeholder="Skriv ditt meddelande..." multiline numberOfLines={4} textAlignVertical="top" className={`p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                </View>

                {notificationType === "announcement" && announcements.length > 0 && (
                  <View className="mb-4">
                    <AutoText className={`text-base font-bold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      Länka till annons
                    </AutoText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1">
                      <View className="flex-row gap-4 px-1 py-1">
                        {announcements.map((item) => (
                          <TouchableOpacity
                            key={item._id}
                            onPress={() => setSelectedAnnouncement(item.slug)}
                            className={`w-60 rounded-2xl overflow-hidden border ${
                              selectedAnnouncement === item.slug
                                ? "border-blue-500"
                                : isDark ? "border-gray-700" : "border-gray-200"
                            }`}
                          >
                            <View className="h-32 bg-gray-100 dark:bg-gray-800">
                              {item.media?.imageUrl ? (
                                <Image source={{ uri: item.media.imageUrl }} className="w-full h-full" resizeMode="cover" />
                              ) : item.media?.thumbnailUrl ? (
                                <Image source={{ uri: item.media.thumbnailUrl }} className="w-full h-full" resizeMode="cover" />
                              ) : (
                                <View className="w-full h-full items-center justify-center">
                                  <Ionicons name="megaphone-outline" size={40} color="#ccc" />
                                </View>
                              )}
                            </View>
                            <View className={`p-3 ${isDark ? "bg-dark-card" : "bg-white"}`}>
                              <AutoText numberOfLines={1} className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                                {item.title}
                              </AutoText>
                              <AutoText className="text-xs text-gray-400 mt-1">{new Date(item._createdAt).toLocaleDateString()}</AutoText>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                <View className="mb-4 mt-2">
                  <AutoText className={`text-base font-bold mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    Media (Frivilligt)
                  </AutoText>
                  <TouchableOpacity
                    onPress={pickImage}
                    className={`h-48 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden ${
                      selectedImage ? "border-blue-500" : (isDark ? "border-gray-700 bg-white/5" : "border-gray-200 bg-gray-50")
                    }`}
                  >
                    {selectedImage ? (
                      <Image source={{ uri: selectedImage }} className="w-full h-full" />
                    ) : (
                      <View className="items-center">
                        <Ionicons name="cloud-upload-outline" size={40} color="#3b82f6" />
                        <AutoText className="text-blue-500 font-semibold mt-2">Lägg till bild</AutoText>
                        <AutoText className="text-gray-500 text-xs mt-1">Stödjer JPG, PNG, WEBP</AutoText>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={sendNotification}
                  disabled={loading}
                  className={`w-full p-4 rounded-xl items-center mt-4 ${isDark ? "bg-blue-600" : "bg-blue-500"} ${loading ? "opacity-50" : ""}`}
                >
                  <AutoText className="text-white font-semibold text-lg">
                    {loading ? "Skickar..." : "Skicka Notifikation"}
                  </AutoText>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {fetchingPending ? (
                  <View className="items-center py-20">
                    <AutoText className={isDark ? "text-gray-400" : "text-gray-600"}>Laddar inkorg...</AutoText>
                  </View>
                ) : pendingItems.length === 0 ? (
                  <View className="items-center py-20 bg-white/5 rounded-3xl border border-dashed border-gray-700">
                    <Ionicons name="mail-open-outline" size={48} color={isDark ? "#444" : "#ccc"} />
                    <AutoText className={`mt-4 ${isDark ? "text-gray-400" : "text-gray-600"} font-medium`}>
                      Din inkorg är tom
                    </AutoText>
                  </View>
                ) : (
                  <View className="gap-4">
                    <AutoText className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                      Väntande åtgärder
                    </AutoText>
                    {pendingItems.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        onPress={() => {
                          const manageType = item._type === "shippingOrder" ? "shipping-orders" : 
                                           item._type === "taxiOrder" ? "taxi-orders" : 
                                           item._type === "containerShippingOrder" ? "container-shipping-orders" :
                                           item._type === "moveCleaningOrder" ? "move-clean-orders" :
                                           "move-orders";
                          router.push(`/(home)/profile/admin-form/${manageType}/${item._id}`);
                        }}
                        className={`p-4 rounded-3xl border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"}`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1">
                            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${
                              item._type === 'shippingOrder' ? 'bg-blue-500/10' : 
                              item._type === 'taxiOrder' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                            }`}>
                              <Ionicons 
                                name={item._type === 'shippingOrder' ? 'cube' : item._type === 'taxiOrder' ? 'car' : 'boat'} 
                                size={24} 
                                color={item._type === 'shippingOrder' ? '#3b82f6' : item._type === 'taxiOrder' ? '#f59e0b' : '#10b981'} 
                              />
                            </View>
                            <View className="ml-4 flex-1">
                              <AutoText className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>
                                {item.customerName || "Ny Order"}
                              </AutoText>
                              <AutoText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {item._type === 'shippingOrder' ? 'Sändning' : item._type === 'taxiOrder' ? 'Taxi' : 'Container'} • {new Date(item._createdAt).toLocaleDateString()}
                              </AutoText>
                            </View>
                          </View>
                          <View className="items-end">
                            <AutoText className="text-red-500 font-bold text-sm">VÄNTAR</AutoText>
                            {item.totalPrice && (
                              <AutoText className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {item.totalPrice} SEK
                              </AutoText>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
