import PaymentStripeJS from "@/app/components/PaymentStripeJS";
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
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { useTheme } from "@/app/context/ThemeContext";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import {
  TaxiOrderData,
  TaxiOrderService,
} from "@/app/services/taxiOrderService";
import { showAlert } from "@/app/utils/showAlert";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { currentDateLocale } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateNow } from "@/app/hooks/useTranslation";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

export default function Taxi() {
  const { resolvedTheme } = useTheme();
  const { language } = useLanguage();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();

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
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "points" | "combined" | "cash"
  >("cash");
  const [currentUserPoints, setCurrentUserPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Pre-fill user information from Clerk
  useEffect(() => {
    if (user) {
      const fullName = user.fullName || user.firstName || "";
      const phoneNumber = user.phoneNumbers?.[0]?.phoneNumber || "";
      const emailAddress = user.primaryEmailAddress?.emailAddress || "";
      const userPoints = (user.unsafeMetadata as any)?.points || 0;

      if (fullName && !passengerName) setPassengerName(fullName);
      if (phoneNumber && !phone) setPhone(phoneNumber);
      if (emailAddress && !email) setEmail(emailAddress);
      setCurrentUserPoints(userPoints);
    }
  }, [user]);

  // Calculate estimated price whenever relevant fields change
  useEffect(() => {
    const distance = 15; // km - placeholder, should use maps API in production
    const scheduledDateTime = date
      ? new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          time.getHours(),
          time.getMinutes()
        ).toISOString()
      : undefined;
    const passengerCount = parseInt(passengers) || 1;
    const price = TaxiOrderService.calculateTaxiPrice(
      distance,
      isRoundTrip,
      scheduledDateTime,
      passengerCount
    );
    setEstimatedPrice(price);
  }, [isRoundTrip, date, time, passengers]);

  const handlePointsChange = (points: string) => {
    const pointsNum = parseInt(points) || 0;
    const maxPoints = Math.min(currentUserPoints, estimatedPrice * 10); // Assuming 1 SEK = 10 points
    setPointsToUse(Math.min(pointsNum, maxPoints));
  };

  const getFinalPrice = () => {
    const pointsValue = pointsToUse / 10; // Convert points to SEK
    return Math.max(0, estimatedPrice - pointsValue);
  };

  // Real payment processing function
  const processPayment = async (
    method: string,
    amount: number
  ): Promise<boolean> => {
    console.log(`Processing ${method} payment for ${amount} SEK`);

    if (method === "cash") {
      // Cash payment - no processing needed, payment collected by driver
      return true;
    }

    if (method === "points") {
      // Points payment - deduct from user points
      // Assuming 1 point = 0.1 SEK, so amount * 10 points needed
      const pointsNeeded = amount * 10;
      console.log(`Deducting ${pointsNeeded} points from user`);

      try {
        // Use the user from the component state (already available)
        if (!user) {
          throw new Error("User not authenticated");
        }

        const currentPoints = (user.unsafeMetadata as any)?.points || 0;

        if (currentPoints < pointsNeeded) {
          showAlert(
            translateNow("Not enough points", language),
            translateNow(
              "You have {have} points but need {need} points for this payment. Would you like to top up?",
              language,
            )
              .replace("{have}", String(currentPoints))
              .replace("{need}", String(pointsNeeded)),
            [
              { text: translateNow("Cancel", language), style: "cancel" },
              {
                text: translateNow("Top up points", language),
                onPress: () => {
                  router.push("/profile/wallet");
                },
              },
            ]
          );
          return false;
        }

        // Update user points in Clerk
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsNeeded,
          },
        });

        // Update local state
        setCurrentUserPoints(currentPoints - pointsNeeded);

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
      // Combined payment - calculate points and remaining amount for Stripe
      const maxPointsValue = Math.min(amount * 0.5, 100); // Max 50% or 100 SEK with points
      const pointsToUse = Math.min(maxPointsValue * 10, 1000); // Max 1000 points
      const pointsValue = pointsToUse / 10;
      const remainingAmount = amount - pointsValue;

      console.log(
        `Combined payment: ${pointsValue} SEK with points, ${remainingAmount} SEK with Stripe`
      );

      // First deduct points
      try {
        if (!user) {
          throw new Error("User not authenticated");
        }

        const currentPoints = (user.unsafeMetadata as any)?.points || 0;

        if (currentPoints < pointsToUse) {
          showAlert(
            translateNow("Not enough points", language),
            translateNow(
              "You have {have} points but need {need} points for this payment. Would you like to top up?",
              language,
            )
              .replace("{have}", String(currentPoints))
              .replace("{need}", String(pointsToUse)),
            [
              { text: translateNow("Cancel", language), style: "cancel" },
              {
                text: translateNow("Top up points", language),
                onPress: () => {
                  router.push("/profile/wallet");
                },
              },
            ]
          );
          return false;
        }

        // Deduct points first
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            points: currentPoints - pointsToUse,
          },
        });

        console.log(`Points deducted: ${pointsToUse} points`);

        // Then process Stripe payment for remaining amount
        if (remainingAmount > 0) {
          const stripeSuccess = await processPayment("stripe", remainingAmount);
          if (!stripeSuccess) {
            // Refund points if Stripe fails
            await user.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                points:
                  ((user.unsafeMetadata as any)?.points || 0) + pointsToUse,
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
        // Web Stripe implementation
        try {
          const { loadStripe } = require("@stripe/stripe-js");
          const stripe = await loadStripe(
            process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
              "pk_live_51RBxpfC4Cy0OOwANyH44YXC4575IBb61dzwArC9MdhDmynSQTJ1gsLmfk8Az4SyhYiVjmyNZ3YOwHE1agKLGvajy00Py46dvKO"
          );

          if (!stripe) {
            showAlert("Error", "Stripe is not available on web");
            return false;
          }

          const { getBestServerURL } = await import("@/app/config/stripe");
          const serverUrl = await getBestServerURL();

          const response = await fetch(`${serverUrl}/create-checkout-session`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount,
              currency: "sek",
              successUrl: window.location.origin + "/success",
              cancelUrl: window.location.origin + "/cancel",
              isDark: isDark,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Server error response:", errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          console.log("Checkout session created:", data);

          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });

          if (error) {
            console.error("Stripe redirect error:", error);
            showAlert("Payment failed", error.message);
            return false;
          }

          console.log("Stripe web payment successful");
          return true;
        } catch (error: any) {
          console.error("Stripe web payment failed:", error);
          showAlert("Error", "Payment failed: " + error.message);
          return false;
        }
      }

      // Stripe payment - use existing Payment component logic
      try {
        // Get server URL
        const { getBestServerURL } = await import("@/app/config/stripe");
        const serverUrl = await getBestServerURL();

        // Fetch payment sheet params
        const response = await fetch(`${serverUrl}/payment-sheet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount, currency: "sek" }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        // Since Stripe is not available on web, just show message
        console.log("Stripe payment not available on web");
        return false;
      } catch (error: any) {
        console.error("Stripe payment error:", error);
        return false;
      }
    }

    return false;
  };

  // Send order confirmation notification
  const sendOrderConfirmationNotification = async (
    userId: string,
    orderData: TaxiOrderData
  ) => {
    try {
      const notificationPayload = {
        title: "Taxi booking confirmed! 🚕",
        message: `Your taxi from ${orderData.pickupAddress} to ${orderData.destinationAddress} is booked for ${new Date(orderData.scheduledDateTime).toLocaleString("en-GB")}. Total price: ${orderData.totalPrice} SEK (${orderData.paymentMethod === "cash" ? "Cash payment" : "Prepaid"}).`,
        subID: userId,
        pushData: {
          orderId: "new-order", // This would be the actual order ID
          type: "taxi_booking_confirmed",
          paymentMethod: orderData.paymentMethod,
        },
      };

      const result =
        await nativeNotifyAPI.sendNotification(notificationPayload);
      if (result.success) {
        console.log("Order confirmation notification sent successfully");
      } else {
        console.error(
          "Failed to send order confirmation notification:",
          result.error
        );
      }
    } catch (error) {
      console.error("Error sending order confirmation notification:", error);
    }
  };

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
      showAlert("Error", "You must be signed in to book.");
      return;
    }

    // Required field validation
    if (!pickup || !dropoff || !passengerName || !phone || !passengers) {
      showAlert("Error", "Please fill in all required fields.");
      return;
    }

    // Passenger count validation (1-4 as per schema)
    const passengerCount = parseInt(passengers);
    if (isNaN(passengerCount) || passengerCount < 1 || passengerCount > 4) {
      showAlert("Error", "Passengers must be between 1 and 4.");
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

    // Round trip validation
    if (isRoundTrip) {
      if (!returnDate || !returnTime) {
        showAlert(
          "Error",
          "Please select a return date and time for round trips."
        );
        return;
      }

      const returnDateTime = new Date(returnDate);
      returnDateTime.setHours(
        returnTime.getHours(),
        returnTime.getMinutes(),
        0,
        0
      );

      if (returnDateTime <= scheduledDateTime) {
        showAlert("Error", "Return time must be after pickup time.");
        return;
      }
    }

    // Email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("Error", "Invalid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // Combine date and time for scheduledDateTime
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

      // Calculate estimated distance (placeholder - in real app, use maps API)
      const estimatedDistance = 15; // km

      // Calculate price with scheduled time for surcharges and passenger count
      const totalPrice = TaxiOrderService.calculateTaxiPrice(
        estimatedDistance,
        isRoundTrip,
        scheduledDateTime.toISOString(),
        parseInt(passengers)
      );

      // Handle payment processing based on method
      if (paymentMethod !== "cash") {
        // For non-cash payments, process payment before creating order
        console.log(
          `Processing ${paymentMethod} payment for ${totalPrice} SEK`
        );
        const paymentSuccess = await processPayment(paymentMethod, totalPrice);
        if (!paymentSuccess) {
          showAlert(
            "Payment failed",
            "Payment could not be completed. Please try again."
          );
          setIsLoading(false);
          return;
        }
        console.log(`${paymentMethod} payment successful`);
      }
      // For cash payment, no processing needed - payment will be collected by driver

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
        returnDateTime: isRoundTrip
          ? (() => {
              const returnDateTime = new Date(returnDate);
              returnDateTime.setHours(
                returnTime.getHours(),
                returnTime.getMinutes(),
                0,
                0
              );
              return returnDateTime.toISOString();
            })()
          : undefined,
        estimatedDistance,
        totalPrice,
        paymentMethod,
        pointsUsed: pointsToUse,
        notes: notes || undefined,
      };

      const result = await TaxiOrderService.createTaxiOrder(orderData);

      if (result.success) {
        // Send notification to user
        await sendOrderConfirmationNotification(userId, orderData);

        showAlert(
          "Booking confirmed",
          "Your taxi is booked! You will receive a confirmation soon."
        );
        // Reset form
        setPickup("");
        setDropoff("");
        setPassengerName("");
        setPhone("");
        setEmail("");
        setPassengers("1");
        setNotes("");
        setIsRoundTrip(false);
        setPaymentMethod("cash");
        router.back();
      } else {
        showAlert(
          "Booking failed",
          result.error || "Could not create booking. Please try again."
        );
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      showAlert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BookingScreen title="Airport taxi" subtitle="Reliable airport transfer">

      {/* Form */}
      <BookingScroll>
        <BookingSection title="Contact details" subtitle="We use these details to confirm your booking" icon="person-outline" />

        {/* Passenger Name */}
        <BookingInput
          label="Booking name"
          required
          placeholder="E.g. John Doe"
          value={passengerName}
          onChangeText={setPassengerName}
        />
        <AutoText
          className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        >
          Details are filled automatically from your profile
        </AutoText>

        {/* Phone */}
        <BookingInput
          label="Phone number"
          required
          placeholder="E.g. +46 70 123 45 67"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {/* Email */}
        <BookingInput
          label="Email address"
          placeholder="E.g. john@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <BookingSection title="Trip details" icon="car-outline" />

        {/* Pickup */}
        <BookingInput
          label="Pickup location"
          required
          placeholder="E.g. Arlanda, Stockholm"
          value={pickup}
          onChangeText={setPickup}
        />

        {/* Drop-off */}
        <BookingInput
          label="Destination"
          required
          placeholder="E.g. Bromma, Stockholm"
          value={dropoff}
          onChangeText={setDropoff}
        />

        <BookingSection title="Schedule" icon="calendar-outline" />

        {/* Date picker */}
        <BookingPickerField
          label="Date"
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
            textColor={isDark ? "#fff" : "#000"} // iOS only
            onChange={handleDateChange}
          />
        )}

        {/* Time picker */}
        <BookingPickerField
          label="Time"
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
            textColor={isDark ? "#fff" : "#000"} // iOS only
            onChange={handleTimeChange}
          />
        )}

        {/* Passengers */}
        <BookingInput
          label="Passengers (1-4)"
          required
          placeholder="1"
          value={passengers}
          onChangeText={(text) => {
          // Only allow numbers 1-4
          const num = parseInt(text);
          if (text === "" || (num >= 1 && num <= 4)) {
          setPassengers(text);
          }
          }}
          keyboardType="numeric"
          maxLength={1}
        />

        <BookingToggle label="Round trip" value={isRoundTrip} onChange={setIsRoundTrip} />

        {/* Return Date/Time - only show if round trip */}
        {isRoundTrip && (
          <>
            <BookingPickerField
              label="Return date"
              required
              icon="calendar-outline"
              onPress={() => setShowReturnDatePicker(!showReturnDatePicker)}
            >
              {returnDate.toLocaleDateString(currentDateLocale())}
            </BookingPickerField>
            {showReturnDatePicker && (
              <DateTimePicker
                value={returnDate}
                mode="date"
                locale={currentDateLocale(language).replace("-", "_")}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant={isDark ? "dark" : "light"}
                textColor={isDark ? "#fff" : "#000"}
                onChange={handleReturnDateChange}
              />
            )}

            <BookingPickerField
              label="Return time"
              required
              icon="time-outline"
              onPress={() => setShowReturnTimePicker(!showReturnTimePicker)}
            >
              {returnTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              })}
            </BookingPickerField>
            {showReturnTimePicker && (
              <DateTimePicker
                value={returnTime}
                mode="time"
                locale={currentDateLocale(language).replace("-", "_")}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant={isDark ? "dark" : "light"}
                textColor={isDark ? "#fff" : "#000"}
                onChange={handleReturnTimeChange}
              />
            )}
          </>
        )}

        <BookingSection title="Additional information" icon="create-outline" />
        <BookingInput
          label="Special requests or instructions"
          hint="Child seat, extra luggage, access codes…"
          placeholder="Anything the driver should know?"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <BookingSection title="Payment method" icon="wallet-outline" />
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                points={currentUserPoints}
                pointsUsed={pointsToUse}
                onPointsChange={(value) => handlePointsChange(String(value))}
                cashLabel="Cash on pickup"
                cashHint="Pay the driver when you are picked up"
                cardHint="Pay securely by card now"
              />

        <BookingSummary
          rows={[{ label: "Base price", value: estimatedPrice + " SEK" }]}
          total={(paymentMethod === "cash" || paymentMethod === "stripe" ? estimatedPrice : getFinalPrice()) + " SEK"}
        />

      </BookingScroll>

      <BookingFooter total={(paymentMethod === "cash" || paymentMethod === "stripe" ? estimatedPrice : getFinalPrice()) + " SEK"}>
        {/* Confirm Booking */}
        {paymentMethod === "stripe" ||
        (paymentMethod === "combined" && getFinalPrice() > 0) ? (
          <PaymentStripeJS
            amount={getFinalPrice()}
            points={getFinalPrice() * 10}
            isDark={isDark}
            service="Taxi"
            customText={`${translateNow("Pay", language)} ${getFinalPrice()} SEK ${translateNow("for", language)} ${translateNow("Taxi", language)}`}
           
            customStyle={{
              backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#3C3C3E" : "#E5E5E5",
            }}
            disabled={
              !pickup.trim() ||
              !dropoff.trim() ||
              !passengerName.trim() ||
              !phone.trim() ||
              !passengers.trim() ||
              parseInt(passengers) < 1 ||
              parseInt(passengers) > 4
            }
            onPaymentSuccess={async (
              purchasedPoints: number,
              amountPaid: number
            ) => {
              await handleConfirmBooking();
            }}
          />
        ) : (
          <PrimaryButton
            label={isLoading ? "Creating booking..." : "Book taxi"}
            onPress={handleConfirmBooking}
            loading={isLoading}
            disabled={
              isLoading ||
              !pickup.trim() ||
              !dropoff.trim() ||
              !passengerName.trim() ||
              !phone.trim() ||
              !passengers.trim() ||
              parseInt(passengers) < 1 ||
              parseInt(passengers) > 4
            }
          />
        )}
        <BookingFooterNote text="Secure payment • 24/7 support • Professional drivers" />
      </BookingFooter>

    </BookingScreen>
  );
}
