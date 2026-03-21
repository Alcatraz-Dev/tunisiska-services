import React from "react";
import { View, SafeAreaView, TouchableOpacity, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AdminDataList } from "@/app/components/admin/AdminDataList";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";

export default function AdminUsersScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const columns = [
    { key: "userName", label: "Namn" },
    { key: "emailAddress", label: "Email" },
    { key: "isAdmin", label: "Admin Status", type: "status" as const },
    { key: "isDriver", label: "Driver", type: "status" as const },
    { key: "_createdAt", label: "Skapad", type: "date" as const },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: "Administrera Användare",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="chevron-back" size={24} color={isDark ? "white" : "black"} />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: isDark ? "#0f172a" : "white" },
          headerTitleStyle: { color: isDark ? "white" : "black" },
        }} 
      />
      
      <View className="flex-1 mt-6">
        <View className="px-6 mb-6">
            <AutoText className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Brukare</AutoText>
            <AutoText className="text-gray-500 text-sm mt-1">Hantera alla konton registrerade i applikationen</AutoText>
        </View>

        <AdminDataList 
          title="Användare"
          query='*[_type == "user"] | order(_createdAt desc)'
          columns={columns}
          searchField="userName"
          onItemPress={(item) => {
            // Future: item details/edit screen
            console.log("Selected user:", item.userName);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
