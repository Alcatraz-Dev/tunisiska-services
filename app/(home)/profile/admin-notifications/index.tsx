import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { showAlert } from "@/app/utils/showAlert";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import { Image, ScrollView, TouchableOpacity, View, useColorScheme, ActivityIndicator } from "react-native";
import VideoPlayer from "@/app/components/VideoPlayer";
import { SafeAreaView } from "react-native-safe-area-context";
import { client } from "@/sanityClient";
import {
  NotificationType,
  NOTIFICATION_TYPE_CONFIGS,
} from "@/app/types/notification";

export default function AdminNotificationsScreen() {
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === "dark";

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<NotificationType>("general");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video" | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"send" | "inbox">("send");
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Colors based on theme
  const colors = {
    bg: isDark ? "#121212" : "#F9FAFB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#111827",
    subtext: isDark ? "#9CA3AF" : "#6B7280",
    border: isDark ? "#374151" : "#E5E7EB",
    primary: "#3b82f6",
  };

  const fetchHistory = useCallback(async () => {
    if (activeTab === "inbox") {
      setFetchingHistory(true);
      try {
        const sanityHistory = await client.fetch('*[_type == "notificationHistory"] | order(sentAt desc)[0...100]');

        const sorted = (sanityHistory || []).map((n: any) => ({
          id: n._id,
          title: n.title,
          message: n.message,
          date: n.sentAt || n._createdAt,
          status: n.status,
          source: 'sanity'
        }));
        
        setHistoryItems(sorted);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setFetchingHistory(false);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const pickMedia = async (mediaType: "image" | "video") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === "image" ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        setSelectedMediaType(mediaType);
        
        // Upload to Sanity
        setLoading(true);
        try {
          showAlert("Laddar upp...", "Vänligen vänta");

          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          const assetDoc = await client.assets.upload(
            mediaType === "image" ? "image" : "file", 
            blob, 
            { filename: asset.uri.split("/").pop() }
          );

          setImageUrl(assetDoc.url);
          showAlert("Lyckades", "Filen har laddats upp!");
        } catch (error) {
          console.error("Upload failed:", error);
          showAlert("Fel", "Det gick inte att ladda upp filen.");
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error picking media:", error);
      showAlert("Fel", "Kunde inte öppna bildbiblioteket.");
    }
  };

  const sendNotification = async () => {
    if (!title || !message) {
      showAlert("Varning", "Ange både titel och meddelande.");
      return;
    }

    setLoading(true);
    let expoSuccess = false;
    let sanitySuccess = false;

    try {
      // 1. Fetch all users with Expo Push Tokens from Sanity
      const usersWithTokens = await client.fetch('*[_type == "users" && defined(expoPushToken)].expoPushToken');
      const uniqueTokens = Array.from(new Set(usersWithTokens)).filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken'));

      if (uniqueTokens.length > 0) {
        // 2. Send to Expo Push API
        const chunks = [];
        for (let i = 0; i < uniqueTokens.length; i += 100) {
          chunks.push(uniqueTokens.slice(i, i + 100));
        }

        for (const chunk of chunks) {
          const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chunk.map(token => ({
              to: token,
              sound: 'default',
              title: title,
              body: message,
              data: { type, screen: "Notification" },
            }))),
          });

          if (expoResponse.ok) {
            expoSuccess = true;
          }
        }
      } else {
        console.warn("No expo tokens found in Sanity");
      }
    } catch (e) {
      console.warn("Expo push delivery failed:", e);
    }

    try {
      // 3. Log to Sanity History
      await client.create({
        _type: "notificationHistory",
        title,
        message,
        type,
        imageUrl: selectedMediaType === "image" ? imageUrl : undefined,
        videoUrl: selectedMediaType === "video" ? imageUrl : undefined,
        sentAt: new Date().toISOString(),
        status: expoSuccess ? "sent" : "history_only",
      });
      sanitySuccess = true;
    } catch (e) {
      console.error("Sanity save failed:", e);
    }

    if (sanitySuccess) {
      if (expoSuccess) {
        showAlert("Framgång", "Notifikationen har skickats via Expo Push och sparats!");
      } else {
        showAlert("Skickat till historik", "Notifikationen sparades i historiken. Inga aktiva enheter hittades för Push just nu.");
      }
      
      setTitle("");
      setMessage("");
      setSelectedImage(null);
      setImageUrl("");
      if (activeTab === "inbox") fetchHistory();
    } else {
      showAlert("Fel", "Det gick inte att spara notifikationen.");
    }
    setLoading(false);
  };

  if (loading && !selectedImage && activeTab === "send") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AutoText style={{ color: colors.text, fontWeight: 'bold', marginTop: 10 }}>Laddar...</AutoText>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AutoText style={{ fontSize: 22, fontWeight: 'bold', color: colors.text }}>Notifikationscenter</AutoText>
          <AutoText style={{ fontSize: 12, color: colors.subtext }}>Hantera utskick och inkommande händelser</AutoText>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity 
          onPress={() => setActiveTab("send")}
          style={{ flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: activeTab === "send" ? 2 : 0, borderBottomColor: colors.primary }}
        >
          <AutoText style={{ fontWeight: 'bold', color: activeTab === "send" ? colors.primary : colors.subtext }}>Skicka</AutoText>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab("inbox")}
          style={{ flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: activeTab === "inbox" ? 2 : 0, borderBottomColor: colors.primary }}
        >
          <AutoText style={{ fontWeight: 'bold', color: activeTab === "inbox" ? colors.primary : colors.subtext }}>Inkorg</AutoText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {activeTab === "send" ? (
          <View>
            <AutoText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>Typ av notifikation</AutoText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {(Object.keys(NOTIFICATION_TYPE_CONFIGS) as NotificationType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: type === t ? colors.primary : colors.border,
                    backgroundColor: type === t ? colors.primary + "10" : colors.card,
                    marginRight: 10
                  }}
                >
                  <Ionicons name={NOTIFICATION_TYPE_CONFIGS[t].icon as any} size={20} color={type === t ? colors.primary : colors.subtext} />
                  <AutoText style={{ marginLeft: 8, color: type === t ? colors.primary : colors.text }}>
                    {NOTIFICATION_TYPE_CONFIGS[t].label}
                  </AutoText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ marginBottom: 20 }}>
              <AutoText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>Titel</AutoText>
              <Input
                placeholder="Ange rubrik"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <AutoText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>Meddelande</AutoText>
              <Input
                placeholder="Skriv ditt meddelande..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={{ marginBottom: 25 }}>
              <AutoText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: colors.text }}>Media (Frivilligt)</AutoText>
              <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity 
                   onPress={() => pickMedia("image")}
                   style={{ 
                     flex: 1, 
                     height: 120, 
                     borderRadius: 16, 
                     borderWidth: 2, 
                     borderStyle: 'dashed', 
                     borderColor: colors.border,
                     alignItems: 'center',
                     justifyContent: 'center',
                     backgroundColor: colors.card
                   }}
                >
                  <Ionicons name="image-outline" size={32} color={colors.primary} />
                  <AutoText style={{ color: colors.primary, marginTop: 5 }}>Bild</AutoText>
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={() => pickMedia("video")}
                   style={{ 
                     flex: 1, 
                     height: 120, 
                     borderRadius: 16, 
                     borderWidth: 2, 
                     borderStyle: 'dashed', 
                     borderColor: colors.border,
                     alignItems: 'center',
                     justifyContent: 'center',
                     backgroundColor: colors.card
                   }}
                >
                  <Ionicons name="videocam-outline" size={32} color={colors.primary} />
                  <AutoText style={{ color: colors.primary, marginTop: 5 }}>Video</AutoText>
                </TouchableOpacity>
              </View>

              {selectedImage && (
                <View style={{ marginTop: 15, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                  {selectedMediaType === "image" ? (
                    <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 200 }} />
                  ) : (
                    <View style={{ width: '100%', height: 200 }}>
                      <VideoPlayer uri={selectedImage} />
                    </View>
                  )}
                  <TouchableOpacity 
                    onPress={() => setSelectedImage(null)}
                    style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 }}
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={sendNotification}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: 'center',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <AutoText style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Skicka Notifikation</AutoText>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {fetchingHistory ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
            ) : historyItems.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Ionicons name="mail-open-outline" size={64} color={colors.subtext} />
                <AutoText style={{ color: colors.subtext, marginTop: 10 }}>Inga skickade notifikationer ännu</AutoText>
              </View>
            ) : (
              historyItems.map((item, index) => (
                <View 
                  key={index} 
                  style={{ 
                    backgroundColor: colors.card, 
                    padding: 15, 
                    borderRadius: 16, 
                    marginBottom: 15,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <View style={{ flex: 1 }}>
                      <AutoText style={{ fontWeight: 'bold', color: colors.text, fontSize: 16 }}>{item.title}</AutoText>
                      {item.status === "failed_push" && (
                        <AutoText style={{ fontSize: 10, color: '#ef4444' }}>Push misslyckades (utgången provperiod)</AutoText>
                      )}
                    </View>
                    <AutoText style={{ fontSize: 12, color: colors.subtext }}>
                      {new Date(item.date).toLocaleDateString()}
                    </AutoText>
                  </View>
                  <AutoText style={{ color: colors.subtext }}>{item.message}</AutoText>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
