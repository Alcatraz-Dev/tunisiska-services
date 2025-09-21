import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import MoveCategoryCheckbox from "@/app/components/MoveCategoryCheckbox";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";

export default function Move() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [passengerName, setPassengerName] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [numItems, setNumItems] = useState("1");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasElevator, setHasElevator] = useState(false);
  const [notes, setNotes] = useState("");

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const router = useRouter();
  const sendBookingToWhatsApp = () => {
    if (!passengerName || !pickup || !dropoff) {
      showAlert("Fel", "Fyll i alla obligatoriska fält.");
      return;
    }

    const bookingMessage = `Flytt Bokning:
Namn: ${passengerName}
Datum: ${date.toLocaleDateString()}
Tid: ${time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
Plats: ${pickup} -> ${dropoff}
Antal personer: ${passengers}
Antal föremål: ${numItems}
Kategori: ${selectedCategories.join(", ")}
Hiss tillgänglig: ${hasElevator ? "Ja" : "Nej"}
Noteringar: ${notes}`;

    Linking.openURL(
      `https://wa.me/${process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
        bookingMessage
      )}`
    ).catch(() => {
      showAlert("WhatsApp ej installerad", "Kunde inte öppna WhatsApp.");
    });
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
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
            Flytt & Transport
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Fyll i dina uppgifter för att boka en flytt eller transport.
        </AutoText>
      </View>
      <ScrollView className="p-6">
        {/* Passenger Name */}
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

        {/* Pickup */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Avhämtning plats
        </AutoText>
        <Input
          placeholder="Ex: Stockholm"
          value={pickup}
          onChangeText={setPickup}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Dropoff */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Destination
        </AutoText>
        <Input
          placeholder="Ex: Uppsala"
          value={dropoff}
          onChangeText={setDropoff}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Date & Time */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Välj datum
        </AutoText>
        <TouchableOpacity
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <AutoText className={isDark ? "text-white" : "text-gray-900"}>
            {date.toLocaleDateString()}
          </AutoText>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            textColor={isDark ? "white" : "black"}
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Välj tid
        </AutoText>
        <TouchableOpacity
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          onPress={() => setShowTimePicker(!showTimePicker)}
        >
          <AutoText className={isDark ? "text-white" : "text-gray-900"}>
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
            textColor={isDark ? "white" : "black"}
            onChange={(_, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) setTime(selectedTime);
            }}
          />
        )}

        {/* Number of persons */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Antal personer
        </AutoText>
        <Input
          placeholder="1"
          keyboardType="numeric"
          value={passengers}
          onChangeText={setPassengers}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Number of items */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Antal föremål
        </AutoText>
        <Input
          placeholder="Ex: 10"
          keyboardType="numeric"
          value={numItems}
          onChangeText={setNumItems}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Item Type */}
        <MoveCategoryCheckbox
          isDark={isDark}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
        />

        {/* Elevator */}
        <View className="flex-row items-center justify-between mb-4 mx-3">
          <AutoText className={isDark ? "text-white" : "text-gray-900"}>
            Hiss tillgänglig?
          </AutoText>
          <TouchableOpacity
            className={`px-4 py-2 rounded-lg ${
              hasElevator
                ? "bg-blue-500"
                : isDark
                  ? "bg-gray-300"
                  : "bg-gray-300"
            }`}
            // onPress={() => setHasElevator(!hasElevator)}
            onPressIn={() => setHasElevator(!hasElevator)}
          >
            <AutoText className={hasElevator ? "text-white" : "text-black"}>
              {hasElevator ? "Ja" : "Nej"}
            </AutoText>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Extra information
        </AutoText>
        <Input
          placeholder="Ex: Hjälp med packning"
          value={notes}
          onChangeText={setNotes}
          className={`border rounded-lg p-4 mb-6 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Confirm Booking */}
        <TouchableOpacity
          className="bg-blue-500 p-4 rounded-xl items-center mb-8"
          onPress={sendBookingToWhatsApp}
        >
          <AutoText className="text-white font-semibold">Bekräfta Bokning</AutoText>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
