import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";

export default function CleaningAndMove() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [name, setName] = useState("");
  const [pickup, setPickup] = useState("");
  const [pickupFloor, setPickupFloor] = useState("");
  const [pickupElevator, setPickupElevator] = useState(false);
  const [specialItems, setSpecialItems] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationFloor, setDestinationFloor] = useState("");
  const [destinationElevator, setDestinationElevator] = useState(false);
  const [volume, setVolume] = useState("");
  const [cleaningExtras, setCleaningExtras] = useState("");
  const [people, setPeople] = useState("1");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState("");

  const basePrice = 200; // SEK
  const perPerson = 50; // SEK per helper
  const totalCost = basePrice + perPerson * Number(people);

  const sendBookingToWhatsApp = () => {
    if (!name || !pickup || !destination) {
      showAlert("Fel", "Fyll i alla obligatoriska fält!");
      return;
    }

    const message = `Bokning - Flytt + Städhjälp:
Namn: ${name}
Datum: ${date.toLocaleDateString()}
Tid: ${time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
Pickup: ${pickup} (Våning: ${pickupFloor}, Hiss: ${
      pickupElevator ? "Ja" : "Nej"
    })
Specialföremål: ${specialItems}
Destination: ${destination} (Våning: ${destinationFloor}, Hiss: ${
      destinationElevator ? "Ja" : "Nej"
    })
Volym: ${volume} m³
Städextra: ${cleaningExtras}
Antal personer: ${people}
Extra info: ${notes}
Total kostnad: ${totalCost} SEK`;

    const whatsappNumber = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      message
    )}`;

    Linking.openURL(whatsappUrl).catch(() =>
      showAlert(
        "Fel",
        "Kunde inte öppna WhatsApp. Kontrollera app eller webbläsare."
      )
    );
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
            Flytt & Städhjälp
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mb-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Fyll i alla obligatoriska fält
        </AutoText>
      </View>

      <ScrollView className="p-6">
        {/* Name */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Namn av person som bokar
        </AutoText>
        <Input
          placeholder="Ex: John Doe"
          value={name}
          onChangeText={setName}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Pickup */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Pickup Adress
        </AutoText>
        <Input
          placeholder="Ex: Drottninggatan 10"
          value={pickup}
          onChangeText={setPickup}
          className={`border rounded-lg p-4 mb-2 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />
        <Input
          placeholder="Våning"
          value={pickupFloor}
          onChangeText={setPickupFloor}
          className={`border rounded-lg p-4 mb-2 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />
        {/* Elevator toggle */}
        <View className="flex-row items-center justify-between mb-4 mx-3">
          <AutoText className={isDark ? "text-white" : "text-gray-900"}>
            Hiss tillgänglig?
          </AutoText>
          <TouchableOpacity
            className={`px-4 py-2 rounded-lg ${
              pickupElevator
                ? "bg-blue-500"
                : isDark
                ? "bg-gray-300"
                : "bg-gray-300"
            }`}
            // onPress={() => setPickupElevator(!pickupElevator)}
             onPressIn={()=> setPickupElevator(!pickupElevator)}
          >
            <AutoText className={pickupElevator ? "text-white" : "text-black"}>
              {pickupElevator ? "Ja" : "Nej"}
            </AutoText>
          </TouchableOpacity>
        </View>

        <Input
          placeholder="Specialföremål"
          value={specialItems}
          onChangeText={setSpecialItems}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Destination */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Destination
        </AutoText>
        <Input
          placeholder="Ex: Stora Gatan 20"
          value={destination}
          onChangeText={setDestination}
          className={`border rounded-lg p-4 mb-2 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />
        <Input
          placeholder="Våning"
          value={destinationFloor}
          onChangeText={setDestinationFloor}
          className={`border rounded-lg p-4 mb-2 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />
        {/* Elevator toggle */}
        <View className="flex-row items-center justify-between mb-4 mx-3">
          <AutoText className={isDark ? "text-white" : "text-gray-900"}>
            Hiss tillgänglig?
          </AutoText>
          <TouchableOpacity
            className={`px-4 py-2 rounded-lg ${
              destinationElevator
                ? "bg-blue-500"
                : isDark
                ? "bg-gray-300"
                : "bg-gray-300"
            }`}
            // onPress={() => setDestinationElevator(!destinationElevator)}
             onPressIn={() => setDestinationElevator(!destinationElevator)}
          >
            <AutoText className={destinationElevator ? "text-white" : "text-black"}>
              {destinationElevator ? "Ja" : "Nej"}
            </AutoText>
          </TouchableOpacity>
        </View>

        {/* Volume */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Volym (kvm)
        </AutoText>
        <Input
          placeholder="Ex: 50 kvm"
          value={volume}
          onChangeText={setVolume}
          keyboardType="numeric"
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Cleaning extras */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Extra städning
        </AutoText>
        <Input
          placeholder="Ex: Fönster, kylskåp"
          value={cleaningExtras}
          onChangeText={setCleaningExtras}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Number of people */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Antal personer
        </AutoText>
        <Input
          placeholder="Ex: 2"
          value={people}
          onChangeText={setPeople}
          keyboardType="numeric"
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
        />

        {/* Date & Time pickers */}
        <TouchableOpacity
          onPress={() => setShowDatePicker(!showDatePicker)}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card" : "bg-light-card"
          }`}
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

        <TouchableOpacity
          onPress={() => setShowTimePicker(!showTimePicker)}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card" : "bg-light-card"
          }`}
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

        {/* Notes */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Extra info
        </AutoText>
        <Input
          placeholder="Ex: Ta med flyttlådor"
          value={notes}
          onChangeText={setNotes}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? "bg-dark-card text-white" : "bg-light-card text-black"
          }`}
          placeholderTextColor={isDark ? "gray" : "gray"}
        />

        {/* Total cost */}
        <AutoText
          className={`text-lg font-bold mb-4 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Total kostnad: {totalCost} SEK
        </AutoText>

        {/* Confirm booking */}
        <TouchableOpacity
          onPress={sendBookingToWhatsApp}
          className="bg-blue-500 rounded-xl p-4 items-center mb-6"
        >
          <AutoText className="text-white font-semibold">Bekräfta Bokning</AutoText>
        </TouchableOpacity>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
