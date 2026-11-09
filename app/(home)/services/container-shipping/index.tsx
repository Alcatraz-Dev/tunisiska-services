import { currentDateLocale } from "@/app/lib/time";
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
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { Calendar } from "react-native-calendars";
import { useTheme } from "../../../context/ThemeContext";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { ContainerShippingOrderService } from "@/app/services/containerShippingOrderService";
import PaymentStripeJS from "@/app/components/PaymentStripeJS";
import CapacityCard from "@/app/components/trips/CapacityCard";
import { useThemeColors } from "@/app/theme";
import { shadows, spacing } from "@/app/theme/spacing";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateNow } from "@/app/hooks/useTranslation";

// 🔹 Fetch shipping schedules from Sanity
const fetchShippingSchedules = async () => {
  try {
    const { client } = await import("@/sanityClient");
    const schedules = await client.fetch(`
      *[_type == "containerShippingSchedule" && status == "available"] {
        ...,
        _id,
        route,
        departureTime,
        capacity,
        availableCapacity,
        vehicle,
      }
    `);
    return schedules;
  } catch (error) {
    console.error("Error fetching shipping schedules:", error);
    return [];
  }
};

export default function ShippingPage() {
  const { resolvedTheme } = useTheme();
  const theme = useThemeColors();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { user } = useUser();
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [shippingSchedules, setShippingSchedules] = useState<any[]>([]);

  const [containerSize, setContainerSize] = useState<"20ft" | "40ft">("20ft");
  const [usePoints, setUsePoints] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Recipient info
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "points" | "combined" | "cash"
  >("cash");
  const [pointsToUse, setPointsToUse] = useState(0);

  const [userPoints, setUserPoints] = useState(0);

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

  // Load shipping schedules on component mount
  useEffect(() => {
    const loadSchedules = async () => {
      const schedules = await fetchShippingSchedules();
      setShippingSchedules(schedules);
    };
    loadSchedules();
  }, []);

  // Refresh schedules when order is created
  const refreshSchedules = async () => {
    const schedules = await fetchShippingSchedules();
    setShippingSchedules(schedules);
    // Also refresh available trips if a date is selected
    if (selectedDate) {
      const trips = schedules.filter((s: any) => {
        const scheduleDate = new Date(s.departureTime)
          .toISOString()
          .split("T")[0];
        return scheduleDate === selectedDate;
      });
      setAvailableTrips(trips);
    }
  };

  // 🔹 When a date is selected → filter trips for that date
  const handleDateSelect = (day: any) => {
    // Prevent selection of past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(day.dateString);

    if (selectedDate < today) {
      showAlert(
        "Invalid date",
        "You cannot select a date in the past."
      );
      return;
    }

    setSelectedDate(day.dateString);
    const trips = shippingSchedules.filter((s) => {
      const scheduleDate = new Date(s.departureTime)
        .toISOString()
        .split("T")[0];
      return scheduleDate === day.dateString;
    });
    setAvailableTrips(trips);
    setSelectedTrip(null);
  };

  // 🔹 Markera datumen som finns i schemat
  const markedDates = shippingSchedules.reduce((acc: any, s) => {
    const scheduleDate = new Date(s.departureTime).toISOString().split("T")[0];
    acc[scheduleDate] = {
      marked: true,
      dotColor: "#F2761B",
      selected: selectedDate === scheduleDate,
      selectedColor: "#F2761B",
    };
    return acc;
  }, {});

  // 🔹 Calculate price
  const calculateTotal = () => {
    let total = containerSize === "20ft" ? 20000 : 35000;

    // Points discount
    if (
      (paymentMethod === "points" || paymentMethod === "combined") &&
      pointsToUse > 0
    ) {
      const discount = pointsToUse / 10; // Convert points to SEK
      total = Math.max(0, total - discount);
    }

    return Math.round(total);
  };

  const handleBooking = async () => {
    if (
      !selectedTrip ||
      !containerSize ||
      !customerName ||
      !customerPhone ||
      !recipientName ||
      !recipientPhone
    ) {
      return showAlert("Error", "Please fill in all required fields");
    }

    const totalCost = calculateTotal();

    // Process payment first
    const paymentSuccess = await processPayment(paymentMethod, totalCost);
    if (!paymentSuccess) {
      return;
    }

    // Create shipping order
    const orderData = {
      userId: user?.id || "",
      customerInfo: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      route: selectedTrip.route,
      pickupAddress:
        selectedTrip.route
          ?.split("_")[0]
          ?.replace("stockholm", "Stockholm")
          .replace("goteborg", "Göteborg")
          .replace("malmo", "Malmö") ||
        "Stockholm",
      deliveryAddress:
        selectedTrip.route?.split("_")[1]?.replace("tunis", "Tunis") || "Tunis",
      scheduledDateTime: selectedTrip.departureTime,
      packageDetails: {
        size: containerSize as "20ft" | "40ft",
        description: `Container ${containerSize}`,
        value: 100000,
      },
      shippingSpeed: "standard" as const,
      requiresSignature: true,
      totalPrice: totalCost,
      pointsUsed:
        paymentMethod === "points" || paymentMethod === "combined"
          ? pointsToUse
          : 0,
      paymentMethod,
      notes: `Recipient: ${recipientName} (${recipientPhone})`,
    };

    const result = await ContainerShippingOrderService.createShippingOrder(orderData);

    if (result.success) {
      showAlert(
        "Booking confirmed",
        `Your shipping order has been created! Order ID: ${result.order?._id?.substring(0, 8)}`
      );
      // Refresh schedules to update available capacity
      await refreshSchedules();
      router.back();
    } else {
      showAlert("Error", "Could not create booking: " + result.error);
    }
  };

  // Payment processing function
  const processPayment = async (
    method: string,
    amount: number
  ): Promise<boolean> => {
    console.log(`Processing ${method} payment for ${amount} SEK`);

    if (method === "cash") {
      return true;
    }

    if (method === "points") {
      if (!user) {
        showAlert("Error", "You must be signed in");
        return false;
      }

      const pointsNeeded = amount * 10;
      const currentPoints = (user.unsafeMetadata as any)?.points || 0;

      if (currentPoints < pointsNeeded) {
        showAlert(
          "Not enough points",
          `You have ${currentPoints} points but need ${pointsNeeded} points for this payment.`
        );
        return false;
      }

      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsNeeded,
          },
        });
        setUserPoints(currentPoints - pointsNeeded);
        console.log(
          `Points payment successful: ${pointsNeeded} points deducted`
        );
        return true;
      } catch (error) {
        console.error("Points payment failed:", error);
        return false;
      }
    }

    if (method === "combined") {
      if (!user) {
        showAlert("Error", "You must be signed in");
        return false;
      }

      const maxPointsValue = Math.min(amount * 0.5, 100);
      const pointsToUseValue = Math.min(maxPointsValue * 10, userPoints);
      const pointsValue = pointsToUseValue / 10;
      const remainingAmount = amount - pointsValue;

      const currentPoints = (user.unsafeMetadata as any)?.points || 0;

      if (currentPoints < pointsToUseValue) {
        showAlert(
          "Not enough points",
          `You have ${currentPoints} points but need ${pointsToUseValue} points for this combined payment.`
        );
        return false;
      }

      try {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsToUseValue,
          },
        });
        setUserPoints(currentPoints - pointsToUseValue);

        if (remainingAmount > 0) {
          const stripeSuccess = await processPayment("stripe", remainingAmount);
          if (!stripeSuccess) {
            // Refund points if Stripe fails
            await user.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                points:
                  ((user.unsafeMetadata as any)?.points || 0) +
                  pointsToUseValue,
              },
            });
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("Combined payment failed:", error);
        return false;
      }
    }

    if (method === "stripe") {
      if (Platform.OS === "web") {
        console.log("Stripe payment not available on web");
        return false;
      }
      // Stripe removed - simulate payment success for native
      console.log("Stripe payment simulated for amount:", amount);
      return true;
    }

    return false;
  };

  return (
    <BookingScreen title="Container shipping" subtitle="Plan a larger shipment between Sweden and Tunisia">

      <BookingScroll>
        {/* Kalender */}
        <BookingSection title="Select a departure date" subtitle="Dates with a scheduled departure are marked" icon="calendar-outline" />
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            backgroundColor: theme.surface,
            padding: 16,
            overflow: "hidden",
            ...shadows.md,
          }}
        >
          <Calendar
            key={isDark ? "dark" : "light"} // Force re-render on theme change
            markedDates={markedDates}
            onDayPress={handleDateSelect}
            style={{ borderRadius: 12 }}
            theme={{
              calendarBackground: theme.surface,
              textSectionTitleColor: theme.textTertiary,
              dayTextColor: theme.textPrimary,
              monthTextColor: theme.textPrimary,
              arrowColor: theme.textSecondary,
              todayTextColor: theme.accent,
              selectedDayBackgroundColor: theme.accent,
              selectedDayTextColor: "#fff",
              textDisabledColor: theme.textQuaternary,
              dotColor: theme.accent,
              selectedDotColor: "#fff",
              textMonthFontSize: 17,
              textMonthFontWeight: "700",
              textDayFontSize: 15,
              textDayHeaderFontSize: 11,
              textDayHeaderFontWeight: "600",
            }}
          />
        </View>

        {/* Trips for the selected date */}
        {availableTrips.length > 0 && (
          <View className="mt-6">
            <BookingSection title="Available departures" icon="time-outline" />
            {availableTrips.map((trip, index) => {
              const route = trip.route
                ?.replace("_", " → ")
                .replace("stockholm", "Stockholm")
                .replace("goteborg", "Göteborg")
                .replace("malmo", "Malmö")
                .replace("tunis", "Tunis");
              const departure = new Date(trip.departureTime).toLocaleTimeString(currentDateLocale(), {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <View key={index} style={{ marginBottom: spacing.sm }}>
                  <BookingChoice
                    selected={selectedTrip === trip}
                    onPress={() => setSelectedTrip(trip)}
                    title={route || "Unknown route"}
                    subtitle={`${departure} · ${trip.vehicle?.replace("_", " ") || "Unknown"}`}
                  >
                    <CapacityCard
                      capacity={trip.capacity}
                      available={trip.availableCapacity}
                      tone={isDark ? "dark" : "light"}
                      compact
                    />
                  </BookingChoice>
                </View>
              );
            })}
          </View>
        )}


        {/* Customer Information */}
        {selectedTrip && (
          <>
            <BookingSection title="Sender information" />

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

            {/* Recipient Information */}
            <BookingSection title="Recipient information" />
            <BookingInput
              label="Recipient name"
              required
              placeholder="Recipient name"
              value={recipientName}
              onChangeText={setRecipientName}
            />

            <BookingInput
              label="Recipient phone"
              required
              placeholder="070-123 45 67"
              keyboardType="phone-pad"
              value={recipientPhone}
              onChangeText={setRecipientPhone}
            />

            <BookingSection title="Container size" icon="cube-outline" />

            <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <BookingChoice
                  selected={containerSize === "20ft"}
                  onPress={() => setContainerSize("20ft")}
                  title="20ft container"
                  subtitle="Smaller loads"
                />
              </View>
              <View style={{ flex: 1 }}>
                <BookingChoice
                  selected={containerSize === "40ft"}
                  onPress={() => setContainerSize("40ft")}
                  title="40ft container"
                  subtitle="Larger loads"
                />
              </View>
            </View>

            <BookingSection title="Payment method" icon="wallet-outline" />
                  <PaymentMethodPicker
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    points={userPoints}
                    pointsUsed={pointsToUse}
                    onPointsChange={(value: number) => setPointsToUse(value)}
                    cashLabel="Cash on delivery"
                    cashHint="Pay when your container is delivered"
                    cardHint="Pay securely by card now"
                  />

            <BookingSummary
              rows={[{ label: "Base price", value: calculateTotal() + " SEK" }]}
              total={calculateTotal() + " SEK"}
            />

          </>
        )}
      </BookingScroll>

      {selectedTrip && (
        <BookingFooter total={calculateTotal() + " SEK"}>
            {/* Booking button */}
            {paymentMethod === "stripe" ||
            (paymentMethod === "combined" && calculateTotal() > 0) ? (
              <PaymentStripeJS
                amount={calculateTotal()}
                points={calculateTotal() * 10}
                isDark={isDark}
                service="Shipping"
                customText={`${translateNow("Pay", language)} ${calculateTotal()} SEK ${translateNow("for", language)} ${translateNow("Container shipping", language)}`}
                customStyle={{
                  backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isDark ? "#3C3C3E" : "#E5E5E5",
                }}
                disabled={
                  !selectedTrip ||
                  !containerSize ||
                  !customerName.trim() ||
                  !customerPhone.trim() ||
                  !recipientName.trim() ||
                  !recipientPhone.trim()
                }
                onPaymentSuccess={async (
                  purchasedPoints: number,
                  amountPaid: number
                ) => {
                  await handleBooking();
                }}
              />
            ) : (
              <PrimaryButton
                label="Confirm booking"
                onPress={handleBooking}
                disabled={
                  !selectedTrip ||
                  !containerSize ||
                  !customerName.trim() ||
                  !customerPhone.trim() ||
                  !recipientName.trim() ||
                  !recipientPhone.trim()
                }
              />
            )}
          <BookingFooterNote text="Secure payment • 24/7 support • Professional service" />
        </BookingFooter>
      )}
    </BookingScreen>
  );
}
