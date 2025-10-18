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
import { AutoText } from "./ui/AutoText";
import { showAlert } from "../utils/showAlert";

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
  disabled = false,
}: PaymentStripeJSProps & { disabled?: boolean }) {
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
      const serverUrl =
        process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:3000";
      console.log("🔗 [PAYMENT] Using server URL:", serverUrl);
      console.log(
        "💰 [PAYMENT] Sending amount:",
        amount,
        "points:",
        points || amount
      );
      const response = await fetch(`${serverUrl}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert SEK to öre (cents)
          currency: "sek",
          points: points || Math.round(amount * 10),
          isDark: isDark,
        }),
      });

      if (!response.ok) {
        console.error(
          "❌ [PAYMENT] Server response not OK:",
          response.status,
          response.statusText
        );
        const errorText = await response.text();
        console.error("❌ [PAYMENT] Server error details:", errorText);
        throw new Error(
          `Failed to create checkout session: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ [PAYMENT] Server response:", data);

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

        // Inject theme styling into the WebView
        const themeStyles = isDark
          ? `
            <style>
              body {
                background-color: #1e1e1e !important;
                color: #ffffff !important;
              }
              .StripeElement, .stripe-element {
                background-color: #374151 !important;
                color: #ffffff !important;
                border-color: #4b5563 !important;
              }
              input, textarea, select {
                background-color: #374151 !important;
                color: #ffffff !important;
                border-color: #4b5563 !important;
              }
              .checkout-header, .checkout-title {
                color: #ffffff !important;
              }
            </style>
          `
          : `
            <style>
              body {
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              .StripeElement, .stripe-element {
                background-color: #f9fafb !important;
                color: #000000 !important;
                border-color: #d1d5db !important;
              }
              input, textarea, select {
                background-color: #f9fafb !important;
                color: #000000 !important;
                border-color: #d1d5db !important;
              }
            </style>
          `;
      }
    } catch (error) {
      console.error("❌ [PAYMENT] Error creating checkout session:", error);
      showAlert(
        "Fel",
        `Kunde inte skapa betalningssession: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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
            source={{
              uri: checkoutUrl,
              headers: {
                "X-Theme": isDark ? "dark" : "light",
              },
            }}
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
            injectedJavaScript={`
              (function() {
                const isDark = ${isDark};

                // Function to apply comprehensive theme override
                const applyTheme = () => {
                  // Remove any existing theme styles first
                  const existingStyles = document.querySelectorAll('style[data-theme-override]');
                  existingStyles.forEach(style => style.remove());

                  // Create new comprehensive style override
                  const style = document.createElement('style');
                  style.setAttribute('data-theme-override', 'true');
                  style.textContent = \`
                    /* FORCE THEME OVERRIDE - HIGHEST PRIORITY */
                    * {
                      box-sizing: border-box !important;
                    }

                    /* ROOT ELEMENTS - FORCE BACKGROUND */
                    html, body, #root, #app, main, [data-testid="checkout"] {
                      background: \${isDark ? '#0f0f0f' : '#ffffff'} !important;
                      background-color: \${isDark ? '#0f0f0f' : '#ffffff'} !important;
                      color: \${isDark ? '#ffffff' : '#111827'} !important;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    }

                    /* ALL INPUT ELEMENTS - FORCE STYLING */
                    input, textarea, select,
                    [class*="Input"], [class*="input"], [class*="Field"], [class*="field"],
                    [role="textbox"], [role="combobox"], [role="listbox"],
                    .StripeElement, .stripe-element, [class*="StripeElement"] {
                      background: \${isDark ? '#1f2937' : '#f9fafb'} !important;
                      background-color: \${isDark ? '#1f2937' : '#f9fafb'} !important;
                      color: \${isDark ? '#ffffff' : '#111827'} !important;
                      border: 1px solid \${isDark ? '#374151' : '#d1d5db'} !important;
                      border-radius: 8px !important;
                      padding: 12px 16px !important;
                      font-size: 16px !important;
                      width: 100% !important;
                      box-sizing: border-box !important;
                      -webkit-appearance: none !important;
                      appearance: none !important;
                    }

                    /* INPUT FOCUS STATES */
                    input:focus, textarea:focus, select:focus,
                    .StripeElement:focus, .stripe-element:focus {
                      border-color: #3b82f6 !important;
                      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
                      outline: none !important;
                    }

                    /* ALL BUTTONS - FORCE STYLING */
                    button, [class*="Button"], [class*="button"], [class*="Btn"], [class*="btn"],
                    input[type="submit"], input[type="button"], [role="button"],
                    [data-testid*="button"], [data-testid*="checkout"] {
                      background: \${isDark ? '#2563eb' : '#3b82f6'} !important;
                      background-color: \${isDark ? '#2563eb' : '#3b82f6'} !important;
                      color: #ffffff !important;
                      border: 1px solid \${isDark ? '#2563eb' : '#3b82f6'} !important;
                      border-radius: 8px !important;
                      padding: 12px 16px !important;
                      font-size: 14px !important;
                      font-weight: 600 !important;
                      cursor: pointer !important;
                      text-decoration: none !important;
                      display: inline-block !important;
                      transition: all 0.2s ease !important;
                      -webkit-appearance: none !important;
                      appearance: none !important;
                    }

                    /* BUTTON HOVER STATES */
                    button:hover, [class*="Button"]:hover, [class*="button"]:hover {
                      background: \${isDark ? '#1d4ed8' : '#2563eb'} !important;
                      background-color: \${isDark ? '#1d4ed8' : '#2563eb'} !important;
                      transform: translateY(-1px) !important;
                    }

                    /* ALL TEXT ELEMENTS - FORCE COLOR */
                    h1, h2, h3, h4, h5, h6, p, span, div, label, strong, em, b, i,
                    [class*="title"], [class*="Title"], [class*="header"], [class*="Header"],
                    [class*="text"], [class*="Text"], [class*="description"], [class*="Description"],
                    [class*="label"], [class*="Label"], [class*="content"], [class*="Content"],
                    [class*="message"], [class*="Message"] {
                      color: \${isDark ? '#ffffff' : '#111827'} !important;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    }

                    /* LINKS */
                    a, [class*="link"], [class*="Link"] {
                      color: \${isDark ? '#60a5fa' : '#3b82f6'} !important;
                      text-decoration: none !important;
                    }

                    /* CARDS AND CONTAINERS */
                    [class*="card"], [class*="Card"], [class*="section"], [class*="Section"],
                    [class*="container"], [class*="Container"], [class*="summary"], [class*="Summary"],
                    [class*="form"], [class*="Form"], [class*="panel"], [class*="Panel"] {
                      background: \${isDark ? '#1f2937' : '#ffffff'} !important;
                      background-color: \${isDark ? '#1f2937' : '#ffffff'} !important;
                      border: 1px solid \${isDark ? '#374151' : '#e5e7eb'} !important;
                      border-radius: 12px !important;
                      box-shadow: \${isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'} !important;
                    }

                    /* ICONS AND SVG ELEMENTS */
                    svg, [class*="icon"], [class*="Icon"], [class*="svg"], [class*="Svg"] {
                      fill: \${isDark ? '#ffffff' : '#111827'} !important;
                      color: \${isDark ? '#ffffff' : '#111827'} !important;
                      stroke: \${isDark ? '#ffffff' : '#111827'} !important;
                    }

                    /* IMAGES AND LOGOS */
                    img, [class*="image"], [class*="Image"], [class*="logo"], [class*="Logo"] {
                      filter: \${isDark ? 'brightness(0) invert(1)' : 'none'} !important;
                    }

                    /* SPECIFIC STRIPE CLASSES */
                    .p-Card, .p-Field, .p-Button, .p-Text, .p-Link,
                    .StripeElement, .stripe-element, [class*="stripe"] {
                      background: \${isDark ? '#1f2937' : '#f9fafb'} !important;
                      background-color: \${isDark ? '#1f2937' : '#f9fafb'} !important;
                      color: \${isDark ? '#ffffff' : '#111827'} !important;
                      border-color: \${isDark ? '#374151' : '#d1d5db'} !important;
                    }

                    /* ERROR STATES */
                    [class*="error"], [class*="Error"], [class*="field-error"] {
                      color: #ef4444 !important;
                    }

                    /* SUCCESS STATES */
                    [class*="success"], [class*="Success"] {
                      color: #22c55e !important;
                    }

                    /* LOADING STATES */
                    [class*="loading"], [class*="Loading"] {
                      color: \${isDark ? '#9ca3af' : '#6b7280'} !important;
                    }

                    /* FORCE ALL ELEMENTS TO INHERIT THEME */
                    * {
                      color: inherit !important;
                    }

                    /* OVERRIDE ANY INLINE STYLES */
                    [style*="color"], [style*="background"] {
                      color: \${isDark ? '#ffffff' : '#111827'} !important;
                      background: inherit !important;
                      background-color: inherit !important;
                    }
                  \`;
                  document.head.appendChild(style);
                };

                // Apply theme immediately
                applyTheme();

                // Re-apply theme multiple times to catch dynamic content
                setTimeout(applyTheme, 100);
                setTimeout(applyTheme, 500);
                setTimeout(applyTheme, 1000);
                setTimeout(applyTheme, 2000);
                setTimeout(applyTheme, 3000);

                // Watch for DOM changes and re-apply theme
                const observer = new MutationObserver((mutations) => {
                  let shouldApply = false;
                  mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                      shouldApply = true;
                    }
                  });
                  if (shouldApply) {
                    setTimeout(applyTheme, 100);
                  }
                });

                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['class', 'style']
                });

                // Force theme on window load and any navigation
                window.addEventListener('load', applyTheme);
                window.addEventListener('DOMContentLoaded', applyTheme);

                // Override any existing Stripe theme functions
                if (window.Stripe) {
                  const originalMount = window.Stripe.prototype.mount;
                  if (originalMount) {
                    window.Stripe.prototype.mount = function(...args) {
                      const result = originalMount.apply(this, args);
                      setTimeout(applyTheme, 100);
                      return result;
                    };
                  }
                }
              })();
            `}
          />
        </View>
      </Modal>
      <TouchableOpacity
        testID="checkout-button-stripe-js"
        disabled={disableAll || loading || disabled}
        onPress={createCheckoutSession}
        activeOpacity={disableAll || disabled ? 1 : 0.7}
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
            backgroundColor:
              loading || disabled
                ? isDark
                  ? "#1e1e1e"
                  : "#f3f4f6"
                : disabled
                  ? isDark
                    ? "#374151" // Dark gray when disabled
                    : "#9CA3AF" // Light gray when disabled
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
              className={`text-[9px] font-medium text-center mt-2 ${
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
                    isWallet
                      ? "text-black"
                      : isDark
                        ? "text-white"
                        : "text-black"
                  }`}
                  style={{ letterSpacing: 0.5 }}
                >
                  {formattedAmount} SEK
                </AutoText>
                <AutoText
                  className={`text-xs font-semibold text-center mt-2 ${
                    isWallet
                      ? "text-black"
                      : isDark
                        ? "text-white"
                        : "text-black"
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
