import React, { useCallback, useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, spacing } from "@/app/theme/spacing";
import { showAlert } from "@/app/utils/showAlert";
import { client } from "@/sanityClient";
import { supportQuery } from "@/app/hooks/useQuery";

const FALLBACK_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
const FALLBACK_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE;
const FALLBACK_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP;

const DEFAULT_FAQS = [
  {
    question: "Where can I find my bookings?",
    answer: "Open My Shipments from your profile to see your booking status and details.",
  },
  {
    question: "How do I track a parcel?",
    answer: "Open Track in Trips and enter the tracking number from your booking.",
  },
];

type SupportDetails = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  faqs?: { question?: string; answer?: string }[];
};

type ContactKind = "email" | "call" | "chat";

const CONTACT_COPY: Record<ContactKind, { name: string; url: (value: string) => string }> = {
  email: { name: "support email", url: (value) => `mailto:${value}` },
  call: { name: "support phone number", url: (value) => `tel:${value.replace(/[\s().-]/g, "")}` },
  chat: { name: "WhatsApp contact", url: (value) => `https://wa.me/${value.replace(/\D/g, "")}` },
};

export default function HelpSupportScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [faqOpen, setFaqOpen] = useState(false);
  const [support, setSupport] = useState<SupportDetails | null>(null);

  useEffect(() => {
    let active = true;
    const fetchSupport = async () => {
      try {
        const data = await client.fetch<SupportDetails>(supportQuery);
        if (active && data) setSupport(data);
      } catch (error) {
        console.error("Error fetching support details:", error);
      }
    };
    void fetchSupport();
    return () => {
      active = false;
    };
  }, []);

  const contactValue = useCallback(
    (kind: ContactKind) => {
      // Trimmed: a trailing space or newline from the admin panel or env
      // would otherwise produce a broken mailto:/tel: link.
      const raw =
        kind === "email"
          ? (support?.email ?? FALLBACK_EMAIL)
          : kind === "call"
            ? (support?.phone ?? FALLBACK_PHONE)
            : (support?.whatsapp ?? FALLBACK_WHATSAPP);
      return (raw ?? "").trim();
    },
    [support],
  );

  const faqs =
    support?.faqs && support.faqs.length > 0
      ? support.faqs
          .filter((item) => item?.question && item?.answer)
          .map((item) => ({
            question: String(item.question),
            answer: String(item.answer),
          }))
      : DEFAULT_FAQS;

  const openContact = useCallback(
    async (kind: ContactKind) => {
      // Opens the mail app, the phone dialer, or WhatsApp — the same way the
      // WhatsApp link opens the chat from AdminDataList and elsewhere.
      const value = contactValue(kind);
      if (!value) {
        showAlert("Contact unavailable", `The ${CONTACT_COPY[kind].name} is not configured yet. You can set it in the admin panel under Help & support.`);
        return;
      }
      if (kind === "chat" && value.replace(/\D/g, "").length < 8) {
        showAlert("Contact unavailable", "The WhatsApp number does not look valid. Please check it in the admin panel.");
        return;
      }
      const url = CONTACT_COPY[kind].url(value);
      try {
        // Open directly: canOpenURL() wrongly returns false for tel:/mailto:
        // on simulators, even though real devices handle them fine.
        await Linking.openURL(url);
      } catch {
        // No app could handle the link (e.g. a simulator has no dialer or
        // mail app): copy the details so the user can still reach us.
        await Clipboard.setStringAsync(value).catch(() => undefined);
        showAlert(
          "Unable to open",
          kind === "chat"
            ? "Please try again later."
            : `No compatible app is available, so ${value} was copied — paste it into your ${kind === "email" ? "mail" : "phone"} app.`,
        );
      }
    },
    [contactValue],
  );

  const emailValue = contactValue("email");
  const phoneValue = contactValue("call");
  const chatValue = contactValue("chat");

  const items: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; action: () => void }[] = [
    { icon: "chatbubble-ellipses-outline", title: "Chat with us", subtitle: chatValue || "Contact details not configured", action: () => openContact("chat") },
    { icon: "mail-outline", title: "Email support", subtitle: emailValue || "Contact details not configured", action: () => openContact("email") },
    { icon: "call-outline", title: "Call support", subtitle: phoneValue || "Contact details not configured", action: () => openContact("call") },
    { icon: "help-circle-outline", title: "Frequently asked questions", subtitle: "Common questions and answers", action: () => setFaqOpen((open) => !open) },
    { icon: "document-text-outline", title: "Terms & conditions", subtitle: "Read our terms", action: () => router.push("/(home)/profile/terms") },
    { icon: "shield-checkmark-outline", title: "Privacy policy", subtitle: "How your information is used", action: () => router.push("/(home)/profile/policy") },
  ];

  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title="Help & Support" subtitle="We’re here to help" showBack />
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 40 }}>
      <View style={{ backgroundColor: theme.primary, borderRadius: radii.xl, padding: spacing.xl, marginBottom: spacing.lg }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}><AppIcon name="headset-outline" size={23} color="#FFFFFF" /></View>
        <ThemedText variant="title2" style={{ color: "#FFFFFF", marginTop: spacing.md }}>How can we help?</ThemedText>
        <ThemedText variant="bodySm" style={{ color: "#D9E2F1", marginTop: spacing.xs }}>Choose a contact option or browse the information below.</ThemedText>
      </View>
      <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
        {items.map((item, index) => <PressableScale key={item.title} onPress={item.action} haptic="light" style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: index === items.length - 1 ? 0 : 1, borderColor: theme.borderSubtle }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}><AppIcon name={item.icon} size={19} color={theme.primary} /></View>
          <View style={{ flex: 1, gap: 2 }}><ThemedText variant="headline">{item.title}</ThemedText><ThemedText variant="caption" tone="secondary">{item.subtitle}</ThemedText></View>
          <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
        </PressableScale>)}
      </View>
      {faqOpen ? <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <ThemedText variant="title3">Frequently asked questions</ThemedText>
        <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, padding: spacing.md, gap: spacing.md }}>
          {faqs.map((faq) => (
            <View key={faq.question}>
              <ThemedText variant="headline">{faq.question}</ThemedText>
              <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: 4 }}>{faq.answer}</ThemedText>
            </View>
          ))}
        </View>
      </View> : null}
    </ScrollView>
  </SafeAreaView>;
}
