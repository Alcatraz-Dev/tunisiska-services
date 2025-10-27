import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { AutoText } from "@/app/components/ui/AutoText";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaxiOrderService } from "@/app/services/taxiOrderService";
import { MoveOrderService } from "@/app/services/moveOrderService";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { useAuth } from "@clerk/clerk-expo";

export default function BookingHistoryScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { userId } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Fetch orders
  useEffect(() => {
    let isMounted = true;

    const fetchAllOrders = async () => {
      if (!userId) {
        if (isMounted) {
          setLoading(false);
          setInitialLoadComplete(true);
        }
        return;
      }

      try {
        const [taxiResult, moveResult, shippingResult] = await Promise.all([
          TaxiOrderService.getUserTaxiOrders(userId),
          MoveOrderService.getUserMoveOrders(userId),
          ShippingOrderService.getUserShippingOrders(userId),
        ]);

        if (!isMounted) return;

        const allOrders: any[] = [];

        // Taxi
        if (taxiResult.success && taxiResult.orders) {
          const taxiOrders = taxiResult.orders.map((order: any) => ({
            id: order._id,
            category: "Taxi",
            dateObj: order.scheduledDateTime ? new Date(order.scheduledDateTime) : null,
            pickup: order.pickupAddress || "Plats saknas",
            dropoff: order.destinationAddress || "Plats saknas",
            status: getStatusText(order.status),
            slug: order._id,
            price: order.totalPrice ? `${order.totalPrice} SEK` : "Pris saknas",
            passengers: order.numberOfPassengers || 1,
            isRoundTrip: Boolean(order.isRoundTrip),
            notes: order.notes || "",
            serviceType: "taxi",
          }));
          allOrders.push(...taxiOrders);
        }

        // Move
        if (moveResult.success && moveResult.orders) {
          const moveOrders = moveResult.orders.map((order: any) => ({
            id: order._id,
            category: "Flytt utan städning",
            dateObj: order.scheduledDateTime ? new Date(order.scheduledDateTime) : null,
            pickup: order.pickupAddress || "Plats saknas",
            dropoff: order.deliveryAddress || "Plats saknas",
            status: getStatusText(order.status),
            slug: order._id,
            price: order.totalPrice ? `${order.totalPrice} SEK` : "Pris saknas",
            passengers: order.numberOfPersons || 1,
            isRoundTrip: false,
            notes: order.notes || "",
            serviceType: "move",
          }));
          allOrders.push(...moveOrders);
        }

        // Shipping
        if (shippingResult.success && shippingResult.orders) {
          const shippingOrders = shippingResult.orders.map((order: any) => ({
            id: order._id,
            category: "Frakt",
            dateObj: order.scheduledDateTime ? new Date(order.scheduledDateTime) : null,
            pickup: order.pickupAddress || "Plats saknas",
            dropoff: order.deliveryAddress || "Plats saknas",
            status: getStatusText(order.status),
            slug: order._id,
            price: order.totalPrice ? `${order.totalPrice} SEK` : "Pris saknas",
            passengers: order.packageDetails?.weight || 0,
            isRoundTrip: false,
            notes: order.notes || "",
            serviceType: "shipping",
          }));
          allOrders.push(...shippingOrders);
        }

        // Sort by date (newest first)
        allOrders.sort((a, b) => {
          const timeA = a.dateObj?.getTime() || 0;
          const timeB = b.dateObj?.getTime() || 0;
          return timeB - timeA;
        });

        if (isMounted) setBookings(allOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
        if (isMounted) setBookings([]);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialLoadComplete(true);
        }
      }
    };

    fetchAllOrders();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Väntar";
      case "confirmed":
        return "Bekräftad";
      case "in_progress":
        return "Pågående";
      case "completed":
        return "Avslutad";
      case "cancelled":
        return "Avbokad";
      default:
        return "Okänd";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Avslutad":
        return "bg-green-100";
      case "Bekräftad":
        return "bg-blue-100";
      case "Pågående":
        return "bg-yellow-100";
      case "Väntar":
        return "bg-gray-100";
      case "Avbokad":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "Avslutad":
        return "text-green-700";
      case "Bekräftad":
        return "text-blue-700";
      case "Pågående":
        return "text-yellow-700";
      case "Väntar":
        return "text-gray-700";
      case "Avbokad":
        return "text-red-600";
      default:
        return "text-gray-700";
    }
  };

  const renderBooking = useCallback(
    ({ item, index }: any) => (
      <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={{ marginBottom: 16 }}>
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
          <View className="flex-row justify-between items-center mb-3">
            <AutoText className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {item.category}
            </AutoText>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
              <AutoText className={`text-xs font-bold ${getStatusTextColor(item.status)}`}>
                {item.status}
              </AutoText>
            </View>
          </View>
          <View className="space-y-2">
            <AutoText className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Datum: {item.dateObj ? item.dateObj.toLocaleDateString("sv-SE") : "Datum saknas"}
            </AutoText>
            <AutoText className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Från: {item.pickup}
            </AutoText>
            <AutoText className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Till: {item.dropoff}
            </AutoText>
            {item.serviceType === "taxi" ? (
              <AutoText className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Passagerare: {item.passengers}
              </AutoText>
            ) : item.serviceType === "shipping" ? (
              <AutoText className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Vikt: {item.passengers} kg
              </AutoText>
            ) : (
              <AutoText className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Personer: {item.passengers}
              </AutoText>
            )}
            {item.isRoundTrip && (
              <AutoText className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Tur och retur
              </AutoText>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/profile/booking/${item.slug}`)}
            style={{
              backgroundColor: isDark ? "#ffffff" : "#111111",
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
              marginTop: 16,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <AutoText className={`text-sm font-bold ${isDark ? "text-gray-900" : "text-white"}`}>
              Se detaljer
            </AutoText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    ),
    [isDark]
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-3 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center relative mb-2">
          <TouchableOpacity onPress={() => router.back()} className="absolute left-0 p-2">
            <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
          <AutoText className={`text-2xl font-extrabold text-center ${isDark ? "text-white" : "text-gray-900"}`}>
            Mina bokningar
          </AutoText>
        </View>
        <AutoText className={`text-sm text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Se din historik av bokade tjänster
        </AutoText>
      </View>

      {/* Content */}
      {loading && !initialLoadComplete ? (
        <View className="flex-1 justify-center items-center">
          <AutoText className={`text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Laddar bokningar...
          </AutoText>
        </View>
      ) : bookings.length === 0 && initialLoadComplete ? (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="document-text-outline" size={60} color={isDark ? "#6B7280" : "#9CA3AF"} />
          <AutoText className={`mt-4 text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>Inga bokningar än</AutoText>
          <AutoText className={`mt-2 text-sm text-center px-8 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Dina bokningar kommer att visas här när du har gjort några
          </AutoText>
        </View>
      ) : initialLoadComplete ? (
        <FlatList
          className="flex-1 px-6 mt-2"
          data={bookings}
          keyExtractor={(item, index) => `${item?.id || 'unknown'}-${index}`}
          renderItem={renderBooking}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={false} // prevent shadow glitches
          getItemLayout={(data, index) => ({
            length: 200, // approximate card height
            offset: 200 * index,
            index,
          })}
        />
      ) : null}
    </SafeAreaView>
  );
}