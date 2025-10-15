import { getBestServerURL, getServerURL } from "@/app/config/stripe";
import { useStripe } from "@stripe/stripe-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { showAlert } from "../utils/showAlert";
import { AutoText } from "./ui/AutoText";

export default function Payment({
  amount,
  points,
  isDark,
  onPaymentSuccess,
  disableAll: externalDisableAll,
  setDisableAll: externalSetDisableAll,

}: {
  amount: number;
  points?: number;
  isDark: boolean;
  onPaymentSuccess?: (purchasedPoints: number, amountPaid: number) => void;
  disableAll?: boolean;
  setDisableAll?: (value: boolean) => void;
}) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [internalDisableAll, setInternalDisableAll] = useState(false);
  const disableAll = externalDisableAll !== undefined ? externalDisableAll : internalDisableAll;
  const setDisableAll = externalSetDisableAll || setInternalDisableAll;
  const formattedAmount = amount.toFixed(2);

  // Initialize server URL once
  useEffect(() => {
    const setupServer = async () => {
      try {
        const url = await getBestServerURL();
        setServerUrl(url);
        console.log("Using server URL:", url);
      } catch (error) {
        console.error("Failed to get server URL:", error);
        const fallback = getServerURL();
        setServerUrl(fallback);
        console.log("Using fallback server URL:", fallback);
      }
    };
    setupServer();
  }, []);

  // Mark component as ready when server URL is available
  useEffect(() => {
    if (serverUrl) {
      console.log("Component initialized");
      setInitializing(false);
      setLoading(true); // Ready to accept clicks

      // Test network connectivity
      if (Platform.OS !== "web") {
        testNetworkConnectivity();
      }
    }
  }, [serverUrl]);

  const testNetworkConnectivity = async () => {
    try {
      console.log("🌐 [NETWORK TEST] Testing connection to:", serverUrl);
      const response = await fetch(`${serverUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("✅ [NETWORK TEST] Server is reachable!");
      } else {
        console.warn(
          "⚠️ [NETWORK TEST] Server responded with status:",
          response.status
        );
      }
    } catch (error: any) {
      console.error("💥 [NETWORK TEST] Failed to reach server:", error.message);
      console.warn(
        "💠 [NETWORK TEST] This may cause payment issues on real devices"
      );
    }
  };
  const fetchPaymentSheetParams = async () => {
    console.log("🚀 [DEVICE DEBUG] Starting payment request");
    console.log("📱 [DEVICE DEBUG] Platform:", Platform.OS);
    console.log("🔗 [DEVICE DEBUG] Server URL:", serverUrl);
    console.log("💰 [DEVICE DEBUG] Amount:", amount, "SEK");
    console.log("🌐 [DEVICE DEBUG] DEV mode:", __DEV__);

    try {
      console.log("📡 [NETWORK] Starting fetch request...");

      const response = await fetch(`${serverUrl}/payment-sheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, currency: "sek" }),
      });

      console.log("📡 [NETWORK] Response received. Status:", response.status);
      console.log("📡 [NETWORK] Response OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("💥 [SERVER ERROR] Status:", response.status);
        console.error("💥 [SERVER ERROR] Text:", errorText);

        // Show detailed error to user
        Alert.alert(
          "Server Connection Error",
          `Cannot reach payment server\n\nStatus: ${response.status}\nServer: ${serverUrl}\nError: ${errorText}\n\nTips:\n• Make sure your computer and device are on the same WiFi network\n• Check if server is running: npm run server\n• For real devices, set EXPO_PUBLIC_SERVER_URL to your computer's IP address\n• Find your IP: macOS/Linux: ifconfig | grep inet, Windows: ipconfig\n• Try restarting Expo: npx expo start --clear`
        );

        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ [SUCCESS] Payment data received:", Object.keys(data));

      return {
        paymentIntent: data.paymentIntent,
        ephemeralKey: data.ephemeralKey,
        customer: data.customer,
      };
    } catch (error: any) {
      console.error("💥 [FETCH ERROR] Name:", error.name);
      console.error("💥 [FETCH ERROR] Message:", error.message);

      if (error.message.includes("Network request failed")) {
        Alert.alert(
          "Network Connection Error",
          `Cannot connect to payment server\n\nServer: ${serverUrl}\n\nTroubleshooting:\n• Ensure your device and computer are on the same WiFi network\n• Check if the server is running on your computer\n• For real devices, use your computer's IP address instead of localhost\n• Find your IP: macOS/Linux: ifconfig | grep inet, Windows: ipconfig\n• Set EXPO_PUBLIC_SERVER_URL environment variable to http://YOUR_IP:3000`
        );
      } else if (error.name === "TypeError") {
        Alert.alert(
          "Network Error",
          `Failed to fetch from server\n\nThis usually means:\n• Server is not running\n• Wrong IP address\n• Network blocking connection\n\nServer URL: ${serverUrl}\n\nFor real devices, make sure to use your computer's local IP address.`
        );
      }

      throw error;
    }
  };

  const initializePaymentSheet = async () => {
    console.log("⚡ FAST initializing payment sheet for:", amount, "SEK");

    // Get payment params from server
    const { paymentIntent, ephemeralKey, customer } =
      await fetchPaymentSheetParams();

    // Streamlined initialization for speed
    const { error } = await initPaymentSheet({
      merchantDisplayName: "Tunisiska Services",
      merchantCountryCode: "SE",
      applePay: {
        merchantCountryCode: "SE",
        //@ts-ignore
        merchantIdentifier: "merchant.com.tunisiska.services",
      },
      googlePay: {
        merchantCountryCode: "SE",
        testEnv: __DEV__,
      },
      appearance: {
        colors: {
          primary: "#2563EB",
          background: isDark ? "#1C1C1E" : "#FFFFFF",
          componentBackground: isDark ? "#2C2C2E" : "#F9F9F9",
          componentBorder: isDark ? "#3C3C3E" : "#E5E5E5",
          componentDivider: isDark ? "#3C3C3E" : "#E5E5E5",
          primaryText: isDark ? "#FFFFFF" : "#000000",
          secondaryText: isDark ? "#CCCCCC" : "#666666",
          componentText: isDark ? "#FFFFFF" : "#000000",
          placeholderText: isDark ? "#888888" : "#999999",
        },
        shapes: {
          borderRadius: 8,
          borderWidth: 1,
        },
      },
      customerId: customer.id || customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      returnURL: "tunisiska-services://stripe-redirect",
    });

    if (error) {
      console.error("❌ Stripe initialization failed:", error.message);
      throw new Error(error.message || "Kunde inte initiera betalning");
    }

    console.log("✅ Payment sheet READY for", amount, "SEK");
  };

  const openPaymentSheet = async () => {
    try {
      // Show loading state
      setInitializing(true);
      console.log(
        "🚀 Button clicked! Initializing payment sheet for amount:",
        amount
      );

      // Initialize payment sheet with current amount
      await initializePaymentSheet();

      // Present the payment sheet
      const { error } = await presentPaymentSheet();

      if (error) {
        console.log("❌ Payment cancelled or failed:", error.code);
        showAlert(`Error code: ${error.code}`, error.message);
      } else {
        console.log("✅ Payment successful for amount:", amount);

        // Calculate points earned (either provided points or amount * 10)
        const earnedPoints = points || amount * 10;

        // Award points to user
        if (onPaymentSuccess) {
          console.log("🎉 Awarding", earnedPoints, "points to user");
          onPaymentSuccess(earnedPoints, amount);
        }

        showAlert(
          "Betalning genomförd! 🎉",
          `Din betalning på ${amount} SEK är bekräftad!\n\n🎁 Du fick ${earnedPoints} poäng!`
        );
      }
    } catch (error: any) {
      console.error("💥 Payment process error:", error);
      showAlert("Fel", "Något gick fel under betalningsprocessen");
    } finally {
      setInitializing(false);
    }
  };
  const handlePress = async () => {
    if (disableAll) return; // prevent double tap

    setDisableAll(true); // disable all buttons immediately

    try {
      await openPaymentSheet();
    } finally {
      setDisableAll(false); // re-enable when done
    }
  };
  return (
    <View className="mt-4 w-full flex-row justify-center">
      {initializing ? (
        <ActivityIndicator
          size="small"
          color={isDark ? "#fff" : "#0ea5e9"}
          className="flex justify-center items-center mt-10"
        />
      ) : (
        <TouchableOpacity
          testID="checkout-button"
          disabled={disableAll || !loading} 
          onPress={handlePress} 
          activeOpacity={disableAll ? 1 : 0.7}
          style={{
            width: "100%",
            borderRadius: 5,
            shadowColor: "#000",
            shadowOpacity: loading ? 0.3 : 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 10 },
            elevation: loading ? 6 : 3,
        
            backgroundColor: loading
              ? isDark
                ? "#1e1e1e"
                : "#f3f4f6"
              : "#d1d5db",
          }}
        >
          {loading ? (
            <View
              className={`w-full rounded-2xl ${
                isDark ? "bg-dark-card" : "bg-light-card"
              } py-5`}
              style={{
                paddingVertical: 35, // زيادة الارتفاع
                paddingHorizontal: 15,
                width: "100%",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <AutoText
                className={`text-xs font-medium text-center mt-2 ${
                  isDark ? "text-white" : "text-black"
                }`}
                style={{ letterSpacing: 0.5 }}
              >
                {formattedAmount} SEK
              </AutoText>
              <AutoText
                className={`text-xs font-semibold text-center mt-2 ${
                  isDark ? "text-white" : "text-black"
                }`}
                style={{ letterSpacing: 0.5 }}
              >
                {points ? points : amount * 10} poäng
              </AutoText>
            </View>
          ) : (
            <View className="w-full items-center justify-center rounded-2xl bg-gray-300 py-5">
              <AutoText
                className={`text-xs font-semibold ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                Laddar...
              </AutoText>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
