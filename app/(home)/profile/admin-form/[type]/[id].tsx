import React, { useState, useEffect } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";
import { client } from "@/sanityClient";

export default function AdminFormScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [schema, setSchema] = useState<any[]>([]);

  useEffect(() => {
    if (!isNew) {
      fetchItem();
    }
    // Simple schema inference based on type
    setSchema(getSchemaFields(type));
  }, [type, id]);

  const fetchItem = async () => {
    try {
      const data = await client.getDocument(id!);
      setFormData(data);
    } catch (error) {
      console.error("Fetch failed:", error);
      Alert.alert("Fel", "Kunde inte hämta data.");
    } finally {
      setLoading(false);
    }
  };

  const getSchemaFields = (entityType: string) => {
    // This is a simplified version of what Sanity Studio does
    // In a real app, you might want to fetch the actual schema or define it fully
    switch (entityType) {
      case "users":
        return [
          { name: "userName", label: "Användarnamn", type: "text" },
          { name: "emailAddress", label: "Email", type: "text" },
          { name: "isAdmin", label: "Är Admin", type: "boolean" },
        ];
      case "announcements":
        return [
          { name: "title", label: "Titel", type: "text" },
          {
            name: "message",
            label: "Meddelande",
            type: "text",
            multiline: true,
          },
          { name: "date", label: "Datum", type: "date" },
        ];
      case "live-status":
        return [
          { name: "service", label: "Tjänst", type: "text" },
          { name: "status", label: "Status", type: "text" },
        ];
      case "shipping-schedules":
      case "container-shipping-schedules":
        return [
          { name: "route", label: "Rutt", type: "text" },
          { name: "departureDate", label: "Avgångsdatum", type: "text" },
          { name: "status", label: "Status", type: "text" },
        ];
      default:
        // Fallback for fields we find in formData if they are basic types
        return Object.keys(formData)
          .filter((k) => !k.startsWith("_"))
          .map((k) => ({
            name: k,
            label: k.charAt(0).toUpperCase() + k.slice(1),
            type: typeof formData[k] === "boolean" ? "boolean" : "text",
          }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        // Map type to sanity schema name
        const schemaMap: any = {
          users: "user",
          announcements: "announcement",
          "live-status": "liveStatus",
          "shipping-schedules": "shippingSchedule",
          "container-shipping-schedules": "containerShippingSchedule",
          "shipping-orders": "shippingOrder",
          "container-shipping-orders": "containerShippingOrder",
          "taxi-orders": "taxiOrder",
          "move-orders": "moveOrder",
          "move-clean-orders": "moveCleaningOrder",
        };

        await client.create({
          _type: schemaMap[type] || type,
          ...formData,
        });
      } else {
        await client.patch(id!).set(formData).commit();
      }
      Alert.alert("Klart", "Data har sparats.");
      router.back();
    } catch (error: any) {
      console.error("Save failed:", error);
      Alert.alert("Fel", "Sparandet misslyckades: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        className={`flex-1 justify-center items-center ${isDark ? "bg-dark" : "bg-white"}`}
      >
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen
        options={{
          headerTitle: isNew ? "Lägg till" : "Redigera",
          headerStyle: { backgroundColor: isDark ? "#0f0f0f" : "#fff" },
          headerTintColor: isDark ? "#fff" : "#000",
        }}
      />

      <ScrollView className="flex-1 px-6 pt-6">
        {schema.map((field) => (
          <View key={field.name} className="mb-6">
            <AutoText
              className={`text-sm font-bold mb-2 uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {field.label}
            </AutoText>

            {field.type === "boolean" ? (
              <View className="flex-row items-center justify-between">
                <AutoText className={isDark ? "text-white" : "text-black"}>
                  {field.label}
                </AutoText>
                <Switch
                  value={formData[field.name]}
                  onValueChange={(val) =>
                    setFormData({ ...formData, [field.name]: val })
                  }
                  trackColor={{ false: "#767577", true: "#3b82f6" }}
                />
              </View>
            ) : (
              <TextInput
                className={`p-4 rounded-2xl ${isDark ? "bg-white/5 text-white" : "bg-gray-100 text-black"}`}
                value={formData[field.name]?.toString() || ""}
                onChangeText={(val) =>
                  setFormData({ ...formData, [field.name]: val })
                }
                placeholder={`Ange ${field.label.toLowerCase()}`}
                placeholderTextColor={isDark ? "#555" : "#999"}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 4 : 1}
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`mt-6 py-4 rounded-[32px] items-center justify-center ${saving ? "bg-gray-500" : "bg-primary"}`}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AutoText className="text-white font-black text-lg">
              {isNew ? "SPARA NY" : "UPPDATERA"}
            </AutoText>
          )}
        </TouchableOpacity>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
