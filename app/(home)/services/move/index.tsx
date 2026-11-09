import {
  View,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from "react-native";
import {
  BookingScreen,
  BookingScroll,
  BookingSection,
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
import { useTheme } from "../../../context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";
import ThemedText from "@/app/components/ui/ThemedText";
import MoveCategoryCheckbox from "@/app/components/MoveCategoryCheckbox";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { useUser } from "@clerk/clerk-expo";
import { MoveOrderService } from "@/app/services/moveOrderService";
import PaymentStripeJS from "@/app/components/PaymentStripeJS";
import { currentDateLocale } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateNow } from "@/app/hooks/useTranslation";
// Payment component removed - Stripe dependency eliminated

export default function Move() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const { language } = useLanguage();
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
          'Order created! 🎉',
          `Your move has been booked.\\n\\nOrder number: ${result.order._id}\\nTotal: ${estimatedPrice} SEK\\nPoints used: ${pointsToUse}`
        );
        router.back();
      } else {
        showAlert('Error', result.error || 'Could not create order');
      }
    } catch (error: any) {
      console.error('Error creating move order:', error);
      showAlert('Error', error.message || 'Could not create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BookingScreen title="Moving service" subtitle="Tell us about your move">
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
              service="Flytt"
              customText={`${translateNow("Pay", language)} ${getFinalPrice()} SEK ${translateNow("for", language)} ${translateNow("Moving service", language)}`}
             
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
            <PrimaryButton
              label={isLoading ? "Creating order..." : "Confirm moving booking"}
              onPress={() => createMoveOrder()}
              loading={isLoading}
              disabled={isLoading || !customerName.trim() || !customerPhone.trim() || !pickup.trim() || !dropoff.trim() || !numPersons.trim() || parseInt(numPersons) < 1 || !numItems.trim() || parseInt(numItems) < 1 || selectedCategories.length === 0}
            />
          )}

          <BookingFooterNote text="Secure payment • 24/7 support • Professional movers" />

      </BookingFooter>

        {/* Payment Modal */}
        {showPayment && (
          <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(6,16,31,0.55)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.gutter,
          }}
        >
            <View
            style={{
              width: "100%",
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
              backgroundColor: theme.surface,
              padding: spacing.xl,
              gap: spacing.lg,
            }}
          >
              {/* Header */}
              <View style={{ alignItems: "center", gap: spacing.xs }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.primarySoft,
                    marginBottom: spacing.xs,
                  }}
                >
                  <AppIcon name="card-outline" size={26} color={theme.primary} />
                </View>
                <ThemedText variant="title3">Complete payment</ThemedText>
                <ThemedText variant="bodySm" tone="secondary" style={{ textAlign: "center" }}>
                  {`${getFinalPrice()} SEK for your moving booking`}
                </ThemedText>
              </View>

              {/* Payment */}
              <PrimaryButton
                label={`Confirm payment (${getFinalPrice()} SEK)`}
                onPress={async () => {
                  setShowPayment(false);
                  await createMoveOrder(true);
                }}
              />

              {/* Cancel */}
              <PrimaryButton
                variant="secondary"
                label="Cancel payment"
                onPress={() => setShowPayment(false)}
              />

              {/* Security Note */}
              <BookingFooterNote text="Secure payment via Stripe" />
            </View>
          </View>
        )}
    </BookingScreen>
  );
}
