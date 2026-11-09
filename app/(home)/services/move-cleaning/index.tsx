import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import {
  BookingScreen,
  BookingScroll,
  BookingSection,
  BookingChoice,
  BookingInput,
  BookingPickerField,
  BookingToggle,
  PaymentMethodPicker,
  BookingSummary,
  BookingFooter,
  BookingFooterNote,
} from "@/app/components/booking/BookingKit";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/app/context/ThemeContext";
import { spacing } from "@/app/theme/spacing";
import MoveCategoryCheckbox from "@/app/components/MoveCategoryCheckbox";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { useUser } from "@clerk/clerk-expo";
import { MoveCleaningOrderService } from "@/app/services/moveCleaningOrderService";
import PaymentStripeJS from "@/app/components/PaymentStripeJS";
import { currentDateLocale } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateNow } from "@/app/hooks/useTranslation";

// Stripe removed - payment functions updated

export default function MoveCleaning() {
  const { resolvedTheme } = useTheme();
  const { language } = useLanguage();
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
          showAlert(translateNow("Not enough points", language), translateNow("You have {have} points but need {need} points for this payment. Would you like to top up?", language).replace("{have}", String(currentPoints)).replace("{need}", String(pointsNeeded)), [
            { text: translateNow("Cancel", language), style: "cancel" },
            {
              text: translateNow("Top up points", language),
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
          showAlert(translateNow("Not enough points", language), translateNow("You have {have} points but need {need} points for this payment. Would you like to top up?", language).replace("{have}", String(currentPoints)).replace("{need}", String(pointsToUse)), [
            { text: translateNow("Cancel", language), style: "cancel" },
            {
              text: translateNow("Top up points", language),
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
        console.log('Stripe payment not available on web');
        return false;
      }
      // Stripe removed - simulate payment success for native
      console.log('Stripe payment simulated for amount:', amount);
      return true;
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
      showAlert("Error", "Name is required.");
      return;
    }
    if (!customerPhone.trim()) {
      showAlert("Error", "Phone number is required.");
      return;
    }
    if (!pickup.trim()) {
      showAlert("Error", "Pickup location is required.");
      return;
    }
    if (!dropoff.trim()) {
      showAlert("Error", "Destination is required.");
      return;
    }
    if (!numPersons.trim() || parseInt(numPersons) < 1) {
      showAlert("Error", "Number of people must be at least 1.");
      return;
    }
    if (!numItems.trim() || parseInt(numItems) < 1) {
      showAlert("Error", "Number of items must be at least 1.");
      return;
    }
    if (selectedCategories.length === 0) {
      showAlert("Error", "Please select at least one item type.");
      return;
    }
    if (cleaningAreas.length === 0) {
      showAlert("Error", "Please select at least one cleaning area.");
      return;
    }

    // Date validation - ensure not in the past
    const now = new Date();
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

    if (scheduledDateTime <= now) {
      showAlert("Error", "Booking time must be in the future.");
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
          showAlert("Payment failed", "Payment could not be completed. Please try again.");
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
          'Order created! 🎉',
          `Your move & cleaning has been booked.\\n\\nOrder number: ${result.order._id}\\nTotal: ${estimatedPrice} SEK\\nPoints used: ${pointsToUse}`
        );
        router.back();
      } else {
        showAlert('Error', result.error || 'Could not create order');
      }
    } catch (error: any) {
      console.error('Error creating move cleaning order:', error);
      showAlert('Error', error.message || 'Could not create order');
    } finally {
      setIsLoading(false);
    }
  };

  const cleaningAreaOptions = [
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'bathroom', label: 'Badrum' },
    { id: 'living_room', label: 'Vardagsrum' },
    { id: 'bedroom', label: 'Sovrum' },
    { id: 'hallway', label: 'Korridor' },
    { id: 'windows', label: 'Windows' },
    { id: 'floors', label: 'Golv' },
    { id: 'entire_apartment', label: 'Entire apartment' },
  ];

  const toggleCleaningArea = (areaId: string) => {
    setCleaningAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  return (
    <BookingScreen title="Moving & cleaning" subtitle="Moving and cleaning in one booking">
      <BookingScroll>
        {/* Customer Information */}
        <BookingSection title="Contact details" />

        <BookingInput
          label="Full name"
          required
          placeholder="Your name"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <AutoText className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Details are filled automatically from your profile
        </AutoText>

        <BookingInput
          label="Phone number"
          required
          placeholder="070-123 45 67"
          keyboardType="phone-pad"
          value={customerPhone}
          onChangeText={setCustomerPhone}
        />

        <BookingInput
          label="Email"
          hint="Optional"
          placeholder="your@email.com"
          keyboardType="email-address"
          value={customerEmail}
          onChangeText={setCustomerEmail}
        />

        <BookingSection title="Move details" icon="cube-outline" />

        {/* Pickup */}
        <BookingInput
          label="Pickup location"
          required
          placeholder="E.g. Stockholm"
          value={pickup}
          onChangeText={setPickup}
        />

        {/* Dropoff */}
        <BookingInput
          label="Destination"
          required
          placeholder="E.g. Uppsala"
          value={dropoff}
          onChangeText={setDropoff}
        />

        <BookingSection title="Schedule" icon="calendar-outline" />

        {/* Date & Time */}
        <BookingPickerField
          label="Select date"
          required
          icon="calendar-outline"
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          {date.toLocaleDateString(currentDateLocale())}
        </BookingPickerField>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            locale={currentDateLocale(language).replace("-", "_")}
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

        <BookingPickerField
          label="Select time"
          required
          icon="time-outline"
          onPress={() => setShowTimePicker(!showTimePicker)}
        >
          {time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          })}
        </BookingPickerField>
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            locale={currentDateLocale(language).replace("-", "_")}
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
        <BookingInput
          label="Number of people"
          required
          placeholder="1"
          keyboardType="numeric"
          value={numPersons}
          onChangeText={setNumPersons}
        />

        {/* Number of items */}
        <BookingInput
          label="Number of items"
          placeholder="E.g. 10"
          keyboardType="numeric"
          value={numItems}
          onChangeText={setNumItems}
        />

        {/* Item Type */}
        <MoveCategoryCheckbox
          isDark={isDark}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
        />

        {/* Elevator */}
        <BookingToggle label="Elevator available?" value={hasElevator} onChange={setHasElevator} />

        <BookingSection title="Cleaning areas" subtitle="Choose every room that needs cleaning" icon="sparkles-outline" />

        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {cleaningAreaOptions.map((area) => (
            <BookingChoice
              key={area.id}
              selected={cleaningAreas.includes(area.id)}
              onPress={() => toggleCleaningArea(area.id)}
              title={area.label}
            />
          ))}
        </View>

        <BookingSection title="Cleaning intensity" icon="options-outline" />

        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {[
            { value: "basic", label: "Basic cleaning" },
            { value: "deep", label: "Deep cleaning" },
            { value: "move_out", label: "Move-out cleaning" },
          ].map((option) => (
            <BookingChoice
              key={option.value}
              selected={cleaningIntensity === option.value}
              onPress={() => setCleaningIntensity(option.value as any)}
              title={option.label}
            />
          ))}
        </View>

        {/* Cleaning Supplies */}
        <BookingToggle label="Cleaning supplies included?" value={cleaningSupplies} onChange={setCleaningSupplies} />

        <BookingSection title="Additional information" icon="create-outline" />

        {/* Notes */}
        <BookingInput
          label="Extra information"
          placeholder="Special requests or instructions..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <BookingSection title="Payment method" icon="wallet-outline" />
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                points={userPoints}
                pointsUsed={pointsToUse}
                onPointsChange={(value) => handlePointsChange(String(value))}
                cashLabel="Cash on moving day"
                cashHint="Pay the movers when the job is done"
                cardHint="Pay securely by card now"
              />

        <BookingSummary
          rows={[{ label: "Base price", value: estimatedPrice + " SEK" }]}
          total={getFinalPrice() + " SEK"}
        />

      </BookingScroll>

      <BookingFooter total={getFinalPrice() + " SEK"}>
        {/* Confirm Booking */}
          {paymentMethod === 'stripe' || (paymentMethod === 'combined' && getFinalPrice() > 0) ? (
            <PaymentStripeJS
              amount={getFinalPrice()}
              points={getFinalPrice() * 10}
              isDark={isDark}
              service="Moving & Cleaning"
              customText={`${translateNow("Pay", language)} ${getFinalPrice()} SEK ${translateNow("for", language)} ${translateNow("Moving & cleaning", language)}`}
           
              customStyle={{
                backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                borderWidth: 1,
                borderColor: isDark ? "#3C3C3E" : "#E5E5E5",
              }}
              disabled={!customerName.trim() || !customerPhone.trim() || !pickup.trim() || !dropoff.trim() || !numPersons.trim() || parseInt(numPersons) < 1 || !numItems.trim() || parseInt(numItems) < 1 || selectedCategories.length === 0 || cleaningAreas.length === 0}
              onPaymentSuccess={async (purchasedPoints: number, amountPaid: number) => {
                await createMoveCleaningOrder();
              }}
            />
          ) : (
            <PrimaryButton
              label={isLoading ? "Creating order..." : "Confirm move & cleaning"}
              onPress={createMoveCleaningOrder}
              loading={isLoading}
              disabled={isLoading || !customerName.trim() || !customerPhone.trim() || !pickup.trim() || !dropoff.trim() || !numPersons.trim() || parseInt(numPersons) < 1 || !numItems.trim() || parseInt(numItems) < 1 || selectedCategories.length === 0 || cleaningAreas.length === 0}
            />
          )}

          <BookingFooterNote text="Secure payment • 24/7 support • Professional movers & cleaners" />

      </BookingFooter>

    </BookingScreen>
  );
}
