import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AutoText } from "@/app/components/ui/AutoText";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { useAuth } from "@clerk/clerk-expo";

export default function ShipmentMapScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const { userId } = useAuth();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<any>(null);

  // Handle slug parameter
  const shipmentId = Array.isArray(slug) ? slug[0] : slug;

  useEffect(() => {
    const fetchShipment = async () => {
      if (!shipmentId) {
        setLoading(false);
        return;
      }

      try {
        const result = await ShippingOrderService.getShippingOrder(shipmentId);

        if (result.success && result.order) {
          setShipment(result.order);

          // Simulate driver location updates (in real app, this would come from GPS tracking)
          // For demo purposes, we'll set a mock location
          setDriverLocation({
            latitude: 59.3293, // Stockholm coordinates
            longitude: 18.0686,
            heading: 45,
            speed: 60, // km/h
            lastUpdate: new Date(),
          });
        }
      } catch (error) {
        console.error('Error fetching shipment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();

    // Simulate real-time location updates
    const locationInterval = setInterval(() => {
      if (driverLocation) {
        setDriverLocation((prev: any) => ({
          ...prev,
          lastUpdate: new Date(),
          // Simulate slight movement
          latitude: prev.latitude + (Math.random() - 0.5) * 0.001,
          longitude: prev.longitude + (Math.random() - 0.5) * 0.001,
        }));
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(locationInterval);
  }, [shipmentId]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Bekräftad';
      case 'in_progress': return 'Pågående';
      case 'completed': return 'Avslutad';
      default: return 'Okänd';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
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
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Kartvy
            </AutoText>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Laddar kartdata...
          </AutoText>
        </View>
      </SafeAreaView>
    );
  }

  if (!shipment) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
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
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Kartvy
            </AutoText>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Leverans hittades inte
          </AutoText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
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
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Kartvy - Frakt #{shipment._id?.slice(-6)}
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Spåra din leverans i realtid
        </AutoText>
      </View>

      {/* Map Placeholder */}
      <View className="flex-1 mx-6 mb-4">
        <View
          className={`flex-1 rounded-2xl ${
            isDark ? "bg-gray-800" : "bg-gray-200"
          } items-center justify-center relative overflow-hidden`}
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          {/* Map Background Pattern */}
          <View className="absolute inset-0 opacity-10">
            <View className="w-full h-full bg-gradient-to-br from-blue-500 to-green-500" />
          </View>

          {/* Map Content */}
          <View className="absolute inset-0 p-6">
            {/* Route Line */}
            <View className="absolute top-1/4 left-1/4 right-1/4 h-1 bg-blue-500 rounded-full" />
            <View className="absolute top-1/4 left-1/4 w-3 h-3 bg-green-500 rounded-full" />
            <View className="absolute top-1/4 right-1/4 w-3 h-3 bg-red-500 rounded-full" />

            {/* Truck Icon */}
            {driverLocation && (
              <View className="absolute top-1/3 left-1/2 transform -translate-x-2 -translate-y-2">
                <View className={`w-8 h-8 rounded-full ${isDark ? "bg-blue-600" : "bg-blue-500"} items-center justify-center`}>
                  <Ionicons name="car" size={16} color="white" />
                </View>
              </View>
            )}

            {/* Center Text */}
            <View className="flex-1 items-center justify-center">
              <Ionicons
                name="map-outline"
                size={48}
                color={isDark ? "#6B7280" : "#9CA3AF"}
              />
              <AutoText
                className={`mt-4 text-lg font-medium ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Kartintegration
              </AutoText>
              <AutoText
                className={`mt-2 text-sm text-center px-4 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Här skulle en riktig kartkomponent visas (t.ex. Google Maps eller Mapbox)
              </AutoText>
            </View>
          </View>
        </View>
      </View>

      {/* Shipment Details */}
      <View className="px-6 pb-6">
        <Animated.View
          entering={FadeInUp.duration(600)}
          className={`p-5 rounded-2xl ${
            isDark ? "bg-dark-card" : "bg-light-card"
          }`}
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          {/* Status */}
          <View className="flex-row justify-between items-center mb-4">
            <AutoText className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Status: {getStatusText(shipment.status)}
            </AutoText>
            <View className={`px-3 py-1 rounded-full ${
              shipment.status === 'in_progress' ? 'bg-yellow-100' :
              shipment.status === 'confirmed' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <AutoText className={`text-xs font-bold ${
                shipment.status === 'in_progress' ? 'text-yellow-700' :
                shipment.status === 'confirmed' ? 'text-blue-700' : 'text-green-700'
              }`}>
                {getStatusText(shipment.status)}
              </AutoText>
            </View>
          </View>

          {/* Route */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-3 h-3 bg-green-500 rounded-full mr-3" />
              <AutoText className={`font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                Från: {shipment.pickupAddress}
              </AutoText>
            </View>
            <View className="flex-row items-center ml-1.5 mb-2">
              <View className={`w-0.5 h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"} mr-3`} />
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-red-500 rounded-full mr-3" />
              <AutoText className={`font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                Till: {shipment.deliveryAddress}
              </AutoText>
            </View>
          </View>

          {/* Driver Info */}
          {driverLocation && (
            <View className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="car" size={20} color={isDark ? "#60A5FA" : "#3B82F6"} />
                  <View className="ml-2">
                    <AutoText className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      Förare på väg
                    </AutoText>
                    <AutoText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Uppdaterad {driverLocation.lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </AutoText>
                  </View>
                </View>
                <View className="items-end">
                  <AutoText className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    {driverLocation.speed} km/h
                  </AutoText>
                  <AutoText className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Hastighet
                  </AutoText>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center ${
                isDark ? "bg-blue-600" : "bg-blue-500"
              }`}
              style={{
                shadowColor: isDark ? "#2563EB" : "#3B82F6",
                shadowOpacity: 0.3,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4,
              }}
              onPress={() => {
                const phoneNumber = shipment.driverInfo?.phone;
                if (phoneNumber) {
                  Alert.alert("Ring förare", `Ring ${phoneNumber}?`, [
                    { text: "Avbryt", style: "cancel" },
                    { text: "Ring", onPress: () => {
                      // In a real app, this would open tel: URL
                      console.log(`Calling ${phoneNumber}`);
                    }}
                  ]);
                } else {
                  Alert.alert("Info", "Förarens telefonnummer är inte tillgängligt ännu.");
                }
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="call" size={16} color="white" />
                <AutoText className="text-white font-medium ml-2">
                  Ring förare
                </AutoText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center ${
                isDark ? "bg-green-600" : "bg-green-500"
              }`}
              style={{
                shadowColor: "#10B981",
                shadowOpacity: 0.3,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4,
              }}
              onPress={() => {
                Alert.alert("Support", "Kontakta support för hjälp med din leverans.");
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="help-circle" size={16} color="white" />
                <AutoText className="text-white font-medium ml-2">
                  Support
                </AutoText>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}