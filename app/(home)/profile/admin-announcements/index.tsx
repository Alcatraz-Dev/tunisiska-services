import React from "react";
import { View, SafeAreaView, TouchableOpacity } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AdminDataList } from "@/app/components/admin/AdminDataList";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";

export default function AdminAnnouncementsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const columns = [
    { key: "title", label: "Titel" },
    { key: "message", label: "Meddelande" },
    { key: "date", label: "Datum", type: "date" as const },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: "Hantera Annonser",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="chevron-back" size={24} color={isDark ? "white" : "black"} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push("/profile/admin-notifications")} 
              className="mr-4 bg-primary p-2 rounded-full"
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: isDark ? "#0f172a" : "white" },
          headerTitleStyle: { color: isDark ? "white" : "black" },
        }} 
      />
      
      <View className="flex-1 mt-6">
        <View className="px-6 mb-6">
            <AutoText className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Annonser</AutoText>
            <AutoText className="text-gray-500 text-sm mt-1">Skapa och hantera publika annonser i applikationen</AutoText>
        </View>

        <AdminDataList 
          title="Annonser"
          query='*[_type == "announcement"] | order(date desc)'
          columns={columns}
          searchField="title"
          onItemPress={(item) => {
            console.log("Selected announcement:", item.title);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
