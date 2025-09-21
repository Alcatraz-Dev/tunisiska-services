import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
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

// 🔹 Demo admin schema för ett år
const adminSchedules = [
  { date: "2025-09-20", location: "Stockholm → Tunis", time: "10:00" },
  { date: "2025-09-20", location: "Göteborg → Tunis", time: "14:00" },
  { date: "2025-09-25", location: "Malmö → Tunis", time: "09:00" },
  { date: "2025-10-02", location: "Tunis → Stockholm", time: "12:00" },
];

export default function ShippingPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  const [kg, setKg] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [usePoints, setUsePoints] = useState(false);

  const userPoints = user?.unsafeMetadata?.points || 0;

  // 🔹 När datum väljs → filtrera trips för det datumet
  const handleDateSelect = (day: any) => {
    setSelectedDate(day.dateString);
    const trips = adminSchedules.filter((s) => s.date === day.dateString);
    setAvailableTrips(trips);
    setSelectedTrip(null);
  };

  // 🔹 Markera datumen som finns i schemat
  const markedDates = adminSchedules.reduce((acc: any, s) => {
    acc[s.date] = {
      marked: true,
      dotColor: "#0ea5e9",
      selected: selectedDate === s.date,
      selectedColor: "#0ea5e9",
    };
    return acc;
  }, {});

  // 🔹 Beräkna pris
  const calculateTotal = () => {
    const weight = parseFloat(kg) || 0;
    let total = weight * 50;

    // Minimum booking cost
    if (total > 100) {
      total -= 100;
    }

    // Points discount
    if (usePoints && (userPoints as number) > 0) {
      const discount = (userPoints as number) / 10;
      total = Math.max(0, total - discount);
    }

    return total;
  };

  const handleBooking = () => {
    if (!selectedTrip || selectedCategories.length === 0 || !kg) {
      return showAlert(
        "Fel",
        "Vänligen välj schema, kategori och fyll i vikt"
      );
    }

    const totalCost = calculateTotal();

    showAlert(
      "Bokning bekräftad",
      `Datum: ${selectedTrip.date}\nPlats: ${selectedTrip.location}\nTid: ${
        selectedTrip.time
      }\nKategori: ${selectedCategories.join(
        ", "
      )}\nVikt: ${kg} kg\nTotal: ${totalCost} kr`
    );
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
          markedDates={markedDates}
          onDayPress={handleDateSelect}
          theme={{
            calendarBackground: "#1c1c1e",
            textSectionTitleColor: "#fff",
            dayTextColor: "#fff",
            monthTextColor: "#fff",
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
              Tillgängliga resor
            </AutoText>
            {availableTrips.map((trip, index) => (
              <TouchableOpacity
                key={index}
                // onPress={() => setSelectedTrip(trip)}
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
                  className={`font-bold ${
                    selectedTrip === trip
                      ? "text-white"
                      : isDark
                      ? "text-white"
                      : "text-gray-900"
                  }`}
                >
                  {trip.location}
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
                  {trip.date} – {trip.time}
                </AutoText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Inputs */}
        {selectedTrip && (
          <>
            <ShippingCategoryCheckbox
              isDark={isDark}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
            />
            <AutoText
              className={`mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Vikt (kg)
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

            {/* Använd poäng */}
            <TouchableOpacity
              onPress={() => setUsePoints(!usePoints)}
              className="flex-row items-center mb-6"
            >
              <Ionicons
                name={usePoints ? "checkbox" : "square-outline"}
                size={22}
                color={isDark ? "#fff" : "#000"}
              />
              <AutoText
                className={`ml-2 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Använd poäng ({userPoints as number}p ≈{" "}
                {(userPoints as number) / 10} kr)
              </AutoText>
            </TouchableOpacity>

            {/* Pris */}
            <View className="mb-6">
              <AutoText
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Totalpris: {calculateTotal()} kr
              </AutoText>
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
