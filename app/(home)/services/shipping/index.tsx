import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
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

// 🔹 Fetch shipping schedules from Sanity
const fetchShippingSchedules = async () => {
  try {
    const { client } = await import('@/sanityClient');
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
    console.error('Error fetching shipping schedules:', error);
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
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<any>(null);
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
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'points' | 'combined' | 'cash'>('cash');
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

  // 🔹 När datum väljs → filtrera trips för det datumet
  const handleDateSelect = (day: any) => {
    // Prevent selection of past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(day.dateString);

    if (selectedDate < today) {
      showAlert("Ogiltigt datum", "Du kan inte välja ett datum som redan har passerat.");
      return;
    }

    setSelectedDate(day.dateString);
    const trips = shippingSchedules.filter((s) => {
      const scheduleDate = new Date(s.departureTime).toISOString().split('T')[0];
      return scheduleDate === day.dateString;
    });
    setAvailableTrips(trips);
    setSelectedTrip(null);
  };

  // 🔹 Markera datumen som finns i schemat
  const markedDates = shippingSchedules.reduce((acc: any, s) => {
    const scheduleDate = new Date(s.departureTime).toISOString().split('T')[0];
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
    let total = weight * 50; // 50 SEK per kg

    // Minimum booking cost of 100 SEK
    if (total < 100) {
      total = 100;
    }

    // Points discount
    if ((paymentMethod === 'points' || paymentMethod === 'combined') && pointsToUse > 0) {
      const discount = pointsToUse / 10; // Convert points to SEK
      total = Math.max(0, total - discount);
    }

    return Math.round(total);
  };

  const handleBooking = async () => {
    if (!selectedTrip || selectedCategories.length === 0 || !kg || !customerName || !customerPhone || !recipientName || !recipientPhone) {
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
      userId: user?.id || '',
      customerInfo: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      pickupAddress: selectedPickupLocation?.location || selectedTrip.route?.split('_')[0]?.replace('stockholm', 'Stockholm').replace('goteborg', 'Göteborg').replace('malmo', 'Malmö') || 'Stockholm',
      deliveryAddress: selectedTrip.route?.split('_')[1]?.replace('tunis', 'Tunis') || 'Tunis',
      scheduledDateTime: selectedPickupLocation?.pickupDateTime || selectedTrip.departureTime,
      packageDetails: {
        weight: parseFloat(kg),
        dimensions: {
          length: 30,
          width: 20,
          height: 15,
        },
        description: selectedCategories.join(', '),
        value: 1000,
        isFragile: selectedCategories.includes('fragile'),
      },
      shippingSpeed: 'standard' as const,
      requiresSignature: true,
      totalPrice: totalCost,
      pointsUsed: (paymentMethod === 'points' || paymentMethod === 'combined') ? pointsToUse : 0,
      paymentMethod,
      notes: `Recipient: ${recipientName} (${recipientPhone})`,
    };

    const result = await ShippingOrderService.createShippingOrder(orderData);

    if (result.success) {
      showAlert("Bokning bekräftad", `Din fraktbeställning har skapats! Order ID: ${result.order?._id?.substring(0, 8)}`);
      router.back();
    } else {
      showAlert("Fel", "Kunde inte skapa bokning: " + result.error);
    }
  };

  // Payment processing function
  const processPayment = async (method: string, amount: number): Promise<boolean> => {
    console.log(`Processing ${method} payment for ${amount} SEK`);

    if (method === 'cash') {
      return true;
    }

    if (method === 'points') {
      if (!user) {
        showAlert("Fel", "Du måste vara inloggad");
        return false;
      }

      const pointsNeeded = amount * 10;
      const currentPoints = (user.unsafeMetadata as any)?.points || 0;

      if (currentPoints < pointsNeeded) {
        showAlert("Otillräckliga poäng", `Du har ${currentPoints} poäng men behöver ${pointsNeeded} poäng för denna betalning.`);
        return false;
      }

      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsNeeded
          }
        });
        setUserPoints(currentPoints - pointsNeeded);
        console.log(`Points payment successful: ${pointsNeeded} points deducted`);
        return true;
      } catch (error) {
        console.error('Points payment failed:', error);
        return false;
      }
    }

    if (method === 'combined') {
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
        showAlert("Otillräckliga poäng", `Du har ${currentPoints} poäng men behöver ${pointsToUseValue} poäng för denna kombinerade betalning.`);
        return false;
      }

      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsToUseValue
          }
        });
        setUserPoints(currentPoints - pointsToUseValue);

        if (remainingAmount > 0) {
          const stripeSuccess = await processPayment('stripe', remainingAmount);
          if (!stripeSuccess) {
            // Refund points if Stripe fails
            await user.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                points: ((user.unsafeMetadata as any)?.points || 0) + pointsToUseValue
              }
            });
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('Combined payment failed:', error);
        return false;
      }
    }

    if (method === 'stripe') {
      if (Platform.OS === 'web') {
        // Web Stripe implementation
        try {
          const { loadStripe } = require('@stripe/stripe-js');
          const stripe = await loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

          if (!stripe) {
            showAlert("Fel", "Stripe är inte tillgängligt på web");
            return false;
          }

          const { getBestServerURL } = await import('@/app/config/stripe');
          const serverUrl = await getBestServerURL();

          const response = await fetch(`${serverUrl}/create-checkout-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount,
              currency: 'sek',
              successUrl: window.location.origin + '/success',
              cancelUrl: window.location.origin + '/cancel'
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          console.log('Checkout session created:', data);

          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });

          if (error) {
            console.error('Stripe redirect error:', error);
            showAlert("Betalning misslyckades", error.message);
            return false;
          }

          console.log('Stripe web payment successful');
          return true;
        } catch (error: any) {
          console.error('Stripe web payment failed:', error);
          showAlert("Fel", "Betalning misslyckades: " + error.message);
          return false;
        }
      }

      // Native Stripe implementation
      try {
        const stripeModule = require('@stripe/stripe-react-native');
        const { initPaymentSheet, presentPaymentSheet } = stripeModule;

        const { getBestServerURL } = await import('@/app/config/stripe');
        const serverUrl = await getBestServerURL();

        const response = await fetch(`${serverUrl}/payment-sheet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount, currency: 'sek' }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Payment sheet data received:', Object.keys(data));

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'Tunisiska Services',
          customerId: data.customer.id || data.customer,
          customerEphemeralKeySecret: data.ephemeralKey,
          paymentIntentClientSecret: data.paymentIntent,
          returnURL: 'tunisiska-services://stripe-redirect',
        });

        if (initError) {
          console.error('Payment sheet initialization error:', initError);
          showAlert("Fel", "Kunde inte initiera betalning");
          return false;
        }

        const { error: paymentError } = await presentPaymentSheet();

        if (paymentError) {
          console.error('Payment error:', paymentError);
          showAlert("Betalning misslyckades", paymentError.message);
          return false;
        }

        console.log('Stripe payment successful');
        return true;
      } catch (error: any) {
        console.error('Stripe payment failed:', error);
        showAlert("Fel", "Betalning misslyckades: " + error.message);
        return false;
      }
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
                className={`p-4 rounded-xl mb-3 ${
                  selectedTrip === trip
                    ? "bg-blue-500"
                    : isDark
                      ? "bg-dark-card"
                      : "bg-gray-100"
                }`}
              >
                <AutoText
                  className={`font-bold ${
                    selectedTrip === trip
                      ? "text-white"
                      : isDark
                        ? "text-white"
                        : "text-gray-900"
                  }`}
                >
                  {trip.route?.replace('_', ' → ').replace('stockholm', 'Stockholm').replace('goteborg', 'Göteborg').replace('malmo', 'Malmö').replace('tunis', 'Tunis') || 'Unknown Route'}
                </AutoText>
                <AutoText
                  className={`text-sm ${
                    selectedTrip === trip
                      ? "text-white"
                      : isDark
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  {new Date(trip.departureTime).toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} ({trip.vehicle?.replace('_', ' ') || 'Unknown'})
                </AutoText>
                <AutoText
                  className={`text-xs ${
                    selectedTrip === trip
                      ? "text-white/80"
                      : isDark
                        ? "text-gray-500"
                        : "text-gray-500"
                  }`}
                >
                  Kapacitet: {trip.availableCapacity || trip.capacity}kg tillgänglig
                </AutoText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pickup Location Selection */}
        {selectedTrip && selectedTrip.pickupLocations && selectedTrip.pickupLocations.length > 0 && (
          <View className="mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Välj upphämtningsplats
            </AutoText>
            {selectedTrip.pickupLocations.map((pickup: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedPickupLocation(pickup)}
                className={`p-4 rounded-xl mb-3 ${
                  selectedPickupLocation === pickup
                    ? "bg-blue-500"
                    : isDark
                      ? "bg-dark-card"
                      : "bg-gray-100"
                }`}
              >
                <AutoText
                  className={`font-bold mb-1 ${
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
                  className={`text-sm ${
                    selectedPickupLocation === pickup
                      ? "text-white"
                      : isDark
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  {new Date(pickup.pickupDateTime).toLocaleString('sv-SE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </AutoText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Customer Information */}
        {selectedTrip && (
          <>
            <AutoText className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Avsändarinformation
            </AutoText>

            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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

            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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

            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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
            <AutoText className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Mottagarinformation
            </AutoText>

            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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

            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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
            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Betalningsmetod *
            </AutoText>
            <View className="mb-4">
              <TouchableOpacity
                className={`p-4 rounded-lg border mb-2 ${
                  paymentMethod === 'cash'
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod('cash')}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-4 h-4 rounded border-2 mr-3 ${
                      paymentMethod === 'cash'
                        ? "bg-white border-white"
                        : isDark
                          ? "border-gray-400"
                          : "border-gray-500"
                    }`}
                  >
                    {paymentMethod === 'cash' && (
                      <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                    )}
                  </View>
                  <AutoText
                    className={
                      paymentMethod === 'cash'
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
                  paymentMethod === 'stripe'
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod('stripe')}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-4 h-4 rounded border-2 mr-3 ${
                      paymentMethod === 'stripe'
                        ? "bg-white border-white"
                        : isDark
                          ? "border-gray-400"
                          : "border-gray-500"
                    }`}
                  >
                    {paymentMethod === 'stripe' && (
                      <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                    )}
                  </View>
                  <AutoText
                    className={
                      paymentMethod === 'stripe'
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
                  paymentMethod === 'points'
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod('points')}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`w-4 h-4 rounded border-2 mr-3 ${
                        paymentMethod === 'points'
                          ? "bg-white border-white"
                          : isDark
                            ? "border-gray-400"
                            : "border-gray-500"
                      }`}
                    >
                      {paymentMethod === 'points' && (
                        <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                      )}
                    </View>
                    <AutoText
                      className={
                        paymentMethod === 'points'
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
                      paymentMethod === 'points'
                        ? "text-white"
                        : isDark
                          ? "text-gray-400"
                          : "text-gray-600"
                    }`}
                  >
                    {userPoints} poäng
                  </AutoText>
                </View>
                {paymentMethod === 'points' && (
                  <View className="mt-3 pt-3 border-t border-white/20">
                    <View className="flex-row items-center justify-between">
                      <AutoText className="text-white text-sm">Använd poäng:</AutoText>
                      <Input
                        placeholder="0"
                        keyboardType="numeric"
                        value={pointsToUse.toString()}
                        onChangeText={(value) => setPointsToUse(parseInt(value) || 0)}
                        className={`border rounded p-2 w-20 text-center ${
                          isDark ? 'bg-gray-700 text-white' : 'bg-white text-black'
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
                  paymentMethod === 'combined'
                    ? "bg-blue-500 border-blue-500"
                    : isDark
                      ? "bg-dark-card border-gray-600"
                      : "bg-light-card border-gray-300"
                }`}
                onPress={() => setPaymentMethod('combined')}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`w-4 h-4 rounded border-2 mr-3 ${
                        paymentMethod === 'combined'
                          ? "bg-white border-white"
                          : isDark
                            ? "border-gray-400"
                            : "border-gray-500"
                      }`}
                    >
                      {paymentMethod === 'combined' && (
                        <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                      )}
                    </View>
                    <AutoText
                      className={
                        paymentMethod === 'combined'
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
                      paymentMethod === 'combined'
                        ? "text-white"
                        : isDark
                          ? "text-gray-400"
                          : "text-gray-600"
                    }`}
                  >
                    {userPoints} poäng
                  </AutoText>
                </View>
                {paymentMethod === 'combined' && (
                  <View className="mt-3 pt-3 border-t border-white/20">
                    <View className="flex-row items-center justify-between">
                      <AutoText className="text-white text-sm">Använd poäng:</AutoText>
                      <Input
                        placeholder="0"
                        keyboardType="numeric"
                        value={pointsToUse.toString()}
                        onChangeText={(value) => setPointsToUse(parseInt(value) || 0)}
                        className={`border rounded p-2 w-20 text-center ${
                          isDark ? 'bg-gray-700 text-white' : 'bg-white text-black'
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

            {/* Pris */}
            <View className="mb-6">
              <AutoText
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Totalpris: {kg ? calculateTotal() : 0} kr
              </AutoText>
              {kg && (
                <AutoText
                  className={`text-sm ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {kg} kg × 50 kr/kg = {parseFloat(kg) * 50} kr (minimum 100 kr)
                </AutoText>
              )}
            </View>

            {/* Bokningsknapp */}
            <TouchableOpacity
              onPress={handleBooking}
              className="bg-blue-500 rounded-xl p-4 items-center"
            >
              <AutoText className="text-white font-semibold">
                Bekräfta bokning
              </AutoText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
