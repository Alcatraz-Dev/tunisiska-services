import {
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { TaxiOrderService, TaxiOrderData } from "@/app/services/taxiOrderService";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import PaymentStripeJS from "@/app/components/PaymentStripeJS";

export default function Taxi() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [passengers, setPassengers] = useState("1");
  const [passengerName, setPassengerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date());
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [returnTime, setReturnTime] = useState(new Date());
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'points' | 'combined' | 'cash'>('cash');
  const [currentUserPoints, setCurrentUserPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Pre-fill user information from Clerk
  useEffect(() => {
    if (user) {
      const fullName = user.fullName || user.firstName || "";
      const phoneNumber = user.phoneNumbers?.[0]?.phoneNumber || "";
      const emailAddress = user.primaryEmailAddress?.emailAddress || "";
      const userPoints = (user.unsafeMetadata as any)?.points || 0;

      if (fullName && !passengerName) setPassengerName(fullName);
      if (phoneNumber && !phone) setPhone(phoneNumber);
      if (emailAddress && !email) setEmail(emailAddress);
      setCurrentUserPoints(userPoints);
    }
  }, [user]);

  // Calculate estimated price whenever relevant fields change
  useEffect(() => {
    const distance = 15; // km - placeholder, should use maps API in production
    const scheduledDateTime = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes()).toISOString() : undefined;
    const passengerCount = parseInt(passengers) || 1;
    const price = TaxiOrderService.calculateTaxiPrice(distance, isRoundTrip, scheduledDateTime, passengerCount);
    setEstimatedPrice(price);
  }, [isRoundTrip, date, time, passengers]);

  const handlePointsChange = (points: string) => {
    const pointsNum = parseInt(points) || 0;
    const maxPoints = Math.min(currentUserPoints, estimatedPrice * 10); // Assuming 1 SEK = 10 points
    setPointsToUse(Math.min(pointsNum, maxPoints));
  };

  const getFinalPrice = () => {
    const pointsValue = pointsToUse / 10; // Convert points to SEK
    return Math.max(0, estimatedPrice - pointsValue);
  };

  // Real payment processing function
  const processPayment = async (method: string, amount: number): Promise<boolean> => {
    console.log(`Processing ${method} payment for ${amount} SEK`);

    if (method === 'cash') {
      // Cash payment - no processing needed, payment collected by driver
      return true;
    }

    if (method === 'points') {
      // Points payment - deduct from user points
      // Assuming 1 point = 0.1 SEK, so amount * 10 points needed
      const pointsNeeded = amount * 10;
      console.log(`Deducting ${pointsNeeded} points from user`);

      try {
        // Use the user from the component state (already available)
        if (!user) {
          throw new Error('User not authenticated');
        }

        const currentPoints = (user.unsafeMetadata as any)?.points || 0;

        if (currentPoints < pointsNeeded) {
          showAlert("Otillräckliga poäng", `Du har ${currentPoints} poäng men behöver ${pointsNeeded} poäng för denna betalning. Vill du fylla på dina poäng?`, [
            { text: "Avbryt", style: "cancel" },
            {
              text: "Fyll på poäng",
              onPress: () => {
                router.push("/profile/wallet");
              }
            }
          ]);
          return false;
        }

        // Update user points in Clerk
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsNeeded
          }
        });

        // Update local state
        setCurrentUserPoints(currentPoints - pointsNeeded);

        console.log(`Points payment successful: ${pointsNeeded} points deducted`);
        return true;
      } catch (error) {
        console.error('Points payment failed:', error);
        return false;
      }
    }

    if (method === 'combined') {
      // Combined payment - calculate points and remaining amount for Stripe
      const maxPointsValue = Math.min(amount * 0.5, 100); // Max 50% or 100 SEK with points
      const pointsToUse = Math.min(maxPointsValue * 10, 1000); // Max 1000 points
      const pointsValue = pointsToUse / 10;
      const remainingAmount = amount - pointsValue;

      console.log(`Combined payment: ${pointsValue} SEK with points, ${remainingAmount} SEK with Stripe`);

      // First deduct points
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        const currentPoints = (user.unsafeMetadata as any)?.points || 0;

        if (currentPoints < pointsToUse) {
          showAlert("Otillräckliga poäng", `Du har ${currentPoints} poäng men behöver ${pointsToUse} poäng för denna kombinerade betalning. Vill du fylla på dina poäng?`, [
            { text: "Avbryt", style: "cancel" },
            {
              text: "Fyll på poäng",
              onPress: () => {
                router.push("/profile/wallet");
              }
            }
          ]);
          return false;
        }

        // Deduct points first
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsToUse
          }
        });

        console.log(`Points deducted: ${pointsToUse} points`);

        // Then process Stripe payment for remaining amount
        if (remainingAmount > 0) {
          const stripeSuccess = await processPayment('stripe', remainingAmount);
          if (!stripeSuccess) {
            // Refund points if Stripe fails
            await user.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                points: ((user.unsafeMetadata as any)?.points || 0) + pointsToUse
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
              cancelUrl: window.location.origin + '/cancel',
              isDark: isDark
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

      // Stripe payment - use existing Payment component logic
      try {

        // Get server URL
        const { getBestServerURL } = await import('@/app/config/stripe');
        const serverUrl = await getBestServerURL();

        // Fetch payment sheet params
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

        // Since Stripe is not available on web, just show message
        console.log('Stripe payment not available on web');
        return false;
      } catch (error: any) {
        console.error('Stripe payment error:', error);
        return false;
      }
    }

    return false;
  };

  // Send order confirmation notification
  const sendOrderConfirmationNotification = async (userId: string, orderData: TaxiOrderData) => {
    try {
      const notificationPayload = {
        title: "Taxi-bokning bekräftad! 🚕",
        message: `Din taxi från ${orderData.pickupAddress} till ${orderData.destinationAddress} är bokad för ${new Date(orderData.scheduledDateTime).toLocaleString('sv-SE')}. Totalt pris: ${orderData.totalPrice} SEK (${orderData.paymentMethod === 'cash' ? 'Kontant betalning' : 'Förbetald'}).`,
        subID: userId,
        pushData: {
          orderId: "new-order", // This would be the actual order ID
          type: "taxi_booking_confirmed",
          paymentMethod: orderData.paymentMethod,
        },
      };

      const result = await nativeNotifyAPI.sendNotification(notificationPayload);
      if (result.success) {
        console.log("Order confirmation notification sent successfully");
      } else {
        console.error("Failed to send order confirmation notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending order confirmation notification:", error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) setTime(selectedTime);
  };

  const handleReturnDateChange = (event: any, selectedDate?: Date) => {
    setShowReturnDatePicker(Platform.OS === "ios");
    if (selectedDate) setReturnDate(selectedDate);
  };

  const handleReturnTimeChange = (event: any, selectedTime?: Date) => {
    setShowReturnTimePicker(Platform.OS === "ios");
    if (selectedTime) setReturnTime(selectedTime);
  };

  const handleConfirmBooking = async () => {
    if (!userId) {
      showAlert("Fel", "Du måste vara inloggad för att boka.");
      return;
    }

    // Required field validation
    if (!pickup || !dropoff || !passengerName || !phone || !passengers) {
      showAlert("Fel", "Vänligen fyll i alla obligatoriska fält.");
      return;
    }

    // Passenger count validation (1-4 as per schema)
    const passengerCount = parseInt(passengers);
    if (isNaN(passengerCount) || passengerCount < 1 || passengerCount > 4) {
      showAlert("Fel", "Antal personer måste vara mellan 1 och 4.");
      return;
    }

    // Date validation - ensure not in the past
    const now = new Date();
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

    if (scheduledDateTime <= now) {
      showAlert("Fel", "Bokningstiden måste vara i framtiden.");
      return;
    }

    // Round trip validation
    if (isRoundTrip) {
      if (!returnDate || !returnTime) {
        showAlert("Fel", "Vänligen välj returdatum och tid för tur-och-retur resa.");
        return;
      }

      const returnDateTime = new Date(returnDate);
      returnDateTime.setHours(returnTime.getHours(), returnTime.getMinutes(), 0, 0);

      if (returnDateTime <= scheduledDateTime) {
        showAlert("Fel", "Retur-tiden måste vara efter upphämtningstiden.");
        return;
      }
    }

    // Email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("Fel", "Ogiltig e-postadress.");
      return;
    }

    setIsLoading(true);

    try {
      // Combine date and time for scheduledDateTime
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

      // Calculate estimated distance (placeholder - in real app, use maps API)
      const estimatedDistance = 15; // km

      // Calculate price with scheduled time for surcharges and passenger count
      const totalPrice = TaxiOrderService.calculateTaxiPrice(
        estimatedDistance,
        isRoundTrip,
        scheduledDateTime.toISOString(),
        parseInt(passengers)
      );

      // Handle payment processing based on method
      if (paymentMethod !== 'cash') {
        // For non-cash payments, process payment before creating order
        console.log(`Processing ${paymentMethod} payment for ${totalPrice} SEK`);
        const paymentSuccess = await processPayment(paymentMethod, totalPrice);
        if (!paymentSuccess) {
          showAlert("Betalningsfel", "Betalningen kunde inte genomföras. Försök igen.");
          setIsLoading(false);
          return;
        }
        console.log(`${paymentMethod} payment successful`);
      }
      // For cash payment, no processing needed - payment will be collected by driver

      const orderData: TaxiOrderData = {
        userId,
        customerInfo: {
          name: passengerName,
          phone,
          email: email || undefined,
        },
        pickupAddress: pickup,
        destinationAddress: dropoff,
        scheduledDateTime: scheduledDateTime.toISOString(),
        numberOfPassengers: parseInt(passengers),
        isRoundTrip,
        returnDateTime: isRoundTrip ? (() => {
          const returnDateTime = new Date(returnDate);
          returnDateTime.setHours(returnTime.getHours(), returnTime.getMinutes(), 0, 0);
          return returnDateTime.toISOString();
        })() : undefined,
        estimatedDistance,
        totalPrice,
        paymentMethod,
        pointsUsed: pointsToUse,
        notes: notes || undefined,
      };

      const result = await TaxiOrderService.createTaxiOrder(orderData);

      if (result.success) {
        // Send notification to user
        await sendOrderConfirmationNotification(userId, orderData);

        showAlert("Bokning bekräftad", "Din taxi har blivit bokad! Du kommer att få en bekräftelse snart.");
        // Reset form
        setPickup("");
        setDropoff("");
        setPassengerName("");
        setPhone("");
        setEmail("");
        setPassengers("1");
        setNotes("");
        setIsRoundTrip(false);
        setPaymentMethod('cash');
        router.back();
      } else {
        showAlert("Bokningsfel", result.error || "Kunde inte skapa bokning. Försök igen.");
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      showAlert("Fel", "Ett oväntat fel inträffade. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center relative mb-4">
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
            Taxi Bokning
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Välj datum och tid för din bokning
        </AutoText>
      </View>

      {/* Form */}
      <ScrollView className="px-6 pt-6">
        {/* Passenger Name */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Namn av person som bokar *
        </AutoText>
        <Input
          placeholder="Ex: John Doe"
          value={passengerName}
          onChangeText={setPassengerName}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />
        <AutoText className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Informationen fylls automatiskt från din profil
        </AutoText>

        {/* Phone */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Telefonnummer *
        </AutoText>
        <Input
          placeholder="Ex: +46 70 123 45 67"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Email */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          E-postadress
        </AutoText>
        <Input
          placeholder="Ex: john@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Pickup */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Upphämtningsplats *
        </AutoText>
        <Input
          placeholder="Ex: Arlanda, Stockholm"
          value={pickup}
          onChangeText={setPickup}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Drop-off */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Destination *
        </AutoText>
        <Input
          placeholder="Ex: Bromma, Stockholm"
          value={dropoff}
          onChangeText={setDropoff}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Date picker */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Datum
        </AutoText>
        <TouchableOpacity
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <AutoText className={isDark ? "text-white" : "text-black"}>
            {date.toLocaleDateString()}
          </AutoText>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            textColor={isDark ? "#fff" : "#000"} // iOS only
            onChange={handleDateChange}
          />
        )}

        {/* Time picker */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Tid
        </AutoText>
        <TouchableOpacity
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          onPress={() => setShowTimePicker(!showTimePicker)}
        >
          <AutoText className={isDark ? "text-white" : "text-black"}>
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </AutoText>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            textColor={isDark ? "#fff" : "#000"} // iOS only
            onChange={handleTimeChange}
          />
        )}

        {/* Passengers */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Antal personer * (1-4)
        </AutoText>
        <Input
          placeholder="1"
          value={passengers}
          onChangeText={(text) => {
            // Only allow numbers 1-4
            const num = parseInt(text);
            if (text === "" || (num >= 1 && num <= 4)) {
              setPassengers(text);
            }
          }}
          keyboardType="numeric"
          maxLength={1}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />


        {/* Round Trip */}
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            className={`flex-row items-center p-3 rounded-lg border ${
              isRoundTrip
                ? "bg-blue-500 border-blue-500"
                : isDark
                ? "bg-dark-card border-gray-600"
                : "bg-light-card border-gray-300"
            }`}
            onPress={() => setIsRoundTrip(!isRoundTrip)}
            activeOpacity={0.8}
          >
            <View
              className={`w-4 h-4 rounded border-2 mr-3 ${
                isRoundTrip
                  ? "bg-white border-white"
                  : isDark
                  ? "border-gray-400"
                  : "border-gray-500"
              }`}
            >
              {isRoundTrip && (
                <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
              )}
            </View>
            <AutoText
              className={
                isRoundTrip
                  ? "text-white font-semibold"
                  : isDark
                  ? "text-white"
                  : "text-black"
              }
            >
              Tur och retur
            </AutoText>
          </TouchableOpacity>
        </View>

        {/* Return Date/Time - only show if round trip */}
        {isRoundTrip && (
          <>
            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Retur datum *
            </AutoText>
            <TouchableOpacity
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              onPress={() => setShowReturnDatePicker(!showReturnDatePicker)}
            >
              <AutoText className={isDark ? "text-white" : "text-black"}>
                {returnDate.toLocaleDateString()}
              </AutoText>
            </TouchableOpacity>
            {showReturnDatePicker && (
              <DateTimePicker
                value={returnDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                textColor={isDark ? "#fff" : "#000"}
                onChange={handleReturnDateChange}
              />
            )}

            <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Retur tid *
            </AutoText>
            <TouchableOpacity
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
              }`}
              onPress={() => setShowReturnTimePicker(!showReturnTimePicker)}
            >
              <AutoText className={isDark ? "text-white" : "text-black"}>
                {returnTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </AutoText>
            </TouchableOpacity>
            {showReturnTimePicker && (
              <DateTimePicker
                value={returnTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                textColor={isDark ? "#fff" : "#000"}
                onChange={handleReturnTimeChange}
              />
            )}
          </>
        )}

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
                Kontant betalning (vid upphämtning)
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
                {currentUserPoints} poäng
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
                    onChangeText={handlePointsChange}
                    className={`border rounded p-2 w-20 text-center ${
                      isDark ? 'bg-gray-700 text-white' : 'bg-white text-black'
                    }`}
                  />
                </View>
                <AutoText className="text-white/80 text-xs mt-1">
                  Du har {currentUserPoints} poäng tillgängliga
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
                {currentUserPoints} poäng
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
                    onChangeText={handlePointsChange}
                    className={`border rounded p-2 w-20 text-center ${
                      isDark ? 'bg-gray-700 text-white' : 'bg-white text-black'
                    }`}
                  />
                </View>
                <AutoText className="text-white/80 text-xs mt-1">
                  Du har {currentUserPoints} poäng tillgängliga
                </AutoText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Speciella önskemål eller instruktioner
        </AutoText>
        <Input
          placeholder="Ex: Barnstol behövs, mycket bagage, etc."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
          style={{ height: 80, textAlignVertical: "top" }}
        />

        {/* Price Summary */}
        <View className={`border rounded-lg p-4 mb-6 ${isDark ? 'bg-dark-card' : 'bg-light-card'}`}>
          <AutoText className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Prissammanfattning
          </AutoText>
          <View className="flex-row justify-between mb-2">
            <AutoText className={isDark ? 'text-gray-400' : 'text-gray-600'}>Grundpris:</AutoText>
            <AutoText className={isDark ? 'text-white' : 'text-black'}>{estimatedPrice} SEK</AutoText>
          </View>
          <View className="border-t border-gray-300 pt-2 mt-2">
            <View className="flex-row justify-between">
              <AutoText className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>Att betala:</AutoText>
              <AutoText className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                {paymentMethod === 'cash' || paymentMethod === 'stripe' ? estimatedPrice : getFinalPrice()} SEK
              </AutoText>
            </View>
          </View>
        </View>

        {/* Confirm Booking */}
        {paymentMethod === 'stripe' || (paymentMethod === 'combined' && getFinalPrice() > 0) ? (
          <PaymentStripeJS
            amount={getFinalPrice()}
            points={getFinalPrice() * 10}
            isDark={isDark}
            service="Taxi"
            customText={`Betala ${getFinalPrice()} SEK för Taxi`}
            customClassName={`mb-10 `}
            customStyle={{
              backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#3C3C3E" : "#E5E5E5",
            }}
            disabled={!pickup.trim() || !dropoff.trim() || !passengerName.trim() || !phone.trim() || !passengers.trim() || parseInt(passengers) < 1 || parseInt(passengers) > 4}
            onPaymentSuccess={async (purchasedPoints: number, amountPaid: number) => {
              await handleConfirmBooking();
            }}
          />
        ) : (
          <TouchableOpacity
            className={`p-4 rounded-xl items-center ${isLoading ? "bg-gray-500" : "bg-blue-500"}`}
            onPress={handleConfirmBooking}
            disabled={isLoading || !pickup.trim() || !dropoff.trim() || !passengerName.trim() || !phone.trim() || !passengers.trim() || parseInt(passengers) < 1 || parseInt(passengers) > 4}
          >
            <AutoText className="text-white font-semibold">
              {isLoading ? "Skapar bokning..." : 'Boka Taxi'}
            </AutoText>
          </TouchableOpacity>
        )}
      </ScrollView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
