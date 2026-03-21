import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from "react-native";
import React, { useState, useEffect } from "react";
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
import { useUser } from "@clerk/clerk-expo";
import { MoveOrderService } from "@/app/services/moveOrderService";
import PaymentStripeJS from "@/app/components/PaymentStripeJS";
// Payment component removed - Stripe dependency eliminated

export default function Move() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { user } = useUser();

  // Customer info
  const [customerName, setCustomerName] = useState(user?.fullName || "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");

  // Move details
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [numItems, setNumItems] = useState("1");
  const [numPersons, setNumPersons] = useState("1");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasElevator, setHasElevator] = useState(true);
  const [notes, setNotes] = useState("");

  // Date and time
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Pricing and payment
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'points' | 'combined' | 'cash'>('cash');
  const [showPayment, setShowPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Load user points
    if (user?.unsafeMetadata) {
      const metadata = user.unsafeMetadata as { points?: number };
      setUserPoints(metadata.points || 0);
    }
  }, [user]);

  useEffect(() => {
    // Calculate price when form data changes
    calculatePrice();
  }, [numItems, numPersons, hasElevator, selectedCategories, date]);

  const calculatePrice = () => {
    try {
      const price = MoveOrderService.calculateMovePrice(
        parseInt(numItems) || 1,
        parseInt(numPersons) || 1,
        hasElevator,
        selectedCategories,
        undefined, // estimatedHours
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          time.getHours(),
          time.getMinutes()
        ).toISOString()
      );
      setEstimatedPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handlePointsChange = (points: string) => {
    const pointsNum = parseInt(points) || 0;
    const maxPoints = Math.min(userPoints, estimatedPrice * 10); // Assuming 1 SEK = 10 points
    setPointsToUse(Math.min(pointsNum, maxPoints));
  };

  const getFinalPrice = () => {
    const pointsValue = pointsToUse / 10; // Convert points to SEK
    return Math.max(0, estimatedPrice - pointsValue);
  };
  const createMoveOrder = async (skipPaymentCheck = false) => {
    // Required field validation
    if (!customerName.trim()) {
      showAlert("Fel", "Namn är obligatoriskt.");
      return;
    }
    if (!customerPhone.trim()) {
      showAlert("Fel", "Telefonnummer är obligatoriskt.");
      return;
    }
    if (!pickup.trim()) {
      showAlert("Fel", "Avhämtningsplats är obligatoriskt.");
      return;
    }
    if (!dropoff.trim()) {
      showAlert("Fel", "Destination är obligatoriskt.");
      return;
    }
    if (!numPersons.trim() || parseInt(numPersons) < 1) {
      showAlert("Fel", "Antal personer måste vara minst 1.");
      return;
    }
    if (!numItems.trim() || parseInt(numItems) < 1) {
      showAlert("Fel", "Antal föremål måste vara minst 1.");
      return;
    }
    if (selectedCategories.length === 0) {
      showAlert("Fel", "Du måste välja minst en typ av föremål.");
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

    try {
      setIsLoading(true);

      const scheduledDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes()
      ).toISOString();

      const orderData = {
        userId: user?.id!,
        customerInfo: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
        pickupAddress: pickup,
        deliveryAddress: dropoff,
        scheduledDateTime,
        numberOfItems: parseInt(numItems),
        numberOfPersons: parseInt(numPersons),
        hasElevator,
        itemCategories: selectedCategories,
        totalPrice: estimatedPrice,
        pointsUsed: pointsToUse,
        paymentMethod,
        notes,
        specialRequirements: notes,
      };

      // Skip payment processing if called from payment success callback
      if (!skipPaymentCheck && paymentMethod !== 'cash') {
        const finalPrice = getFinalPrice();
        if (finalPrice > 0) {
          // Show payment modal for non-cash payments
          setShowPayment(true);
          setIsLoading(false);
          return;
        }
      }

      // Create order directly (for cash payment, points-only payment, or after successful payment)
      const result = await MoveOrderService.createMoveOrder(orderData);

      if (result.success) {
        // Send notification
        await MoveOrderService.sendOrderConfirmationNotification(orderData.userId, orderData);
        showAlert(
          'Beställning skapad! 🎉',
          `Din flytt har beställts.\\n\\nBeställningsnummer: ${result.order._id}\\nTotalt: ${estimatedPrice} SEK\\nPoäng använda: ${pointsToUse}`
        );
        router.back();
      } else {
        showAlert('Fel', result.error || 'Kunde inte skapa beställningen');
      }
    } catch (error: any) {
      console.error('Error creating move order:', error);
      showAlert('Fel', error.message || 'Kunde inte skapa beställningen');
    } finally {
      setIsLoading(false);
    }
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
            Flytt utan städning
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Fyll i dina uppgifter för att boka flytt utan städning.
        </AutoText>
      </View>
      <ScrollView className="p-6">
        {/* Customer Information */}
        <AutoText className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Kontaktuppgifter
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

        {/* Pickup */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Avhämtning plats *
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
          Destination *
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
          Välj datum *
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
            themeVariant={isDark ? "dark" : "light"}
            textColor={isDark ? "white" : "black"}
            minimumDate={new Date()}
            onChange={(_, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Välj tid *
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
            themeVariant={isDark ? "dark" : "light"}
            textColor={isDark ? "white" : "black"}
            onChange={(_, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) setTime(selectedTime);
            }}
          />
        )}

        {/* Number of persons */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Antal personer *
        </AutoText>
        <Input
          placeholder="1"
          keyboardType="numeric"
          value={numPersons}
          onChangeText={setNumPersons}
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
          placeholder="Särskilda önskemål eller instruktioner..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          className={`border rounded-lg p-4 mb-6 ${
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
                Kontant betalning (vid flytt)
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
                    onChangeText={handlePointsChange}
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
                    onChangeText={handlePointsChange}
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
                {getFinalPrice()} SEK
              </AutoText>
            </View>
          </View>
        </View>

        {/* Confirm Booking */}
        <View className="mb-8">
          {paymentMethod === 'stripe' || (paymentMethod === 'combined' && getFinalPrice() > 0) ? (
            <PaymentStripeJS
              amount={getFinalPrice()}
              points={getFinalPrice() * 10}
              isDark={isDark}
              service="Flytt"
              customText={`Betala ${getFinalPrice()} SEK för Flytt`}
             
              customStyle={{
                backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                borderWidth: 1,
                borderColor: isDark ? "#3C3C3E" : "#E5E5E5",
              }}
              disabled={!customerName.trim() || !customerPhone.trim() || !pickup.trim() || !dropoff.trim() || !numPersons.trim() || parseInt(numPersons) < 1 || !numItems.trim() || parseInt(numItems) < 1 || selectedCategories.length === 0}
              onPaymentSuccess={async (purchasedPoints: number, amountPaid: number) => {
                await createMoveOrder(true);
              }}
            />
          ) : (
            <TouchableOpacity
              className={`p-4 rounded-xl items-center ${isLoading ? "bg-gray-500" : "bg-blue-500"}`}
              onPress={() => createMoveOrder()}
              disabled={isLoading || !customerName.trim() || !customerPhone.trim() || !pickup.trim() || !dropoff.trim() || !numPersons.trim() || parseInt(numPersons) < 1 || !numItems.trim() || parseInt(numItems) < 1 || selectedCategories.length === 0}
            >
              <AutoText className="text-center mt-2  text-white font-semibold text-base">
                {isLoading ? "Skapar beställning..." : 'Bekräfta flyttbokning'}
              </AutoText>
            </TouchableOpacity>
          )}

          <View className="flex-row items-center justify-center mt-4">
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <AutoText className={`text-xs text-center ml-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Säker betalning • 24/7 support • Professionella flyttare
            </AutoText>
          </View>

          <AutoText className={`text-xs text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {paymentMethod === 'cash' && 'Du betalar kontant till flyttfirman vid leverans.'}
            {paymentMethod === 'stripe' && 'Betalning sker säkert via kort och debiteras direkt.'}
            {paymentMethod === 'points' && `Betalning sker med ${pointsToUse} poäng (${(pointsToUse / 10).toFixed(0)} SEK).`}
            {paymentMethod === 'combined' && `Kombinerad betalning: ${pointsToUse} poäng + ${(getFinalPrice()).toFixed(0)} SEK med kort.`}
          </AutoText>
        </View>

      
      </ScrollView>
        {/* Payment Modal */}
        {showPayment && (
          <View className="absolute inset-0 bg-black/60 backdrop-blur-sm justify-center items-center z-50">
            <View className={`mx-6 p-8 rounded-3xl w-full max-w-sm ${isDark ? 'bg-dark-card border border-gray-700' : 'bg-white border border-gray-200'} shadow-2xl`}>
              {/* Header with Icon */}
              <View className="items-center mb-6">
                <View className={`p-4 rounded-full mb-4 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <Ionicons
                    name="card-outline"
                    size={32}
                    color={isDark ? "#60A5FA" : "#3B82F6"}
                  />
                </View>
                <AutoText className={`text-center text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Slutför betalning
                </AutoText>
                <AutoText className={`text-center text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {getFinalPrice()} SEK för din flyttbokning
                </AutoText>
              </View>

              {/* Payment Component - Stripe removed, simulate success */}
              <View className="mb-6">
                <TouchableOpacity
                  className={`p-4 rounded-xl items-center ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}
                  onPress={async () => {
                    setShowPayment(false);
                    // Simulate successful payment and create order
                    try {
                      const scheduledDateTime = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                        time.getHours(),
                        time.getMinutes()
                      ).toISOString();

                      const orderData = {
                        userId: user?.id!,
                        customerInfo: {
                          name: customerName,
                          phone: customerPhone,
                          email: customerEmail,
                        },
                        pickupAddress: pickup,
                        deliveryAddress: dropoff,
                        scheduledDateTime,
                        numberOfItems: parseInt(numItems),
                        numberOfPersons: parseInt(numPersons),
                        hasElevator,
                        itemCategories: selectedCategories,
                        totalPrice: estimatedPrice,
                        pointsUsed: pointsToUse,
                        paymentMethod,
                        notes,
                        specialRequirements: notes,
                      };

                      const result = await MoveOrderService.createMoveOrder(orderData);
                      if (result.success) {
                        // Send notification after successful order creation
                        await MoveOrderService.sendOrderConfirmationNotification(orderData.userId, orderData);
                        showAlert(
                          'Beställning skapad! 🎉',
                          `Din flytt har beställts.\\n\\nBeställningsnummer: ${result.order._id}\\nTotalt: ${estimatedPrice} SEK\\nPoäng använda: ${pointsToUse}`
                        );
                        router.back();
                      }
                    } catch (error) {
                      console.error('Error creating order after payment:', error);
                      showAlert('Fel', 'Betalningen lyckades men beställningen kunde inte skapas. Kontakta support.');
                    }
                  }}
                >
                  <AutoText className="text-white font-semibold">
                    Bekräfta betalning ({getFinalPrice()} SEK)
                  </AutoText>
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setShowPayment(false)}
                className={`p-4 rounded-2xl items-center border ${isDark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-100'}`}
              >
                <AutoText className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Avbryt betalning
                </AutoText>
              </TouchableOpacity>

              {/* Security Note */}
              <View className="flex-row items-center justify-center mt-4">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
                <AutoText className={`text-xs ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Säker betalning via Stripe
                </AutoText>
              </View>
            </View>
          </View>
        )}
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
