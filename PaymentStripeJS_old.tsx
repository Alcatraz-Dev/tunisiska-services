import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { showAlert } from "./app/utils/showAlert";
import { AutoText } from "./app/components/ui/AutoText";
import { getServerURL } from "./app/lib/getServerURL";


interface PaymentStripeJSProps {
  amount: number;
  points?: number;
  isDark: boolean;
  onPaymentSuccess?: (purchasedPoints: number, amountPaid: number) => void;
  disableAll?: boolean;
  setDisableAll?: (value: boolean) => void;
  customText?: string;
  customClassName?: string;
  customStyle?: any;
  isWallet?: boolean; // New prop to differentiate wallet vs services
}

export default function PaymentStripeJS({
  amount,
  points,
  isDark,
  onPaymentSuccess,
  disableAll: externalDisableAll,
  setDisableAll: externalSetDisableAll,
  customText,
  customClassName,
  customStyle,
  isWallet = false, 
}: PaymentStripeJSProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [internalDisableAll, setInternalDisableAll] = useState(false);
  const disableAll =
    externalDisableAll !== undefined ? externalDisableAll : internalDisableAll;
  const setDisableAll = externalSetDisableAll || setInternalDisableAll;
  const formattedAmount = amount.toFixed(2);

  const createCheckoutSession = async () => {
    try {
      setLoading(true);

      // Create checkout session on your server
      const serverUrl = getServerURL();
        // process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";
      const response = await fetch(`${serverUrl}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount , // Convert to cents
          currency: "sek",
          points: points || amount ,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();

      // For web platform, open in external browser instead of WebView
      if (Platform.OS === "web") {
        if (data.url) {
          // Open in external browser for web
          Linking.openURL(data.url);
          // Since we can't detect completion, show a message
          showAlert(
            "Betalning initierad",
            "Betalningssidan öppnas i din webbläsare. Kom tillbaka efter betalning."
          );
        } else {
          throw new Error("No checkout URL received");
        }
      } else {
        // For native platforms, use WebView in modal
        if (data.url) {
          setCheckoutUrl(data.url);
          setShowModal(true);
        } else {
          throw new Error("No checkout URL received");
        }
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      showAlert("Fel", "Kunde inte skapa betalningssession");
    } finally {
      setLoading(false);
    }
  };

  // Since we're using external browser, we can't detect payment completion
  // The payment success will need to be handled differently
  // For now, we'll just show a message that payment was initiated

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "PAYMENT_SUCCESS") {
        const earnedPoints = points || amount * 10;
        if (onPaymentSuccess) {
          onPaymentSuccess(earnedPoints, amount);
        }
        setShowModal(false);
        setCheckoutUrl("");
        showAlert(
          "Betalning genomförd! 🎉",
          `Din betalning på ${amount} SEK är bekräftad!\n\n🎁 Du fick ${earnedPoints} poäng!`
        );
      } else if (data.type === "PAYMENT_CANCELLED") {
        setShowModal(false);
        setCheckoutUrl("");
        showAlert("Avbruten", "Betalningen avbröts");
      }
    } catch (error) {
      console.error("Error parsing webview message:", error);
    }
  };

  return (
    <View className="mt-4 w-full flex-row justify-center">
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowModal(false);
          setCheckoutUrl("");
        }}
      >
        <View className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
          <WebView
            source={{ uri: checkoutUrl }}
            onMessage={handleWebViewMessage}
            onNavigationStateChange={(navState) => {
              // Handle success/cancel URLs
              if (navState.url.includes("/success")) {
                const earnedPoints = points || amount * 10;
                if (onPaymentSuccess) {
                  onPaymentSuccess(earnedPoints, amount);
                }
                setShowModal(false);
                setCheckoutUrl("");
                showAlert(
                  "Betalning genomförd! 🎉",
                  `Din betalning på ${amount} SEK är bekräftad!\n\n🎁 Du fick ${earnedPoints} poäng!`
                );
              } else if (navState.url.includes("/cancel")) {
                setShowModal(false);
                setCheckoutUrl("");
                showAlert("Avbruten", "Betalningen avbröts");
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        </View>
      </Modal>

      <TouchableOpacity
        testID="checkout-button-stripe-js"
        disabled={disableAll || loading}
        onPress={createCheckoutSession}
        activeOpacity={disableAll ? 1 : 0.7}
        className={customClassName || ""}
        style={[
          {
            width: "100%",
            borderRadius: 10,
            shadowColor: "#000",
            shadowOpacity: loading ? 0.3 : 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 10 },
            elevation: loading ? 6 : 3,
            backgroundColor: loading
              ? isDark
                ? "#1e1e1e"
                : "#f3f4f6"
              : isWallet
                ? isDark
                  ? "#2563EB" // Blue for wallet dark mode
                  : "#3B82F6" // Blue for wallet light mode
                : "#d1d5db", // Gray for services
          },
          customStyle,
        ]}
      >
        {loading ? (
          <View
            className={`w-full rounded-2xl ${
              isWallet
                ? isDark
                  ? "bg-blue-600" // Blue background for wallet loading
                  : "bg-blue-500"
                : isDark
                ? "bg-dark-card"
                : "bg-light-card"
            } py-5`}
            style={{
              paddingVertical: 35,
              paddingHorizontal: 15,
              width: "100%",
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <ActivityIndicator
              size="small"
              color={isWallet ? "#fff" : isDark ? "#fff" : "#0ea5e9"}
            />
            <AutoText
              className={`text-xs font-medium text-center mt-2 ${
                isWallet ? "text-white" : isDark ? "text-white" : "text-black"
              }`}
              style={{ letterSpacing: 0.5 }}
            >
              Skapar betalning...
            </AutoText>
          </View>
        ) : (
          <View
            className={`w-full rounded-2xl ${
              !isWallet
                ? isDark 
                  ? "bg-blue-600" // Blue background for wallet
                  : "bg-blue-500"
                : isDark 
                ? "bg-dark-card"
                : "bg-light-card"
            } py-5`}
            style={{
              paddingVertical: 35,
              paddingHorizontal: 15,
              width: "100%",
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            {customText ? (
              <AutoText
                className={`text-xs font-semibold text-center mt-2 ${
                  isWallet ? "text-white" : isDark ? "text-white" : "text-black"
                }`}
                style={{ letterSpacing: 0.5 }}
              >
                {customText}
              </AutoText>
            ) : (
              <>
                <AutoText
                  className={`text-xs font-medium text-center mt-2 ${
                    isWallet ? "text-white" : isDark ? "text-white" : "text-black"
                  }`}
                  style={{ letterSpacing: 0.5 }}
                >
                  {formattedAmount} SEK
                </AutoText>
                <AutoText
                  className={`text-xs font-semibold text-center mt-2 ${
                    isWallet ? "text-white" : isDark ? "text-white" : "text-black"
                  }`}
                  style={{ letterSpacing: 0.5 }}
                >
                  {points ? points : amount * 10} poäng
                </AutoText>
              </>
            )}

          </View>
        )}
      </TouchableOpacity>
    </View>
  );


}
