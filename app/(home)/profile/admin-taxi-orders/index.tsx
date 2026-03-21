import React from "react";
import { View, SafeAreaView, TouchableOpacity } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AdminDataList } from "@/app/components/admin/AdminDataList";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";

export default function AdminTaxiOrdersScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const columns = [
    { key: "customerName", label: "Kund" },
    { key: "status", label: "Status", type: "status" as const },
    { key: "totalPrice", label: "Pris", type: "currency" as const },
    { key: "scheduledDateTime", label: "Datum", type: "date" as const },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: "Taxi Bokningar",
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
            <AutoText className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Taxi Ordrar</AutoText>
            <AutoText className="text-gray-500 text-sm mt-1">Hantera och övervaka taxibokningar</AutoText>
        </View>

        <AdminDataList 
          title="Bokningar"
          query='*[_type == "taxiOrder"] { _id, "customerName": customerInfo.name, status, scheduledDateTime, totalPrice } | order(scheduledDateTime desc)'
          columns={columns}
          searchField="customerName"
          onItemPress={(item) => {
            console.log("Selected taxi order:", item._id);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
