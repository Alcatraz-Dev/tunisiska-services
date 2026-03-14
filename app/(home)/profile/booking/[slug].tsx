import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { StatusBar } from "expo-status-bar";
import BookingProgress from "@/app/components/BookingProgress";
import { AutoText } from "@/app/components/ui/AutoText";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaxiOrderService } from "@/app/services/taxiOrderService";
import { MoveOrderService } from "@/app/services/moveOrderService";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { ContainerShippingOrderService } from "@/app/services/containerShippingOrderService";
import * as Linking from "expo-linking";
import { showAlert } from "@/app/utils/showAlert";


export default function BookingDetailsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceType, setServiceType] = useState<'taxi' | 'move' | 'shipping' | 'container-shipping' | null>(null);
  const progress = useSharedValue(0);

  // Handle slug parameter - it might be an array or string
  const orderId = Array.isArray(slug) ? slug[0] : slug;

  const fetchOrder = async (isRefresh = false) => {
    if (!orderId) {
      if (!isRefresh) setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      // Try to fetch as taxi order first
      let result = await TaxiOrderService.getTaxiOrder(orderId as string);
      let orderType: 'taxi' | 'move' | 'shipping' | 'container-shipping' = 'taxi';

      // If taxi order not found, try move order
      if (!result.success || !result.order) {
        result = await MoveOrderService.getMoveOrder(orderId as string);
        orderType = 'move';
      }

      // If move order not found, try shipping order
      if (!result.success || !result.order) {
        result = await ShippingOrderService.getShippingOrder(orderId as string);
        orderType = 'shipping';
      }

      // If shipping order not found, try container shipping order
      if (!result.success || !result.order) {
        result = await ContainerShippingOrderService.getShippingOrder(orderId as string);
        orderType = 'container-shipping';
      }

      if (result.success && result.order) {
        const order = result.order;
        let transformedBooking: any;

        if (orderType === 'taxi') {
          transformedBooking = {
            id: order._id || "N/A",
            category: "Taxi",
            date: order.scheduledDateTime ? new Date(order.scheduledDateTime).toLocaleDateString('sv-SE') : "Datum saknas",
            pickup: order.pickupAddress || "Plats saknas",
            dropoff: order.destinationAddress || "Plats saknas",
            status: getStatusText(order.status || "unknown"),
            price: order.totalPrice ? `${order.totalPrice} SEK` : "Pris saknas",
            passengers: order.numberOfPassengers || 1,
            isRoundTrip: Boolean(order.isRoundTrip),
            returnDateTime: order.returnDateTime,
            estimatedDistance: order.estimatedDistance || 0,
            notes: order.notes || "",
            customerInfo: order.customerInfo || { name: "Namn saknas", phone: "Telefon saknas" },
            paymentMethod: order.paymentMethod || 'stripe',
            createdAt: order.createdAt,
            scheduledDateTime: order.scheduledDateTime,
          };
        } else if (orderType === 'move') {
          // Move order
          transformedBooking = {
            id: order._id || "N/A",
            category: "Flytt utan städning",
            date: order.scheduledDateTime ? new Date(order.scheduledDateTime).toLocaleDateString('sv-SE') : "Datum saknas",
            pickup: order.pickupAddress || "Plats saknas",
            dropoff: order.deliveryAddress || "Plats saknas",
            status: getStatusText(order.status || "unknown"),
            price: order.totalPrice ? `${order.totalPrice} SEK` : "Pris saknas",
            passengers: order.numberOfPersons || 1,
            isRoundTrip: false,
            returnDateTime: null,
            estimatedDistance: 0,
            notes: order.notes || "",
            customerInfo: order.customerInfo || { name: "Namn saknas", phone: "Telefon saknas", email: "E-post saknas" },
            paymentMethod: order.paymentMethod || 'cash',
            createdAt: order.createdAt,
            scheduledDateTime: order.scheduledDateTime,
          };
        } else if (orderType === 'shipping') {
          // Shipping order
          let pickupLocation = order.pickupAddress || "Plats saknas";
          let dropoffLocation = order.deliveryAddress || "Plats saknas";

          if (order.route) {
            const routeParts = order.route.split('_');
            if (routeParts.length === 2) {
              pickupLocation = routeParts[0]
                .replace('stockholm', 'Stockholm')
                .replace('goteborg', 'Göteborg')
                .replace('malmo', 'Malmö')
                .replace('tunis', 'Tunis')
                .replace('sousse', 'Sousse');
              dropoffLocation = routeParts[1]
                .replace('stockholm', 'Stockholm')
                .replace('goteborg', 'Göteborg')
                .replace('malmo', 'Malmö')
                .replace('tunis', 'Tunis')
                .replace('sousse', 'Sousse');
            }
          }

          transformedBooking = {
            id: order._id || "N/A",
            category: "Frakt",
            date: order.scheduledDateTime ? new Date(order.scheduledDateTime).toLocaleDateString('sv-SE') : "Datum saknas",
            pickup: pickupLocation,
            dropoff: dropoffLocation,
            status: getStatusText(order.status || "unknown"),
            price: order.totalPrice ? `${order.totalPrice} SEK` : "Pris saknas",
            passengers: order.packageDetails?.weight || 0,
            isRoundTrip: false,
            returnDateTime: null,
            estimatedDistance: 0,
            notes: order.notes || "",
            customerInfo: order.customerInfo || { name: "Namn saknas", phone: "Telefon saknas", email: "E-post saknas" },
            paymentMethod: order.paymentMethod || 'cash',
            createdAt: order.createdAt,
            scheduledDateTime: order.scheduledDateTime,
            packageDetails: order.packageDetails,
          };
        } else if (orderType === 'container-shipping') {
          // Container Shipping order
          let pickupLocation = order.pickupAddress || "Plats saknas";
          let dropoffLocation = order.deliveryAddress || "Plats saknas";

          if (order.route) {
            const routeParts = order.route.split('_');
            if (routeParts.length === 2) {
              pickupLocation = routeParts[0]
                .replace('stockholm', 'Stockholm')
                .replace('goteborg', 'Göteborg')
                .replace('malmo', 'Malmö')
                .replace('tunis', 'Tunis')
                .replace('sousse', 'Sousse');
              dropoffLocation = routeParts[1]
                .replace('stockholm', 'Stockholm')
                .replace('goteborg', 'Göteborg')
                .replace('malmo', 'Malmö')
                .replace('tunis', 'Tunis')
                .replace('sousse', 'Sousse');
            }
          }

          transformedBooking = {
            id: order._id || "N/A",
            category: "Container shipping",
            date: order.scheduledDateTime ? new Date(order.scheduledDateTime).toLocaleDateString('sv-SE') : "Datum saknas",
            pickup: pickupLocation,
            dropoff: dropoffLocation,
            status: getStatusText(order.status || "unknown"),
            price: order.totalPrice ? `${order.totalPrice} SEK` : "Pris saknas",
            passengers: 0,
            isRoundTrip: false,
            returnDateTime: null,
            estimatedDistance: 0,
            notes: order.notes || "",
            customerInfo: order.customerInfo || { name: "Namn saknas", phone: "Telefon saknas", email: "E-post saknas" },
            paymentMethod: order.paymentMethod || 'cash',
            createdAt: order.createdAt,
            scheduledDateTime: order.scheduledDateTime,
            packageDetails: order.packageDetails,
          };
        }

        setBooking(transformedBooking);
        setServiceType(orderType);

        // Set progress based on status
        if (order.status === "completed") progress.value = 1;
        else if (order.status === "in_progress") progress.value = 0.5;
        else progress.value = 0;
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    fetchOrder(true);
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Väntar';
      case 'confirmed': return 'Bekräftad';
      case 'in_progress': return 'Pågående';
      case 'completed': return 'Avslutad';
      case 'cancelled': return 'Avbokad';
      default: return 'Okänd';
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress.value * 100}%`, { duration: 600 }),
  }));

  const handleCancelOrder = async () => {
    if (!booking || !serviceType) return;

    // Show confirmation alert
    showAlert(
      "Avboka bokning",
      "Är du säker på att du vill avboka denna bokning? Detta kan inte ångras.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Avboka",
          style: "destructive",
          onPress: async () => {
            try {
              let result: { success: boolean; message?: string } | undefined;
              if (serviceType === 'taxi') {
                result = await TaxiOrderService.cancelTaxiOrder(orderId as string);
              } else if (serviceType === 'move') {
                result = await MoveOrderService.cancelMoveOrder(orderId as string);
              } else if (serviceType === 'shipping') {
                result = await ShippingOrderService.cancelShippingOrder(orderId as string, "Cancelled by user");
              } else if (serviceType === 'container-shipping') {
                result = await ContainerShippingOrderService.cancelShippingOrder(orderId as string, "Cancelled by user");
              }

              if (result && result.success) {
                showAlert("Bokning avbokad", "Din bokning har blivit avbokad.");
                // Refresh the booking data
                let updatedResult: { success: boolean; order?: any } | undefined;
                  if (serviceType === 'taxi') {
                    updatedResult = await TaxiOrderService.getTaxiOrder(orderId as string);
                  } else if (serviceType === 'move') {
                    updatedResult = await MoveOrderService.getMoveOrder(orderId as string);
                  } else if (serviceType === 'shipping') {
                    updatedResult = await ShippingOrderService.getShippingOrder(orderId as string);
                  } else if (serviceType === 'container-shipping') {
                    updatedResult = await ContainerShippingOrderService.getShippingOrder(orderId as string);
                  }

                if (updatedResult && updatedResult.success && updatedResult.order) {
                  const updatedOrder = updatedResult.order;
                  const updatedBooking = {
                    ...booking,
                    status: getStatusText(updatedOrder.status),
                  };
                  setBooking(updatedBooking);
                  // Update progress
                  if (updatedOrder.status === "completed") progress.value = 1;
                  else if (updatedOrder.status === "in_progress") progress.value = 0.5;
                  else progress.value = 0;
                }
              } else {
                showAlert("Fel", "Kunde inte avboka bokningen. Försök igen.");
              }
            } catch (error) {
              console.error('Cancel order error:', error);
              showAlert("Fel", "Ett oväntat fel inträffade.");
            }
          }
        }
      ]
    );
  };

  const shareOrderDetails = async () => {
    try {
      let shareMessage = '';

      if (serviceType === 'shipping' || serviceType === 'container-shipping') {
        const isContainer = serviceType === 'container-shipping';
        shareMessage = `${isContainer ? '🚢 Container Shipping' : '📦 Shipping'} order from Tunisiska Mega Service

Sender: ${booking.customerInfo?.name}
Phone: ${booking.customerInfo?.phone}

Recipient: ${booking.notes?.split('Recipient: ')[1]?.split(' (')[0] || 'N/A'}
Recipient Phone: ${booking.notes?.split('Recipient: ')[1]?.split(' (')[1]?.replace(')', '') || 'N/A'}

From: ${booking.pickup}
To: ${booking.dropoff}

${isContainer ? `Size: ${booking.packageDetails?.size}` : `Weight: ${booking.packageDetails?.weight}kg`}
Value: ${booking.packageDetails?.value} SEK

Date: ${booking.scheduledDateTime ? new Date(booking.scheduledDateTime).toLocaleString('sv-SE') : 'Date missing'}
Status: ${booking.status}

Total Cost: ${booking.price}

Booking ID: ${booking.id?.slice(-8) || 'N/A'}`;
      } else {
        // Default share message for other order types
        shareMessage = `${booking.category} beställning

Kund: ${booking.customerInfo?.name}
Datum: ${booking.scheduledDateTime ? new Date(booking.scheduledDateTime).toLocaleString('sv-SE') : 'Datum saknas'}
Status: ${booking.status}
Pris: ${booking.price}

Bokningsnummer: ${booking.id?.slice(-8) || 'N/A'}`;
      }

      await Share.share({
        message: shareMessage,
        title: 'Beställningsinformation',
      });
    } catch (error) {
      console.error('Error sharing order:', error);
      showAlert('Fel', 'Kunde inte dela beställningsinformationen');
    }
  };

  const handleContactSupport = () => {
    const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
    if (!supportEmail) {
      showAlert("Fel", "Support e-postadress är inte konfigurerad.");
      return;
    }

    const subject = `Hjälp med bokning ${String(booking?.id?.slice(-8) || "N/A")}`;
    const body = `Hej! Jag behöver hjälp med min bokning (ID: ${String(booking?.id?.slice(-8) || "N/A")}).\n\nBokningsdetaljer:\n- Typ: ${booking?.category}\n- Datum: ${booking?.date}\n- Status: ${booking?.status}\n\nBeskriv ditt problem här:`;

    const emailUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(emailUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(emailUrl);
        } else {
          showAlert("Fel", "Ingen e-postapp är installerad på denna enhet.");
        }
      })
      .catch((err) => {
        console.error('Email error:', err);
        showAlert("Fel", "Kunde inte öppna e-postappen.");
      });
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
        <StatusBar style={isDark ? "light" : "dark"} />
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
              Bokningsdetaljer
            </AutoText>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Laddar bokningsdetaljer...
          </AutoText>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
        <StatusBar style={isDark ? "light" : "dark"} />
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
              Bokningsdetaljer
            </AutoText>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <AutoText className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Bokning hittades inte
          </AutoText>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = () => {
    switch (booking.status) {
      case "Avslutad":
        return "#10B981";
      case "Pågående":
        return "#F59E0B";
      case "Avbokad":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        className={`px-6  pb-2  `}
      >
        <View className="flex-row items-center justify-center relative my-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-0 p-2 "
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isDark ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <AutoText
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Bokningsdetaljer
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Se din historik detailjer av bokade tjänster
        </AutoText>
      </Animated.View>

      {/* Details */}
      <ScrollView
        className="flex-1 px-5 mt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? "#60A5FA" : "#3B82F6"]}
            tintColor={isDark ? "#60A5FA" : "#3B82F6"}
          />
        }
      >
        <Animated.View
          entering={FadeInUp.duration(600).delay(100)}
          className={`px-3 py-6 `}
        >
          {/* Modern Header with Gradient Background */}
          <View className="mb-6 overflow-hidden rounded-2xl">
            <View
              className={`p-6 ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 8,
              }}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <AutoText className={`text-2xl font-bold  mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {String(booking.category || "Taxi")}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? "text-blue-100" : "text-blue-900"}`}>
                    Boknings-ID: {String(booking.id?.slice(-8) || "N/A")}
                  </AutoText>
                </View>
                <View
                  className={`px-4 py-2 rounded-full  backdrop-blur-sm border ${isDark ? "border-white/30 bg-white/20" : "border-black/50 bg-white/20"}`}
                >
                  <AutoText
                    className={`text-xs font-semibold ${isDark ? "text-white" : "text-black"}`}
                  >
                    {String(booking.status || "Okänd")}
                  </AutoText>
                </View>
              </View>

              {/* Quick Info Row */}
              <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-white/20">
                <View className="items-center">
                  <Ionicons name="calendar-outline" size={20} color={`${isDark ? "white" :"black"}`} />
                  <AutoText className={`text-xs mt-1 ${isDark ? "text-white" : "text-black"}`}>
                    {String(booking.date || "Datum saknas")}
                  </AutoText>
                </View>
                <View className="items-center">
                  <Ionicons name={serviceType === 'shipping' || serviceType === 'container-shipping' ? (serviceType === 'container-shipping' ? "boat-outline" : "scale-outline") : "people-outline"} size={20} color={`${isDark ? "white" :"black"}`} />
                   <AutoText className={`text-xs mt-1 ${isDark ? "text-white" : "text-black"}`}>
                     {serviceType === 'container-shipping' 
                       ? `Storlek: ${booking.packageDetails?.size || "N/A"}`
                       : serviceType === 'shipping' 
                         ? `${String(booking.passengers || 0)} kg` 
                         : `${String(booking.passengers || 1)} ${serviceType === 'taxi' ? 'pass' : 'pers'}`}
                   </AutoText>
                </View>
                <View className="items-center">
                  <Ionicons name="cash-outline" size={20} color={`${isDark ? "white" :"black"}`} />
                   <AutoText className={`text-xs mt-1 ${isDark ? "text-white" : "text-black"}`}>
                     {String(booking.price || "Pris saknas")}
                   </AutoText>
                 </View>
               </View>

               {/* Package Details Row - Below the main info */}
               {(serviceType === 'shipping' || serviceType === 'container-shipping') && booking.packageDetails && (
                 <View className="flex-row justify-center items-center mt-3 pt-3 border-t border-white/20">
                   <View className="items-center">
                     <Ionicons name="cube-outline" size={20} color={`${isDark ? "white" :"black"}`} />
                     <AutoText className={`text-xs mt-1 ${isDark ? "text-white" : "text-black"}`}>
                       {serviceType === 'container-shipping' 
                         ? `Container: ${booking.packageDetails.size || "Beskrivning saknas"}`
                         : String(booking.packageDetails.description || "Beskrivning saknas")}
                     </AutoText>
                   </View>
                 </View>
               )}
             </View>
           </View>

          {/* Modern Service Info Cards */}
          <View className="mb-6" style={{ gap: 16 }}>
            {/* Route Card */}
            <View
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
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className={`p-3 rounded-xl ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={isDark ? "#60A5FA" : "#3B82F6"}
                    />
                  </View>
                  <View className="ml-3">
                    <AutoText className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                      Resväg
                    </AutoText>
                    <AutoText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {String(booking.isRoundTrip ? "Tur och retur" : "Enkel resa")}
                    </AutoText>
                  </View>
                </View>
                <View className={`px-3 py-1 rounded-full ${booking.isRoundTrip ? (isDark ? "bg-purple-500/20" : "bg-purple-100") : (isDark ? "bg-green-500/20" : "bg-green-100")}`}>
                  <AutoText className={`text-xs font-medium ${booking.isRoundTrip ? (isDark ? "text-purple-300" : "text-purple-700") : (isDark ? "text-green-300" : "text-green-700")}`}>
                    {String(booking.isRoundTrip ? "Tur & Retur" : "Enkel")}
                  </AutoText>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className={`w-3 h-3 rounded-full ${isDark ? "bg-green-400" : "bg-green-500"} mr-3`} />
                    <AutoText className={`font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {String(booking.pickup || "Plats saknas")}
                    </AutoText>
                  </View>
                  <View className="flex-row items-center ml-1.5 mb-2">
                    <View className={`w-0.5 h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"} mr-3`} />
                  </View>
                  <View className="flex-row items-center">
                    <View className={`w-3 h-3 rounded-full ${isDark ? "bg-red-400" : "bg-red-500"} mr-3`} />
                    <AutoText className={`font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {String(booking.dropoff || "Plats saknas")}
                    </AutoText>
                  </View>
                </View>
              </View>
            </View>

            {/* Time & Passengers Cards in Grid - Equal Height */}
            <View className="flex-row gap-4 mb-6">
              {/* Time Card */}
              <View className="flex-1">
                <View
                  className={`p-5 rounded-2xl h-44 justify-center ${
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
                  <View className="items-center">
                    <View className={`p-3 rounded-xl mb-3 ${isDark ? "bg-amber-500/20" : "bg-amber-100"}`}>
                      <Ionicons
                        name="time-outline"
                        size={22}
                        color={isDark ? "#FCD34D" : "#F59E0B"}
                      />
                    </View>
                    <AutoText className={`font-semibold text-base mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                      Avhämtning
                    </AutoText>
                    <AutoText className={`text-sm text-center mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {String(booking.scheduledDateTime ? new Date(booking.scheduledDateTime).toLocaleDateString('sv-SE') : "Datum saknas")}
                    </AutoText>
                    <AutoText className={`text-sm text-center font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                      {String(booking.scheduledDateTime ? new Date(booking.scheduledDateTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : "Tid saknas")}
                    </AutoText>
                    {booking.returnDateTime && (
                      <AutoText className={`text-xs text-center mt-1 ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                        Retur: {String(new Date(booking.returnDateTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))}
                      </AutoText>
                    )}
                  </View>
                </View>
              </View>

              {/* Passengers Card */}
              <View className="flex-1">
                <View
                  className={`p-5 rounded-2xl h-44 justify-center ${
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
                  <View className="items-center">
                    <View className={`p-3 rounded-xl mb-3 ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
                      <Ionicons
                        name={serviceType === 'taxi' ? "people-outline" : (serviceType === 'shipping' || serviceType === 'container-shipping' ? (serviceType === 'container-shipping' ? "boat-outline" : "scale-outline") : "cube-outline")}
                        size={22}
                        color={isDark ? "#C084FC" : "#8B5CF6"}
                      />
                    </View>
                    <AutoText className={`font-semibold text-base mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {serviceType === 'taxi' ? 'Passagerare' : serviceType === 'container-shipping' ? 'Size' : serviceType === 'shipping' ? 'Vikt' : 'Personer'}
                    </AutoText>
                    <AutoText className={`text-xl font-bold mb-2 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                      {serviceType === 'container-shipping' ? booking.packageDetails?.size : serviceType === 'shipping' ? `${String(booking.passengers || 0)} kg` : `${String(booking.passengers || 1)} ${serviceType === 'taxi' ? 'pass' : 'pers'}`}
                    </AutoText>
                    {serviceType === 'taxi' && booking.estimatedDistance && (
                      <AutoText className={`text-sm text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        ~{String(booking.estimatedDistance)} km
                      </AutoText>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Customer Info Card */}
            <View
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
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className={`p-3 rounded-xl ${isDark ? "bg-indigo-500/20" : "bg-indigo-100"}`}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={isDark ? "#818CF8" : "#6366F1"}
                    />
                  </View>
                  <View className="ml-3">
                    <AutoText className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                      Kundinformation
                    </AutoText>
                    <AutoText className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Kontaktuppgifter
                    </AutoText>
                  </View>
                </View>
              </View>

              <View className="space-y-2">
                <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <AutoText className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Namn
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    {String(booking.customerInfo?.name || "Namn saknas")}
                  </AutoText>
                </View>
                <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <AutoText className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Telefon
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                    {String(booking.customerInfo?.phone || "Telefon saknas")}
                  </AutoText>
                </View>
                {booking.customerInfo?.email && (
                  <View className="flex-row items-center justify-between py-2">
                    <AutoText className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      E-post
                    </AutoText>
                    <AutoText className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {String(booking.customerInfo.email)}
                    </AutoText>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Notes */}
          {booking.notes && (
            <View
              className={`p-4 rounded-xl mb-3 ${
                isDark ? "bg-dark-card" : "bg-light-card"
              }`}
                style={{
               shadowColor: "#000",
               shadowOpacity: 0.15,
               shadowRadius: 6,
               shadowOffset: { width: 0, height: 3 },
               elevation: 5,
             }}
             >
              <View className="flex-row items-start mb-2">
                <View
                  className={`p-2 rounded-full ${
                    isDark ? "bg-gray-500" : "bg-orange-100"
                  }`}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={isDark ? "#ffffff" : "#EA580C"}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <AutoText
                    className={`font-medium mb-1 ${
                      isDark ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    Speciella önskemål
                  </AutoText>
                  <AutoText
                    className={`text-sm ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {String(booking.notes)}
                  </AutoText>
                </View>
              </View>
            </View>
          )}

          {/* Modern Price Card */}
          <View
            className={`p-6 rounded-2xl mb-6 ${
              isDark ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-emerald-500 to-teal-600"
            }`}
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 8,
            }}
          >
            <View className="items-center">
              <View className="flex-row items-center mb-2">
                <Ionicons name="cash-outline" size={24} color={isDark ? "#fff" : "#000"} />
                <AutoText className={`text-lg font-semibold ml-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Betalning
                </AutoText>
              </View>
              <AutoText className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {String(booking.price || "Pris saknas")}
              </AutoText>
              <View className={`px-4 py-2 rounded-full border ${isDark ? "border-white/30 bg-white/20" : "border-black/50 bg-white/20"} backdrop-blur-sm`}>
                <AutoText className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {String(booking.paymentMethod === 'stripe' ? 'Kortbetalning' : booking.paymentMethod === 'points' ? 'Poäng' : booking.paymentMethod === 'combined' ? 'Kombinerat' : booking.paymentMethod === 'cash' ? 'Kontant' : 'Okänd metod')}
                </AutoText>
              </View>
            </View>
          </View>

          {/* Progress Timeline */}
          <View className="mb-6">
            <BookingProgress currentStatus={booking.status} isDark={isDark} />
          </View>

          {/* Modern Action Buttons */}
          <View className="space-y-4">

            <View className="flex-row gap-4" style={{ marginTop: 8 }}>
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center ${
                  isDark ? "bg-green-600" : "bg-green-500"
                }`}
                style={{
                  shadowColor: "#10B981",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
                onPress={shareOrderDetails}
              >
                <View className="flex-row items-center mx-2">
                  <Ionicons name="share-outline" size={14} color="white" />
                  <AutoText className="text-white font-medium ml-2 text-sm">
                    Dela kvitto
                  </AutoText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center ${
                  isDark ? "bg-blue-600" : "bg-blue-500"
                }`}
                style={{
                  shadowColor: isDark ? "#2563EB" : "#3B82F6",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
                onPress={handleContactSupport}
              >
                <View className="flex-row items-center mx-2">
                  <Ionicons
                    name="mail-outline"
                    size={14}
                    color="white"
                  />
                  <AutoText className="text-white font-medium ml-2 text-sm">
                    Support
                  </AutoText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center ${
                  isDark ? "bg-red-600" : "bg-red-500"
                }`}
                style={{
                  shadowColor: "#EF4444",
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
                onPress={handleCancelOrder}
                disabled={booking?.status === "Avbokad" || booking?.status === "Avslutad"}
              >
                <View className="flex-row items-center mx-2">
                  <Ionicons name="close-circle-outline" size={14} color="white" />
                  <AutoText className="text-white font-medium ml-2 text-sm">
                    Avboka
                  </AutoText>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ScrollView>
    </SafeAreaView>
  );
}
