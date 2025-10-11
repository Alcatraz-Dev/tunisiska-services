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
import { useAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";

export default function Taxi() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { userId } = useAuth();

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

  // Calculate estimated price whenever relevant fields change
  useEffect(() => {
    const distance = 15; // km - placeholder, should use maps API in production
    const scheduledDateTime = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes()).toISOString() : undefined;
    const price = TaxiOrderService.calculateTaxiPrice(distance, isRoundTrip, scheduledDateTime);
    setEstimatedPrice(price);
  }, [isRoundTrip, date, time]);

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

    // Passenger count validation (1-8 as per schema)
    const passengerCount = parseInt(passengers);
    if (isNaN(passengerCount) || passengerCount < 1 || passengerCount > 8) {
      showAlert("Fel", "Antal personer måste vara mellan 1 och 8.");
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

      // Calculate price with scheduled time for surcharges
      const totalPrice = TaxiOrderService.calculateTaxiPrice(
        estimatedDistance,
        isRoundTrip,
        scheduledDateTime.toISOString()
      );

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
        paymentMethod: 'stripe', // Default to stripe, can be changed later
        notes: notes || undefined,
      };

      const result = await TaxiOrderService.createTaxiOrder(orderData);

      if (result.success) {
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
          Antal personer * (1-8)
        </AutoText>
        <Input
          placeholder="1"
          value={passengers}
          onChangeText={(text) => {
            // Only allow numbers 1-8
            const num = parseInt(text);
            if (text === "" || (num >= 1 && num <= 8)) {
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

        {/* Price Display */}
        <View className={`p-4 rounded-lg mb-4 ${
          isDark ? "bg-dark-card border-gray-600" : "bg-light-card border-gray-300"
        } border`}>
          <AutoText className={`text-lg font-semibold mb-3 ${
            isDark ? "text-white" : "text-black"
          }`}>
            Prisberäkning
          </AutoText>

          {(() => {
            const scheduledDateTime = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes()).toISOString() : undefined;
            const breakdown = TaxiOrderService.getPriceBreakdown(15, isRoundTrip, scheduledDateTime);
            return (
              <View className="space-y-1">
                <View className="flex-row justify-between">
                  <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Grundavgift
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {breakdown.baseFare} SEK
                  </AutoText>
                </View>

                <View className="flex-row justify-between">
                  <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Distans (15 km × 12 SEK/km)
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {breakdown.distanceCost} SEK
                  </AutoText>
                </View>

                {breakdown.timeCost > 0 && (
                  <View className="flex-row justify-between">
                    <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Tidsavgift
                    </AutoText>
                    <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {breakdown.timeCost} SEK
                    </AutoText>
                  </View>
                )}

                {breakdown.surcharges > 0 && (
                  <View className="flex-row justify-between">
                    <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Tillägg (tider, bränsle, etc.)
                    </AutoText>
                    <AutoText className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {breakdown.surcharges} SEK
                    </AutoText>
                  </View>
                )}

                <View className="flex-row justify-between border-t border-gray-300 pt-2 mt-2">
                  <AutoText className={`font-semibold ${isDark ? "text-white" : "text-black"}`}>
                    Totalt (inkl. moms)
                  </AutoText>
                  <AutoText className={`text-xl font-bold ${
                    isDark ? "text-green-400" : "text-green-600"
                  }`}>
                    {breakdown.total} SEK
                  </AutoText>
                </View>

                <AutoText className={`text-xs mt-2 ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}>
                  Priset är en uppskattning och kan variera beroende på exakt rutt och trafikförhållanden.
                  {isRoundTrip && " • Tur-och-returpris inkluderat."}
                </AutoText>
              </View>
            );
          })()}
        </View>

        {/* Confirm Booking */}
        <TouchableOpacity
          className={`p-4 rounded-xl items-center ${isLoading ? "bg-gray-500" : "bg-blue-500"}`}
          onPress={handleConfirmBooking}
          disabled={isLoading}
        >
          <AutoText className="text-white font-semibold">
            {isLoading ? "Skapar bokning..." : "Boka Taxi"}
          </AutoText>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
