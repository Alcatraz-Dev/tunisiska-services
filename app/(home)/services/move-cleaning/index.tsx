import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/app/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import MoveCategoryCheckbox from "@/app/components/MoveCategoryCheckbox";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { useUser } from "@clerk/clerk-expo";
import { MoveCleaningOrderService } from "@/app/services/moveCleaningOrderService";

// Stripe is conditionally imported in the payment function

export default function MoveCleaning() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { user } = useUser();

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Move details
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [numItems, setNumItems] = useState("1");
  const [numPersons, setNumPersons] = useState("1");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasElevator, setHasElevator] = useState(true);

  // Cleaning details
  const [cleaningAreas, setCleaningAreas] = useState<string[]>([]);
  const [cleaningIntensity, setCleaningIntensity] = useState<'basic' | 'deep' | 'move_out'>('basic');
  const [cleaningSupplies, setCleaningSupplies] = useState(true);

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
  const [notes, setNotes] = useState("");

  const router = useRouter();

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

  useEffect(() => {
    // Calculate price when form data changes
    calculatePrice();
  }, [numItems, numPersons, hasElevator, selectedCategories, cleaningAreas, cleaningIntensity, cleaningSupplies, date]);

  const calculatePrice = () => {
    try {
      const price = MoveCleaningOrderService.calculateMoveCleaningPrice(
        parseInt(numItems) || 1,
        parseInt(numPersons) || 1,
        hasElevator,
        selectedCategories,
        cleaningAreas,
        cleaningIntensity,
        cleaningSupplies,
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
                // router.push("/profile/wallet");
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
        setUserPoints(currentPoints - pointsNeeded);

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
                // router.push("/profile/wallet");
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
        showAlert("Fel", "Kortbetalning är inte tillgänglig på web. Välj en annan betalningsmetod.");
        return false;
      }

      // Stripe payment - use existing Payment component logic
      try {
        if (typeof window !== 'undefined' && window.document) {
          // Web Stripe implementation
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
        } else {
          // Native Stripe implementation
          let initPaymentSheet: any = null;
          let presentPaymentSheet: any = null;

          try {
            const stripeModule = require('@stripe/stripe-react-native');
            initPaymentSheet = stripeModule.initPaymentSheet;
            presentPaymentSheet = stripeModule.presentPaymentSheet;
          } catch (error) {
            console.warn('Stripe not available on this platform');
            showAlert("Fel", "Stripe är inte tillgängligt på denna plattform");
            return false;
          }

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
            console.error('Stripe init error:', initError);
            throw new Error(initError.message || 'Failed to initialize payment');
          }

          console.log('Payment sheet initialized, presenting...');

          // Present payment sheet
          const { error: presentError } = await presentPaymentSheet();

          if (presentError) {
            console.error('Stripe present error:', presentError);
            throw new Error(presentError.message || 'Payment failed');
          }

          console.log('Stripe payment successful');
          return true;
        }
      } catch (error: any) {
        console.error('Stripe payment error:', error);
        return false;
      }
    }

    return false;
  };

  const getFinalPrice = () => {
    const pointsValue = pointsToUse / 10; // Convert points to SEK
    return Math.max(0, estimatedPrice - pointsValue);
  };

  const createMoveCleaningOrder = async () => {
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
    if (cleaningAreas.length === 0) {
      showAlert("Fel", "Du måste välja minst ett städområde.");
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
        cleaningAreas,
        cleaningIntensity,
        cleaningSupplies,
        totalPrice: estimatedPrice,
        pointsUsed: pointsToUse,
        paymentMethod,
        notes,
        specialRequirements: notes,
      };

      // Handle payment processing based on method
      if (paymentMethod !== 'cash') {
        // For non-cash payments, process payment before creating order
        console.log(`Processing ${paymentMethod} payment for ${estimatedPrice} SEK`);
        const paymentSuccess = await processPayment(paymentMethod, estimatedPrice);
        if (!paymentSuccess) {
          showAlert("Betalningsfel", "Betalningen kunde inte genomföras. Försök igen.");
          setIsLoading(false);
          return;
        }
        console.log(`${paymentMethod} payment successful`);
      }
      // For cash payment, no processing needed - payment will be collected by driver

      // For cash payment or points-only payment, create order directly
      const result = await MoveCleaningOrderService.createMoveCleaningOrder(orderData);

      if (result.success) {
        // Send notification for cash payment or points-only payment
        await MoveCleaningOrderService.sendOrderConfirmationNotification(orderData.userId, orderData);
        showAlert(
          'Beställning skapad! 🎉',
          `Din flytt & städning har beställts.\\n\\nBeställningsnummer: ${result.order._id}\\nTotalt: ${estimatedPrice} SEK\\nPoäng använda: ${pointsToUse}`
        );
        router.back();
      } else {
        showAlert('Fel', result.error || 'Kunde inte skapa beställningen');
      }
    } catch (error: any) {
      console.error('Error creating move cleaning order:', error);
      showAlert('Fel', error.message || 'Kunde inte skapa beställningen');
    } finally {
      setIsLoading(false);
    }
  };

  const cleaningAreaOptions = [
    { id: 'kitchen', label: 'Kök' },
    { id: 'bathroom', label: 'Badrum' },
    { id: 'living_room', label: 'Vardagsrum' },
    { id: 'bedroom', label: 'Sovrum' },
    { id: 'hallway', label: 'Korridor' },
    { id: 'windows', label: 'Fönster' },
    { id: 'floors', label: 'Golv' },
    { id: 'entire_apartment', label: 'Hela lägenheten' },
  ];

  const toggleCleaningArea = (areaId: string) => {
    setCleaningAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
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
            Flytt och städning hjälp
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Fyll i dina uppgifter för att boka flytt och städning.
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
        <AutoText className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Informationen fylls automatiskt från din profil
        </AutoText>

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
            onPressIn={() => setHasElevator(!hasElevator)}
          >
            <AutoText className={hasElevator ? "text-white" : "text-black"}>
              {hasElevator ? "Ja" : "Nej"}
            </AutoText>
          </TouchableOpacity>
        </View>

        {/* Cleaning Areas */}
        <AutoText className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Städområden *
        </AutoText>
        <View className="mb-4">
          {cleaningAreaOptions.map((area) => (
            <TouchableOpacity
              key={area.id}
              className={`flex-row items-center p-3 mb-2 rounded-lg border ${
                cleaningAreas.includes(area.id)
                  ? "bg-blue-500 border-blue-500"
                  : isDark
                    ? "bg-dark-card border-gray-600"
                    : "bg-light-card border-gray-300"
              }`}
              onPress={() => toggleCleaningArea(area.id)}
            >
              <View
                className={`w-4 h-4 rounded border-2 mr-3 ${
                  cleaningAreas.includes(area.id)
                    ? "bg-white border-white"
                    : isDark
                      ? "border-gray-400"
                      : "border-gray-500"
                }`}
              >
                {cleaningAreas.includes(area.id) && (
                  <View className="w-2 h-2 bg-blue-500 rounded-sm m-0.5" />
                )}
              </View>
              <AutoText
                className={
                  cleaningAreas.includes(area.id)
                    ? "text-white font-semibold"
                    : isDark
                      ? "text-white"
                      : "text-black"
                }
              >
                {area.label}
              </AutoText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cleaning Intensity */}
        <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Städintensitet *
        </AutoText>
        <View className="mb-4">
          {[
            { value: 'basic', label: 'Grundläggande städning' },
            { value: 'deep', label: 'Djupstädning' },
            { value: 'move_out', label: 'Flyttstädning' }
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              className={`p-4 rounded-lg border mb-2 ${
                cleaningIntensity === option.value
                  ? "bg-blue-500 border-blue-500"
                  : isDark
                    ? "bg-dark-card border-gray-600"
                    : "bg-light-card border-gray-300"
              }`}
              onPress={() => setCleaningIntensity(option.value as any)}
            >
              <AutoText
                className={
                  cleaningIntensity === option.value
                    ? "text-white font-semibold"
                    : isDark
                      ? "text-white"
                      : "text-black"
                }
              >
                {option.label}
              </AutoText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cleaning Supplies */}
        <View className="flex-row items-center justify-between mb-4 mx-3">
          <AutoText className={isDark ? "text-white" : "text-gray-900"}>
            Städmaterial ingår?
          </AutoText>
          <TouchableOpacity
            className={`px-4 py-2 rounded-lg ${
              cleaningSupplies
                ? "bg-blue-500"
                : isDark
                  ? "bg-gray-300"
                  : "bg-gray-300"
            }`}
            onPressIn={() => setCleaningSupplies(!cleaningSupplies)}
          >
            <AutoText className={cleaningSupplies ? "text-white" : "text-black"}>
              {cleaningSupplies ? "Ja" : "Nej"}
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
          {userPoints > 0 && paymentMethod !== 'cash' && paymentMethod !== 'stripe' && (
            <>
              <View className="flex-row justify-between items-center mb-2">
                <AutoText className={isDark ? 'text-gray-400' : 'text-gray-600'}>Använd poäng:</AutoText>
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
              <AutoText className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Du har {userPoints} poäng tillgängliga
              </AutoText>
              {pointsToUse > 0 && (
                <View className="flex-row justify-between mb-2">
                  <AutoText className={isDark ? 'text-gray-400' : 'text-gray-600'}>Poängrabatt:</AutoText>
                  <AutoText className="text-green-500">-{(pointsToUse / 10).toFixed(0)} SEK</AutoText>
                </View>
              )}
            </>
          )}
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
          <TouchableOpacity
            className={`p-4 rounded-xl items-center ${
              isLoading ? 'bg-gray-400' : 'bg-blue-500'
            }`}
            onPress={createMoveCleaningOrder}
            disabled={isLoading}
          >
            <AutoText className="text-white font-semibold text-lg">
              {isLoading ? 'Skapar beställning...' : 'Bekräfta flytt & städning'}
            </AutoText>
          </TouchableOpacity>

          <View className="flex-row items-center justify-center mt-4">
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
            <AutoText className={`text-sm ml-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Säker betalning • 24/7 support • Professionella flyttare & städare
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
                {getFinalPrice()} SEK för din flytt & städning
              </AutoText>
            </View>

            {/* Payment Component */}
            <View className="mb-6">
              {Platform.OS === 'web' ? (
                <View className={`p-4 rounded-xl ${isDark ? "bg-dark-card" : "bg-light-card"}`}>
                  <AutoText className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Kortbetalning är inte tillgänglig på web. Välj en annan betalningsmetod.
                  </AutoText>
                </View>
              ) : (
                (() => {
                  const PaymentComponent = require("@/app/components/Payment").default;
                  return (
                    <PaymentComponent
                      amount={getFinalPrice()}
                      isDark={isDark}
                      onPaymentSuccess={async () => {
                        setShowPayment(false);
                        // Create order after successful payment
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
                            cleaningAreas,
                            cleaningIntensity,
                            cleaningSupplies,
                            totalPrice: estimatedPrice,
                            pointsUsed: pointsToUse,
                            paymentMethod,
                            notes,
                            specialRequirements: notes,
                          };

                          const result = await MoveCleaningOrderService.createMoveCleaningOrder(orderData);
                          if (result.success) {
                            // Send notification after successful order creation
                            await MoveCleaningOrderService.sendOrderConfirmationNotification(orderData.userId, orderData);
                            showAlert(
                              'Beställning skapad! 🎉',
                              `Din flytt & städning har beställts.\\n\\nBeställningsnummer: ${result.order._id}\\nTotalt: ${estimatedPrice} SEK\\nPoäng använda: ${pointsToUse}`
                            );
                            router.back();
                          }
                        } catch (error) {
                          console.error('Error creating order after payment:', error);
                          showAlert('Fel', 'Betalningen lyckades men beställningen kunde inte skapas. Kontakta support.');
                        }
                      }}
                    />
                  );
                })()
              )}
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