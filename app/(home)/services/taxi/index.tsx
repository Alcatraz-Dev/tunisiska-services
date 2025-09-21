import {
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";

export default function Taxi() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [passengers, setPassengers] = useState("1");
  const [passengerName, setPassengerName] = useState("");
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) setTime(selectedTime);
  };

  const handleConfirmBooking = () => {
    if (!pickup || !dropoff || !date || !time || !passengers) {
      showAlert("Fel", "Vänligen fyll i alla fält.");
      return;
    }

    const bookingMessage = `Taxi Bokning:
Namn: ${passengerName}
Datum: ${date.toLocaleDateString()}
Tid: ${time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
Plats: ${pickup} -> ${dropoff}
Antal personer: ${passengers}`;

    const whatsappNumber = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP; // e.g. "46701234567"
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      bookingMessage
    )}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          showAlert("WhatsApp ej installerad", "Kunde inte öppna WhatsApp.");
        }
      })
      .catch((err) => showAlert("Fel", err.message));
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
        {/* Pickup */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Namn av person som bokar
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
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Upphämtningsplats
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
          Destination
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
          Antal personer
        </AutoText>
        <Input
          placeholder="1"
          value={passengers}
          onChangeText={setPassengers}
          keyboardType="numeric"
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Confirm Booking */}
        <TouchableOpacity
          className="bg-blue-500 p-4 rounded-xl items-center"
          onPress={handleConfirmBooking}
        >
          <AutoText className="text-white font-semibold">Boka Taxi</AutoText>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
