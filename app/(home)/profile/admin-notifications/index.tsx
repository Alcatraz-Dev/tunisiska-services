import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { useTheme } from "@/app/context/ThemeContext";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { showAlert } from "@/app/utils/showAlert";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { client } from "@/sanityClient";

export default function AdminNotificationsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadImageToSanity = async (imageUri: string): Promise<string | null> => {
    try {
      console.log("Uploading image to Sanity:", imageUri);

      // Convert image URI to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create a File object from the blob
      const file = new File([blob], `notification-image-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Upload to Sanity
      const result = await client.assets.upload('image', file, {
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert("Behörighet nekad", "Vi behöver åtkomst till ditt bildbibliotek för att välja bilder");
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
          showAlert("Lyckades", "Bilden har laddats upp och är klar att användas");
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

    // No longer need scheduled validation

    setLoading(true);
    try {
      const notificationData: any = {
        title: title.trim(),
        message: message.trim(),
        pushData: {
          type: "admin_broadcast",
          timestamp: new Date().toISOString(),
        }
      };

      // Add image if provided
      if (imageUrl.trim()) {
        notificationData.image = imageUrl.trim();
        notificationData.pushData.image = imageUrl.trim();
      }

      console.log('Sending notification with data:', notificationData);
      let result;
      // Send broadcast notification (no subID for all users)
      result = await nativeNotifyAPI.sendNotification(notificationData);
      console.log('Notification result:', result);

      console.log('Notification send result:', result);

      if (result.success) {
        const successMessage = "Notifikation skickad till alla användare!";
        showAlert("Lyckades", successMessage);
        setTitle("");
        setMessage("");
        setImageUrl("");
        setSelectedImage(null);
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
        <View className="space-y-6">
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
              style={{ height: 120, textAlignVertical: 'top' }}
            />
          </View>


          {/* Image Selection */}
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
                    width: '100%',
                    height: 200,
                    borderRadius: 12,
                    resizeMode: 'cover',
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
              className={`text-sm mb-2 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Notifikationer skickas till alla registrerade användare
            </AutoText>
            <AutoText
              className={`text-sm mb-2 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Användare måste ha push-notifikationer aktiverade
            </AutoText>
            <AutoText
              className={`text-sm ${
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