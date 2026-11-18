import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, RefreshControl, ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import AppIcon from "@/app/components/ui/AppIcon";
import Badge from "@/app/components/ui/Badge";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import { client } from "@/sanityClient";
import { helpSupportQuery } from "@/app/hooks/useQuery";
import { useAdminAccess } from "@/app/hooks/useAdminAccess";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { showAlert } from "@/app/utils/showAlert";
import type { HelpSupportData, FaqItem } from "@/app/schemas/serviceSchemas";

const DEFAULT_SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@tunisiskaservices.se";
const DEFAULT_SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE || "+46 73 777 87 37";
const DEFAULT_SUPPORT_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || "+46 73 777 87 37";

const DEFAULT_FAQS: FaqItem[] = [
  {
    _key: "faq-1",
    question: "Where can I find my bookings?",
    answer: "Open My Shipments from your profile to see your booking status, details and history.",
  },
  {
    _key: "faq-2",
    question: "How do I track a parcel?",
    answer: "Open Track in Trips and enter the tracking number from your booking confirmation.",
  },
  {
    _key: "faq-3",
    question: "What routes do you cover?",
    answer: "We offer scheduled cargo, parcel and relocation transport between all parts of Sweden and Tunisia.",
  },
];

export default function HelpSupportScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { isAdmin } = useAdminAccess();

  const [supportData, setSupportData] = useState<HelpSupportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [expandedFaqKey, setExpandedFaqKey] = useState<string | null>(null);

  const fetchSupportData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data: HelpSupportData | null = await client.fetch(helpSupportQuery);
      setSupportData(data);
    } catch (error) {
      console.warn("Could not load dynamic support data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSupportData();
  }, [fetchSupportData]);

  const supportEmail = supportData?.email || DEFAULT_SUPPORT_EMAIL;
  const supportPhone = supportData?.phone || DEFAULT_SUPPORT_PHONE;
  const supportWhatsapp = supportData?.whatsapp || DEFAULT_SUPPORT_WHATSAPP;
  const heroTitle = supportData?.heroTitle || "How can we help?";
  const heroSubtitle = supportData?.heroSubtitle || "Choose a contact option or browse the information below.";
  const supportHours = supportData?.supportHours;
  const responseNotice = supportData?.responseNotice;
  const faqs = supportData?.faqs && supportData.faqs.length > 0 ? supportData.faqs : DEFAULT_FAQS;

  const openContact = useCallback(
    async (kind: "email" | "call" | "chat") => {
      if (kind === "email") {
        const email = supportEmail?.trim();
        if (!email) {
          showAlert("Ingen e-postadress", "Supportens e-postadress är inte konfigurerad än.");
          return;
        }
        const subject = encodeURIComponent("Kundsupport - Tunisiska Mega");
        const mailtoWithSubject = `mailto:${email}?subject=${subject}`;
        const mailtoPlain = `mailto:${email}`;

        try {
          await Linking.openURL(mailtoWithSubject);
          return;
        } catch {
          // If mailto with query params failed, try plain mailto
          try {
            await Linking.openURL(mailtoPlain);
            return;
          } catch (err) {
            console.warn("Could not open native email client:", err);
            // Fallback: offer to open webmail or copy email
            const webmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}`;
            showAlert(
              "Skicka e-post",
              `Kunde inte öppna e-postappen automatiskt.\n\nE-post: ${email}`,
              [
                { text: "Avbryt", style: "cancel" },
                {
                  text: "Kopiera e-post",
                  onPress: async () => {
                    await Clipboard.setStringAsync(email);
                    showAlert("Kopierat", "E-postadressen har kopierats till urklipp.");
                  },
                },
                {
                  text: "Öppna webbmejl",
                  onPress: async () => {
                    try {
                      await Linking.openURL(webmailUrl);
                    } catch {
                      await Clipboard.setStringAsync(email);
                      showAlert("Kopierat", "E-postadressen har kopierats till urklipp.");
                    }
                  },
                },
              ]
            );
          }
        }
        return;
      }

      if (kind === "call") {
        const phone = supportPhone?.trim();
        if (!phone) {
          showAlert("Inget telefonnummer", "Supportens telefonnummer är inte konfigurerat än.");
          return;
        }
        // Remove spaces, hyphens, and non-dialable symbols for standard tel: protocol
        const cleanPhone = phone.replace(/[^\d+]/g, "");
        const telPromptUrl = `telprompt:${cleanPhone}`;
        const telUrl = `tel:${cleanPhone}`;

        if (Platform.OS === "ios") {
          try {
            await Linking.openURL(telPromptUrl);
            return;
          } catch {
            try {
              await Linking.openURL(telUrl);
              return;
            } catch (err) {
              console.warn("Could not open phone dialer on iOS:", err);
            }
          }
        } else {
          try {
            await Linking.openURL(telUrl);
            return;
          } catch (err) {
            console.warn("Could not open phone dialer on Android:", err);
          }
        }

        // If direct dialing failed (e.g. simulator, tablet without cellular, etc.):
        const whatsappDigits = (supportWhatsapp || phone).replace(/\D/g, "");
        showAlert(
          "Ring support",
          `Telefonnummer: ${phone}`,
          [
            { text: "Stäng", style: "cancel" },
            {
              text: "Kopiera nummer",
              onPress: async () => {
                await Clipboard.setStringAsync(phone);
                showAlert("Kopierat", "Telefonnumret har kopierats till urklipp.");
              },
            },
            ...(whatsappDigits
              ? [
                  {
                    text: "Ring via WhatsApp",
                    onPress: async () => {
                      try {
                        await Linking.openURL(`https://wa.me/${whatsappDigits}`);
                      } catch {
                        await Clipboard.setStringAsync(phone);
                        showAlert("Kopierat", "Telefonnumret har kopierats till urklipp.");
                      }
                    },
                  },
                ]
              : []),
          ]
        );
        return;
      }

      if (kind === "chat") {
        const whatsappNumber = supportWhatsapp?.trim();
        if (!whatsappNumber) {
          showAlert("Inget WhatsApp-nummer", "Supportens WhatsApp-nummer är inte konfigurerat än.");
          return;
        }
        const cleanDigits = whatsappNumber.replace(/\D/g, "");
        const appUrl = `whatsapp://send?phone=${cleanDigits}`;
        const webUrl = `https://wa.me/${cleanDigits}`;

        try {
          await Linking.openURL(appUrl);
          return;
        } catch {
          try {
            await Linking.openURL(webUrl);
            return;
          } catch (err) {
            console.warn("Could not open WhatsApp:", err);
            showAlert(
              "WhatsApp",
              `Kunde inte öppna WhatsApp automatiskt.\n\nNummer: ${whatsappNumber}`,
              [
                { text: "Stäng", style: "cancel" },
                {
                  text: "Kopiera nummer",
                  onPress: async () => {
                    await Clipboard.setStringAsync(whatsappNumber);
                    showAlert("Kopierat", "WhatsApp-numret har kopierats till urklipp.");
                  },
                },
              ]
            );
          }
        }
        return;
      }
    },
    [supportEmail, supportPhone, supportWhatsapp]
  );

  const items: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; action: () => void }[] = [
    {
      icon: "chatbubble-ellipses-outline",
      title: "Chat with us",
      subtitle: supportWhatsapp ? `WhatsApp: ${supportWhatsapp}` : "Message us on WhatsApp",
      action: () => openContact("chat"),
    },
    {
      icon: "mail-outline",
      title: "Email support",
      subtitle: supportEmail || "Contact details not configured",
      action: () => openContact("email"),
    },
    {
      icon: "call-outline",
      title: "Call support",
      subtitle: supportPhone || "Contact details not configured",
      action: () => openContact("call"),
    },
    {
      icon: "help-circle-outline",
      title: "Frequently asked questions",
      subtitle: `${faqs.length} questions and answers`,
      action: () => setFaqOpen((open) => !open),
    },
    {
      icon: "document-text-outline",
      title: "Terms & conditions",
      subtitle: "Read our terms",
      action: () => router.push("/(home)/profile/terms"),
    },
    {
      icon: "shield-checkmark-outline",
      title: "Privacy policy",
      subtitle: "How your information is used",
      action: () => router.push("/(home)/profile/policy"),
    },
  ];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader
        title="Help & Support"
        subtitle="We’re here to help"
        showBack
        right={
          isAdmin ? (
            <PressableScale
              onPress={() => router.push("/(home)/profile/admin-help-support" as any)}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Admin Edit Help & Support"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                borderRadius: radii.md,
                backgroundColor: theme.primarySoft,
                borderWidth: 1,
                borderColor: theme.borderSubtle,
              }}
            >
              <AppIcon name="create-outline" size={16} color={theme.primary} />
              <ThemedText variant="caption" style={{ color: theme.primary, fontWeight: "700" }}>
                Edit (Admin)
              </ThemedText>
            </PressableScale>
          ) : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void fetchSupportData(true)} tintColor={theme.primary} />
        }
      >
        {/* ADMIN SHORTCUT BANNER */}
        {isAdmin ? (
          <PressableScale
            onPress={() => router.push("/(home)/profile/admin-help-support" as any)}
            haptic="light"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              marginBottom: spacing.md,
              borderRadius: radii.lg,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.primary,
              ...shadows.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: theme.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppIcon name="shield-checkmark" size={17} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodySm" style={{ fontWeight: "600", color: theme.textPrimary }}>
                  Admin Controls Active
                </ThemedText>
                <ThemedText variant="footnote" tone="secondary">
                  Tap here to edit contact numbers, opening hours & FAQs.
                </ThemedText>
              </View>
            </View>
            <AppIcon name="chevron-forward" size={16} color={theme.primary} />
          </PressableScale>
        ) : null}

        {/* HERO CARD */}
        <View style={{ backgroundColor: theme.primary, borderRadius: radii.xl, padding: spacing.xl, marginBottom: spacing.lg }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="headset-outline" size={23} color="#FFFFFF" />
          </View>
          <ThemedText variant="title2" style={{ color: "#FFFFFF", marginTop: spacing.md }}>
            {heroTitle}
          </ThemedText>
          <ThemedText variant="bodySm" style={{ color: "#D9E2F1", marginTop: spacing.xs }}>
            {heroSubtitle}
          </ThemedText>
        </View>

        {/* HOURS & SLA NOTICE */}
        {supportHours || responseNotice ? (
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: theme.border,
              padding: spacing.md,
              marginBottom: spacing.lg,
              gap: spacing.sm,
              ...shadows.sm,
            }}
          >
            {supportHours ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <AppIcon name="time-outline" size={18} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" tone="secondary">
                    Opening Hours
                  </ThemedText>
                  <ThemedText variant="bodySm" style={{ fontWeight: "600" }}>
                    {supportHours}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {responseNotice ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: supportHours ? 6 : 0, borderTopWidth: supportHours ? 1 : 0, borderColor: theme.borderSubtle }}>
                <AppIcon name="flash-outline" size={17} color={theme.accent} />
                <ThemedText variant="caption" tone="secondary" style={{ flex: 1 }}>
                  {responseNotice}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* CONTACT OPTIONS LIST */}
        <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, overflow: "hidden", ...shadows.sm }}>
          {items.map((item, index) => (
            <PressableScale
              key={item.title}
              onPress={item.action}
              haptic="light"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                borderBottomWidth: index === items.length - 1 ? 0 : 1,
                borderColor: theme.borderSubtle,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: theme.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppIcon name={item.icon} size={19} color={theme.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="headline">{item.title}</ThemedText>
                <ThemedText variant="caption" tone="secondary">
                  {item.subtitle}
                </ThemedText>
              </View>
              <AppIcon
                name={item.title.includes("Frequently") ? (faqOpen ? "chevron-down" : "chevron-forward") : "chevron-forward"}
                size={17}
                color={theme.textQuaternary}
              />
            </PressableScale>
          ))}
        </View>

        {/* EXPANDABLE FAQ SECTION */}
        {faqOpen ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <ThemedText variant="title3">Frequently asked questions</ThemedText>
              {isAdmin ? (
                <PressableScale
                  onPress={() => router.push("/(home)/profile/admin-help-support" as any)}
                  haptic="light"
                  style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                >
                  <AppIcon name="add" size={14} color={theme.primary} />
                  <ThemedText variant="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                    Manage FAQs
                  </ThemedText>
                </PressableScale>
              ) : null}
            </View>

            <View style={{ gap: spacing.sm }}>
              {faqs.map((faq, index) => {
                const isExpanded = expandedFaqKey === (faq._key || String(index));
                return (
                  <PressableScale
                    key={faq._key || index}
                    onPress={() =>
                      setExpandedFaqKey((prev) => (prev === (faq._key || String(index)) ? null : (faq._key || String(index))))
                    }
                    haptic="light"
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: spacing.md,
                      gap: spacing.xs,
                      ...shadows.sm,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        {faq.category ? (
                          <View style={{ alignSelf: "flex-start", marginBottom: 4 }}>
                            <Badge label={faq.category} tone="neutral" />
                          </View>
                        ) : null}
                        <ThemedText variant="headline" style={{ color: theme.textPrimary }}>
                          {faq.question}
                        </ThemedText>
                      </View>
                      <AppIcon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={17}
                        color={theme.textTertiary}
                      />
                    </View>
                    {isExpanded ? (
                      <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: spacing.xs, lineHeight: 20 }}>
                        {faq.answer}
                      </ThemedText>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
