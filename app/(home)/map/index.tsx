import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AutoText } from "@/app/components/ui/AutoText";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { GoogleMaps, AppleMaps } from "expo-maps";

const { width } = Dimensions.get('window');

export default function MapScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [activeShipments, setActiveShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchActiveShipments = async () => {
      try {
        // Fetch ALL active shipping orders for public map view
        const result = await ShippingOrderService.getAllActiveShippingOrders();

        if (result.success && result.orders) {
          setActiveShipments(result.orders);
        }
      } catch (error) {
        console.error('Error fetching active shipments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveShipments();

    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchActiveShipments, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return isDark ? '#3B82F6' : '#2563EB';
      case 'in_progress': return isDark ? '#F59E0B' : '#D97706';
      default: return isDark ? '#6B7280' : '#4B5563';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Bekräftad';
      case 'in_progress': return 'Pågående';
      default: return 'Okänd';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-blue-700';
      case 'in_progress': return 'text-yellow-700';
      default: return 'text-gray-700';
    }
  };

  const renderShipment = ({ item, index }: any) => (
    <Animated.View
      key={item._id + index}
      entering={FadeInUp.delay(120 * index)}
      exiting={FadeInUp}
      className="flex-1 mb-4"
    >
      {/* Card */}
      <View
        style={{
          backgroundColor: isDark ? "#2c2c2e" : "#ffffff",
          padding: 20,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }}
      >
        {/* Header row */}
        <View className="flex-row justify-between items-center mb-3">
          <AutoText
            className={`text-lg font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Frakt #{item._id?.slice(-6)}
          </AutoText>

          <View
            className={`px-3 py-1 rounded-full ${
              item.status === 'in_progress' ? 'bg-yellow-100' : 'bg-blue-100'
            }`}
          >
            <AutoText
              className={`text-xs font-bold ${
                item.status === 'in_progress' ? 'text-yellow-700' : 'text-blue-700'
              }`}
            >
              {getStatusText(item.status)}
            </AutoText>
          </View>
        </View>

        {/* Route */}
        <View className="space-y-2 mb-4">
          <View className="flex-row items-center">
            <View className={`w-3 h-3 rounded-full ${isDark ? "bg-green-400" : "bg-green-500"} mr-3`} />
            <AutoText className={`font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {item.pickupAddress}
            </AutoText>
          </View>
          <View className="flex-row items-center ml-1.5">
            <View className={`w-0.5 h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"} mr-3`} />
          </View>
          <View className="flex-row items-center">
            <View className={`w-3 h-3 rounded-full ${isDark ? "bg-red-400" : "bg-red-500"} mr-3`} />
            <AutoText className={`font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {item.deliveryAddress}
            </AutoText>
          </View>
        </View>

        {/* Package Details */}
        {item.packageDetails && (
          <View className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <AutoText className={`text-sm font-medium mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              Paket: {item.packageDetails.description || 'Beskrivning saknas'}
            </AutoText>
            <AutoText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Vikt: {item.packageDetails.weight}kg • Värde: {item.packageDetails.value} SEK
            </AutoText>
          </View>
        )}

        {/* Driver Info */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Ionicons name="person-circle" size={24} color={isDark ? "#60A5FA" : "#3B82F6"} />
            <View className="ml-2">
              <AutoText className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                Förare: {item.driverInfo?.name || 'Tilldelas'}
              </AutoText>
              <AutoText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {item.driverInfo?.phone || 'Telefon saknas'}
              </AutoText>
            </View>
          </View>
          <View className="items-end">
            <AutoText className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {item.scheduledDateTime ? new Date(item.scheduledDateTime).toLocaleDateString('sv-SE') : 'Datum saknas'}
            </AutoText>
            <AutoText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {item.scheduledDateTime ? new Date(item.scheduledDateTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : 'Tid saknas'}
            </AutoText>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              // Navigate to detailed map view for this shipment
              router.push(`/(home)/map/${item._id}` as any);
            }}
            style={{
              backgroundColor: isDark ? "#ffffff" : "#111111",
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
            className="flex-1 px-4 py-2.5 rounded-xl items-center"
          >
            <AutoText
              className={`text-sm font-bold ${
                isDark ? "text-gray-900" : "text-white"
              }`}
            >
              Se på karta
            </AutoText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              // Call driver
              const phoneNumber = item.driverInfo?.phone;
              if (phoneNumber) {
                // In a real app, this would open the phone dialer
                console.log(`Calling ${phoneNumber}`);
              } else {
                console.log("Förarens telefonnummer är inte tillgängligt ännu.");
              }
            }}
            style={{
              backgroundColor: isDark ? "#10B981" : "#059669",
              shadowColor: "#10B981",
              shadowOpacity: 0.15,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
            className="flex-1 px-4 py-2.5 rounded-xl items-center"
          >
            <AutoText className="text-sm font-bold text-white">
              Ring förare
            </AutoText>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-3 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center relative mb-2">
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
            Leveranskarta
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Spåra alla aktiva fraktleveranser i realtid
        </AutoText>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <AutoText
            className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            Laddar leveranser...
          </AutoText>
        </View>
      ) : activeShipments.length === 0 ? (
        <View
          className="flex-1 justify-center items-center"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
          }}
        >
          <Ionicons
            name="map-outline"
            size={60}
            color={isDark ? "#6B7280" : "#9CA3AF"}
          />
          <AutoText
            className={`mt-4 text-base ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Inga aktiva leveranser
          </AutoText>
          <AutoText
            className={`mt-2 text-sm text-center px-8 ${
              isDark ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Aktiva fraktleveranser kommer att visas här i realtid
          </AutoText>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6 mt-2"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {activeShipments.map((shipment, index) =>
            renderShipment({ item: shipment, index })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}