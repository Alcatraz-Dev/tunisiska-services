import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useTheme } from "../../../context/ThemeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import ShippingCategoryCheckbox from "@/app/components/ShippingCategoryDropdown";
import { useUser } from "@clerk/clerk-expo";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import PaymentStripeJS from "@/app/components/PaymentStripeJS";

// 🔹 Fetch shipping schedules from Sanity
const fetchShippingSchedules = async () => {
  try {
    const { client } = await import("@/sanityClient");
    const schedules = await client.fetch(`
      *[_type == "shippingSchedule" && status == "available"] {
        _id,
        route,
        departureTime,
        capacity,
        availableCapacity,
        vehicle,
        pickupLocations
      }
    `);
    return schedules;
  } catch (error) {
    console.error("Error fetching shipping schedules:", error);
    return [];
  }
};

export default function ShippingPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedPickupLocation, setSelectedPickupLocation] =
    useState<any>(null);
  const [shippingSchedules, setShippingSchedules] = useState<any[]>([]);

  const [kg, setKg] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [usePoints, setUsePoints] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Recipient info
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "points" | "combined" | "cash"
  >("cash");
  const [pointsToUse, setPointsToUse] = useState(0);

  const [userPoints, setUserPoints] = useState(0);

  // Pre-fill user information from Clerk
  useEffect(() => {
    if (user) {
      const fullName = user.fullName || user.firstName || "";
      const phoneNumber = user.phoneNumbers?.[0]?.phoneNumber || "";
      const emailAddress = user.primaryEmailAddress?.emailAddress || "";
      const userPoints = (user.unsafeMetadata as any)?.points || 0;

      if (fullName && !customerName) setCustomerName(fullName);
      if (phoneNumber && !customerPhone) setCustomerPhone(phoneNumber);
      if (emailAddress && !customerEmail) setCustomerEmail(emailAddress);
      setUserPoints(userPoints);
    }
  }, [user]);

  // Load shipping schedules on component mount
  useEffect(() => {
    const loadSchedules = async () => {
      const schedules = await fetchShippingSchedules();
      setShippingSchedules(schedules);
    };
    loadSchedules();
  }, []);

  // Refresh schedules when order is created
  const refreshSchedules = async () => {
    const schedules = await fetchShippingSchedules();
    setShippingSchedules(schedules);
    // Also refresh available trips if a date is selected
    if (selectedDate) {
      const trips = schedules.filter((s: any) => {
        const scheduleDate = new Date(s.departureTime)
          .toISOString()
          .split("T")[0];
        return scheduleDate === selectedDate;
      });
      setAvailableTrips(trips);
    }
  };

  // 🔹 När datum väljs → filtrera trips för det datumet
  const handleDateSelect = (day: any) => {
    // Prevent selection of past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(day.dateString);

    if (selectedDate < today) {
      showAlert(
        "Ogiltigt datum",
        "Du kan inte välja ett datum som redan har passerat."
      );
      return;
    }

    setSelectedDate(day.dateString);
    const trips = shippingSchedules.filter((s) => {
      const scheduleDate = new Date(s.departureTime)
        .toISOString()
        .split("T")[0];
      return scheduleDate === day.dateString;
    });
    setAvailableTrips(trips);
    setSelectedTrip(null);
  };

  // 🔹 Markera datumen som finns i schemat
  const markedDates = shippingSchedules.reduce((acc: any, s) => {
    const scheduleDate = new Date(s.departureTime).toISOString().split("T")[0];
    acc[scheduleDate] = {
      marked: true,
      dotColor: "#0ea5e9",
      selected: selectedDate === scheduleDate,
      selectedColor: "#0ea5e9",
    };
    return acc;
  }, {});

  // 🔹 Beräkna pris
  const calculateTotal = () => {
    const weight = parseFloat(kg) || 0;
    let total = ShippingOrderService.calculateShippingPrice(weight, 'standard', false, undefined, undefined);

    // Points discount
    if (
      (paymentMethod === "points" || paymentMethod === "combined") &&
      pointsToUse > 0
    ) {
      const discount = pointsToUse / 10; // Convert points to SEK
      total = Math.max(0, total - discount);
    }

    return Math.round(total);
  };

  const handleBooking = async () => {
    if (
      !selectedTrip ||
      selectedCategories.length === 0 ||
      !kg ||
      !customerName ||
      !customerPhone ||
      !recipientName ||
      !recipientPhone
    ) {
      return showAlert("Fel", "Vänligen fyll i alla obligatoriska fält");
    }

    const totalCost = calculateTotal();

    // Process payment first
    const paymentSuccess = await processPayment(paymentMethod, totalCost);
    if (!paymentSuccess) {
      return;
    }

    // Create shipping order
    const orderData = {
      userId: user?.id || "",
      customerInfo: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      pickupAddress:
        selectedPickupLocation?.location ||
        selectedTrip.route
          ?.split("_")[0]
          ?.replace("stockholm", "Stockholm")
          .replace("goteborg", "Göteborg")
          .replace("malmo", "Malmö") ||
        "Stockholm",
      deliveryAddress:
        selectedTrip.route?.split("_")[1]?.replace("tunis", "Tunis") || "Tunis",
      scheduledDateTime:
        selectedPickupLocation?.pickupDateTime || selectedTrip.departureTime,
      packageDetails: {
        weight: parseFloat(kg),
        dimensions: {
          length: 30,
          width: 20,
          height: 15,
        },
        description: selectedCategories.join(", "),
        value: 1000,
        isFragile: selectedCategories.includes("fragile"),
      },
      shippingSpeed: "standard" as const,
      requiresSignature: true,
      totalPrice: totalCost,
      pointsUsed:
        paymentMethod === "points" || paymentMethod === "combined"
          ? pointsToUse
          : 0,
      paymentMethod,
      notes: `Recipient: ${recipientName} (${recipientPhone})`,
    };

    const result = await ShippingOrderService.createShippingOrder(orderData);

    if (result.success) {
      showAlert(
        "Bokning bekräftad",
        `Din fraktbeställning har skapats! Order ID: ${result.order?._id?.substring(0, 8)}`
      );
      // Refresh schedules to update available capacity
      await refreshSchedules();
      router.back();
    } else {
      showAlert("Fel", "Kunde inte skapa bokning: " + result.error);
    }
  };

  // Payment processing function
  const processPayment = async (
    method: string,
    amount: number
  ): Promise<boolean> => {
    console.log(`Processing ${method} payment for ${amount} SEK`);

    if (method === "cash") {
      return true;
    }

    if (method === "points") {
      if (!user) {
        showAlert("Fel", "Du måste vara inloggad");
        return false;
      }

      const pointsNeeded = amount * 10;
      const currentPoints = (user.unsafeMetadata as any)?.points || 0;

      if (currentPoints < pointsNeeded) {
        showAlert(
          "Otillräckliga poäng",
          `Du har ${currentPoints} poäng men behöver ${pointsNeeded} poäng för denna betalning.`
        );
        return false;
      }

      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsNeeded,
          },
        });
        setUserPoints(currentPoints - pointsNeeded);
        console.log(
          `Points payment successful: ${pointsNeeded} points deducted`
        );
        return true;
      } catch (error) {
        console.error("Points payment failed:", error);
        return false;
      }
    }

    if (method === "combined") {
      if (!user) {
        showAlert("Fel", "Du måste vara inloggad");
        return false;
      }

      const maxPointsValue = Math.min(amount * 0.5, 100);
      const pointsToUseValue = Math.min(maxPointsValue * 10, userPoints);
      const pointsValue = pointsToUseValue / 10;
      const remainingAmount = amount - pointsValue;

      const currentPoints = (user.unsafeMetadata as any)?.points || 0;

      if (currentPoints < pointsToUseValue) {
        showAlert(
          "Otillräckliga poäng",
          `Du har ${currentPoints} poäng men behöver ${pointsToUseValue} poäng för denna kombinerade betalning.`
        );
        return false;
      }

      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsToUseValue,
          },
        });
        setUserPoints(currentPoints - pointsToUseValue);

        if (remainingAmount > 0) {
          const stripeSuccess = await processPayment("stripe", remainingAmount);
          if (!stripeSuccess) {
            // Refund points if Stripe fails
            await user.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                points:
                  ((user.unsafeMetadata as any)?.points || 0) +
                  pointsToUseValue,
              },
            });
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("Combined payment failed:", error);
        return false;
      }
    }

    if (method === "stripe") {
      if (Platform.OS === "web") {
        console.log("Stripe payment not available on web");
        return false;
      }
      // Stripe removed - simulate payment success for native
      console.log("Stripe payment simulated for amount:", amount);
      return true;
    }

    return false;
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className="p-6">
        <View className="flex-row items-center justify-center mb-6 relative">
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
            className={`text-2xl font-extrabold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Shipping
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Boka dina frakter med oss
        </AutoText>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Kalender */}
        <AutoText
          className={`mb-2 font-semibold ${
            isDark ? "text-gray-200" : "text-gray-800"
          }`}
        >
          Välj datum
        </AutoText>
        <Calendar
          key={isDark ? "dark" : "light"} // Tvinga omrendering vid temabyte
          markedDates={markedDates}
          onDayPress={handleDateSelect}
          theme={{
            calendarBackground: isDark ? "#1c1c1e" : "#fff",
            textSectionTitleColor: isDark ? "#fff" : "#000",
            dayTextColor: isDark ? "#fff" : "#000",
            monthTextColor: isDark ? "#fff" : "#000",
            arrowColor: "#0ea5e9",
            todayTextColor: "#0ea5e9",
            selectedDayBackgroundColor: "#0ea5e9",
            selectedDayTextColor: "#fff",
            textDisabledColor: "#555",
          }}
        />

        {/* Trips för valt datum */}
        {availableTrips.length > 0 && (
          <View className="mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Tillgängliga fraktavgångar
            </AutoText>
            {availableTrips.map((trip, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedTrip(trip)}
                onPressIn={() => setSelectedTrip(trip)}
                className={`p-4 rounded-xl mb-3 ${
                  selectedTrip === trip
                    ? "bg-blue-500"
                    : isDark
                      ? "bg-dark-card"
                      : "bg-gray-100"
                }`}
              >
                <AutoText
                  className={`font-bold text-base ${
                    selectedTrip === trip
                      ? "text-white"
                      : isDark
                        ? "text-white"
                        : "text-gray-900"
                  }`}
                >
                  {trip.route
                    ?.replace("_", " → ")
                    .replace("stockholm", "Stockholm")
                    .replace("goteborg", "Göteborg")
                    .replace("malmo", "Malmö")
                    .replace("tunis", "Tunis") || "Unknown Route"}
                </AutoText>
                <AutoText
                  className={`text-sm mt-1 ${
                    selectedTrip === trip
                      ? "text-white"
                      : isDark
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  {new Date(trip.departureTime).toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ({trip.vehicle?.replace("_", " ") || "Unknown"})
                </AutoText>
                <AutoText
                  className={`text-xs mt-1 ${
                    selectedTrip === trip
                      ? "text-white/80"
                      : isDark
                        ? "text-gray-500"
                        : "text-gray-500"
                  }`}
                >
                  Kapacitet: {trip.capacity }kg
                  tillgänglig
                </AutoText>
                   <AutoText
                  className={`text-xs mt-1 ${
                    selectedTrip === trip
                      ? "text-white/80"
                      : isDark
                        ? "text-gray-500"
                        : "text-gray-500"
                  }`}
                >
                  Tillgänglig kapacitet: {trip.availableCapacity}kg
                  tillgänglig
                </AutoText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pickup Location Selection */}
        {selectedTrip &&
          selectedTrip.pickupLocations &&
          selectedTrip.pickupLocations.length > 0 && (
            <View className="mt-6">
              <AutoText
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Välj upphämtningsplats
              </AutoText>
              {selectedTrip.pickupLocations.map(
                (pickup: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedPickupLocation(pickup)}
                    onPressIn={() => setSelectedPickupLocation(pickup)}
                    className={`p-4 rounded-xl mb-3 ${
                      selectedPickupLocation === pickup
                        ? "bg-blue-500"
                        : isDark
                          ? "bg-dark-card"
                          : "bg-gray-100"
                    }`}
                  >
                    <AutoText
                      className={`font-bold mb-2 ${
                        selectedPickupLocation === pickup
                          ? "text-white"
                          : isDark
                            ? "text-white"
                            : "text-gray-900"
                      }`}
                    >
                      {pickup.location}
                    </AutoText>
                    <AutoText
                      className={`text-xs ${
                        selectedPickupLocation === pickup
                          ? "text-white"
                          : isDark
                            ? "text-gray-400"
                            : "text-gray-600"
                      }`}
                    >
                      {new Date(pickup.pickupDateTime).toLocaleString("sv-SE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </AutoText>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}

        {/* Customer Information */}
        {selectedTrip && (
          <>
            <AutoText
              className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Avsändarinformation
            </AutoText>

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Namn *
            </AutoText>
            <Input
              placeholder="Ditt namn"
              value={customerName}
              onChangeText={setCustomerName}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Telefonnummer *
            </AutoText>
            <Input
              placeholder="070-123 45 67"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              E-post (valfritt)
            </AutoText>
            <Input
              placeholder="din@email.com"
              keyboardType="email-address"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            {/* Recipient Information */}
            <AutoText
              className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Mottagarinformation
            </AutoText>

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Mottagarens namn *
            </AutoText>
            <Input
              placeholder="Mottagarens namn"
              value={recipientName}
              onChangeText={setRecipientName}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Mottagarens telefonnummer *
            </AutoText>
            <Input
              placeholder="070-123 45 67"
              keyboardType="phone-pad"
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            <ShippingCategoryCheckbox
              isDark={isDark}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
            />
            <AutoText
              className={`mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Vikt (kg) *
            </AutoText>
            <Input
              placeholder="Ex: 10"
              value={kg}
              onChangeText={setKg}
              keyboardType="numeric"
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            {/* Payment Method Selection */}
            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Betalningsmetod *
            </AutoText>
            <View className="mb-4">
              <TouchableOpacity
                className={`p-4 rounded-lg border mb-2 ${
                  paymentMethod === "cash"
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod("cash")}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-4 h-4 rounded border-2 mr-3 ${
                      paymentMethod === "cash"
                        ? "bg-white border-white"
                        : isDark
                          ? "border-gray-400"
                          : "border-gray-500"
                    }`}
                  >
                    {paymentMethod === "cash" && (
                      <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                    )}
                  </View>
                  <AutoText
                    className={
                      paymentMethod === "cash"
                        ? "text-white font-semibold"
                        : isDark
                          ? "text-white"
                          : "text-black"
                    }
                  >
                    Kontant betalning (vid leverans)
                  </AutoText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-4 rounded-lg border mb-2 ${
                  paymentMethod === "stripe"
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod("stripe")}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-4 h-4 rounded border-2 mr-3 ${
                      paymentMethod === "stripe"
                        ? "bg-white border-white"
                        : isDark
                          ? "border-gray-400"
                          : "border-gray-500"
                    }`}
                  >
                    {paymentMethod === "stripe" && (
                      <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                    )}
                  </View>
                  <AutoText
                    className={
                      paymentMethod === "stripe"
                        ? "text-white font-semibold"
                        : isDark
                          ? "text-white"
                          : "text-black"
                    }
                  >
                    Kortbetalning (förbetald)
                  </AutoText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-4 rounded-lg border mb-2 ${
                  paymentMethod === "points"
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod("points")}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`w-4 h-4 rounded border-2 mr-3 ${
                        paymentMethod === "points"
                          ? "bg-white border-white"
                          : isDark
                            ? "border-gray-400"
                            : "border-gray-500"
                      }`}
                    >
                      {paymentMethod === "points" && (
                        <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                      )}
                    </View>
                    <AutoText
                      className={
                        paymentMethod === "points"
                          ? "text-white font-semibold"
                          : isDark
                            ? "text-white"
                            : "text-black"
                      }
                    >
                      Poäng (förbetald)
                    </AutoText>
                  </View>
                  <AutoText
                    className={`text-sm ${
                      paymentMethod === "points"
                        ? "text-white"
                        : isDark
                          ? "text-gray-400"
                          : "text-gray-600"
                    }`}
                  >
                    {userPoints} poäng
                  </AutoText>
                </View>
                {paymentMethod === "points" && (
                  <View className="mt-3 pt-3 border-t border-white/20">
                    <View className="flex-row items-center justify-between">
                      <AutoText className="text-white text-sm">
                        Använd poäng:
                      </AutoText>
                      <Input
                        placeholder="0"
                        keyboardType="numeric"
                        value={pointsToUse.toString()}
                        onChangeText={(value) =>
                          setPointsToUse(parseInt(value) || 0)
                        }
                        className={`border rounded p-2 w-20 text-center ${
                          isDark
                            ? "bg-gray-700 text-white"
                            : "bg-white text-black"
                        }`}
                      />
                    </View>
                    <AutoText className="text-white/80 text-xs mt-1">
                      Du har {userPoints} poäng tillgängliga
                    </AutoText>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-4 rounded-lg border ${
                  paymentMethod === "combined"
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod("combined")}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`w-4 h-4 rounded border-2 mr-3 ${
                        paymentMethod === "combined"
                          ? "bg-white border-white"
                          : isDark
                            ? "border-gray-400"
                            : "border-gray-500"
                      }`}
                    >
                      {paymentMethod === "combined" && (
                        <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                      )}
                    </View>
                    <AutoText
                      className={
                        paymentMethod === "combined"
                          ? "text-white font-semibold"
                          : isDark
                            ? "text-white"
                            : "text-black"
                      }
                    >
                      Kombinerat (kort + poäng)
                    </AutoText>
                  </View>
                  <AutoText
                    className={`text-sm ${
                      paymentMethod === "combined"
                        ? "text-white"
                        : isDark
                          ? "text-gray-400"
                          : "text-gray-600"
                    }`}
                  >
                    {userPoints} poäng
                  </AutoText>
                </View>
                {paymentMethod === "combined" && (
                  <View className="mt-3 pt-3 border-t border-white/20">
                    <View className="flex-row items-center justify-between">
                      <AutoText className="text-white text-sm">
                        Använd poäng:
                      </AutoText>
                      <Input
                        placeholder="0"
                        keyboardType="numeric"
                        value={pointsToUse.toString()}
                        onChangeText={(value) =>
                          setPointsToUse(parseInt(value) || 0)
                        }
                        className={`border rounded p-2 w-20 text-center ${
                          isDark
                            ? "bg-gray-700 text-white"
                            : "bg-white text-black"
                        }`}
                      />
                    </View>
                    <AutoText className="text-white/80 text-xs mt-1">
                      Du har {userPoints} poäng tillgängliga
                    </AutoText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Price Summary */}
            <View
              className={`border rounded-lg p-4 mb-6 ${isDark ? "bg-dark-card" : "bg-light-card"}`}
            >
              <AutoText
                className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Prissammanfattning
              </AutoText>
              <View className="flex-row justify-between mb-2">
                <AutoText
                  className={isDark ? "text-gray-400" : "text-gray-600"}
                >
                  Grundpris:
                </AutoText>
                <AutoText className={isDark ? "text-white" : "text-black"}>
                  {kg ? calculateTotal() : 0} SEK
                </AutoText>
              </View>
              <View className="border-t border-gray-300 pt-2 mt-2">
                <View className="flex-row justify-between">
                  <AutoText
                    className={`font-bold ${isDark ? "text-white" : "text-black"}`}
                  >
                    Att betala:
                  </AutoText>
                  <AutoText
                    className={`font-bold ${isDark ? "text-white" : "text-black"}`}
                  >
                    {kg ? calculateTotal() : 0} SEK
                  </AutoText>
                </View>
              </View>
            </View>

            {/* Bokningsknapp */}
            {paymentMethod === "stripe" ||
            (paymentMethod === "combined" && calculateTotal() > 0) ? (
              <PaymentStripeJS
                amount={calculateTotal()}
                points={calculateTotal() * 10}
                isDark={isDark}
                service="Frakt"
                customText={`Betala ${calculateTotal()} SEK för Frakt`}
                customStyle={{
                  backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isDark ? "#3C3C3E" : "#E5E5E5",
                }}
                disabled={
                  !selectedTrip ||
                  selectedCategories.length === 0 ||
                  !kg ||
                  !customerName.trim() ||
                  !customerPhone.trim() ||
                  !recipientName.trim() ||
                  !recipientPhone.trim()
                }
                onPaymentSuccess={async (
                  purchasedPoints: number,
                  amountPaid: number
                ) => {
                  await handleBooking();
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={handleBooking}
                className="bg-blue-500 rounded-xl p-4 items-center"
                disabled={
                  !selectedTrip ||
                  selectedCategories.length === 0 ||
                  !kg ||
                  !customerName.trim() ||
                  !customerPhone.trim() ||
                  !recipientName.trim() ||
                  !recipientPhone.trim()
                }
              >
                <AutoText className="text-center mt-2  text-white font-semibold text-base">
                  Bekräfta bokning
                </AutoText>
              </TouchableOpacity>
            )}
          </>
        )}
        <View className="flex-row items-center justify-center mb-4 mt-4">
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={isDark ? "#9CA3AF" : "#6B7280"}
          />
          <AutoText
            className={`text-xs text-center ml-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            Säker betalning • 24/7 support • Professionella tjänster
          </AutoText>
        </View>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
