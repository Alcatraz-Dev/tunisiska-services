import { getBestServerURL, getServerURL } from "@/app/config/stripe";
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

// Universal Stripe implementation - works on both web and native
let stripePromise: any = null;

// Initialize Stripe.js for both platforms
try {
  const { loadStripe } = require("@stripe/stripe-js");
  stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");
  console.log('Stripe.js initialized for universal use');
} catch (error) {
  console.warn('Stripe.js not available:', error);
}

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
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [internalDisableAll, setInternalDisableAll] = useState(false);
  const disableAll = externalDisableAll !== undefined ? externalDisableAll : internalDisableAll;
  const setDisableAll = externalSetDisableAll || setInternalDisableAll;
  const formattedAmount = amount.toFixed(2);

  // No native Stripe hooks needed - using universal Stripe.js implementation

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

  const openPaymentSheet = async () => {
    // Real Stripe payment implementation
    console.log("🚀 Real Stripe payment for amount:", amount);

    try {
      setInitializing(true);

      if (!stripePromise) {
        showAlert("Fel", "Stripe är inte tillgängligt");
        return;
      }

      const stripe = await stripePromise;

      // Use localhost for web, IP for native
      const serverUrl = typeof window !== 'undefined' && window.document
        ? 'http://localhost:3000'
        : 'http://192.168.8.116:3000';

      console.log("🔗 Using server URL:", serverUrl);

      // Create checkout session with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${serverUrl}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'sek',
          successUrl: typeof window !== 'undefined' && window.document
            ? window.location.origin + '/success'
            : 'tunisiska-services://success',
          cancelUrl: typeof window !== 'undefined' && window.document
            ? window.location.origin + '/cancel'
            : 'tunisiska-services://cancel'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Checkout session created successfully');

      if (typeof window !== 'undefined' && window.document) {
        // Web platform - redirect to Stripe
        console.log("🌐 Web: Redirecting to Stripe checkout");

        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });

        if (error) {
          console.error('Stripe redirect error:', error);
          showAlert("Betalning misslyckades", error.message);
        }
      } else {
        // Native platform - show payment URL
        console.log("📱 Native: Showing payment URL");

        if (data.url) {
          showAlert(
            "Öppna betalning",
            `Öppna denna länk i din webbläsare för att slutföra betalningen:\n\n${data.url}`,
            [
              { text: "Avbryt", style: "cancel" },
              {
                text: "Kopiera länk",
                onPress: () => {
                  console.log("Payment URL:", data.url);
                  showAlert("Länk kopierad", "Öppna länken i din webbläsare för att betala");
                }
              }
            ]
          );
        }
      }

    } catch (error: any) {
      console.error("💥 Payment error:", error);

      if (error.name === 'AbortError') {
        showAlert("Timeout", "Servern svarade inte inom förväntad tid. Försök igen senare.");
      } else {
        showAlert("Anslutningsfel", "Kunde inte ansluta till betalserver. Kontrollera din internetanslutning.");
      }
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
