import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import Input from "@/app/components/ui/Input";
import AppIcon from "@/app/components/ui/AppIcon";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";
import { showAlert } from "@/app/utils/showAlert";
import { client } from "@/sanityClient";
import { supportQuery } from "@/app/hooks/useQuery";

type FaqItem = { question: string; answer: string };

const SUPPORT_DOC_ID = "support-settings";

export default function AdminSupportScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const [docId, setDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const doc = await client.fetch<{
        _id?: string;
        email?: string;
        phone?: string;
        whatsapp?: string;
        faqs?: FaqItem[];
      }>(supportQuery);
      if (doc) {
        setDocId(doc._id ?? null);
        setEmail(typeof doc.email === "string" ? doc.email : "");
        setPhone(typeof doc.phone === "string" ? doc.phone : "");
        setWhatsapp(typeof doc.whatsapp === "string" ? doc.whatsapp : "");
        setFaqs(
          Array.isArray(doc.faqs)
            ? doc.faqs
                .filter((item) => item && (item.question || item.answer))
                .map((item) => ({
                  question: String(item.question ?? ""),
                  answer: String(item.answer ?? ""),
                }))
            : [],
        );
      }
    } catch (error) {
      console.error("[AdminSupport] Load error:", error);
      showAlert("Could not load", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateFaq = (index: number, patch: Partial<FaqItem>) => {
    setFaqs((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeFaq = (index: number) => {
    setFaqs((current) => current.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !trimmedEmail.includes("@")) {
      showAlert("Check the email", "Enter a valid support email address.");
      return;
    }

    const cleanedFaqs = faqs
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer)
      .map((item, index) => ({ _key: `faq-${index}`, ...item }));

    const payload = {
      email: trimmedEmail,
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      faqs: cleanedFaqs,
    };

    setSaving(true);
    try {
      if (docId) {
        await client.patch(docId).set(payload).commit();
      } else {
        const created = await client.create({
          _id: SUPPORT_DOC_ID,
          _type: "support",
          ...payload,
        });
        setDocId(created._id);
      }
      showAlert("Saved", "The Help & Support details were updated.");
      router.back();
    } catch (error: any) {
      console.error("[AdminSupport] Save error:", error);
      showAlert("Could not save", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader
        title="Help & support"
        subtitle="Contact details and answers"
        showBack
      />
      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 80,
          }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText
            variant="caption"
            tone="secondary"
            style={{ marginTop: spacing.md }}
          >
            Loading…
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.gutter,
            paddingBottom: 64,
            gap: spacing.md,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radii.xl,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <ThemedText variant="title3">Contact details</ThemedText>

            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="caption" tone="secondary">
                Support email — opens the mail app
              </ThemedText>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="support@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  minHeight: 48,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceAlt,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  color: theme.textPrimary,
                }}
              />
            </View>

            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="caption" tone="secondary">
                Support phone — opens the phone app
              </ThemedText>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="+46 70 123 45 67"
                keyboardType="phone-pad"
                style={{
                  minHeight: 48,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceAlt,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  color: theme.textPrimary,
                }}
              />
            </View>

            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="caption" tone="secondary">
                WhatsApp number — opens WhatsApp
              </ThemedText>
              <Input
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="+46 70 123 45 67"
                keyboardType="phone-pad"
                style={{
                  minHeight: 48,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceAlt,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  color: theme.textPrimary,
                }}
              />
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radii.xl,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <ThemedText variant="title3">
              Frequently asked questions
            </ThemedText>
            {faqs.map((item, index) => (
              <View
                key={index}
                style={{
                  borderWidth: 1,
                  borderColor: theme.borderSubtle,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  gap: spacing.sm,
                  backgroundColor: theme.surfaceAlt,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <ThemedText variant="caption" tone="secondary">
                    Question {index + 1}
                  </ThemedText>
                  <PressableScale
                    onPress={() => removeFaq(index)}
                    haptic="light"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove question ${index + 1}`}
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AppIcon
                      name="trash-outline"
                      size={17}
                      color={theme.textQuaternary}
                    />
                  </PressableScale>
                </View>
                <Input
                  value={item.question}
                  onChangeText={(value) => updateFaq(index, { question: value })}
                  placeholder="Question"
                  multiline
                  style={{
                    color: theme.textPrimary,
                    borderBottomWidth: 1,
                    borderColor: theme.borderSubtle,
                    paddingBottom: spacing.xs,
                  }}
                />
                <Input
                  value={item.answer}
                  onChangeText={(value) => updateFaq(index, { answer: value })}
                  placeholder="Answer"
                  multiline
                  style={{ color: theme.textPrimary }}
                />
              </View>
            ))}
            <PressableScale
              onPress={() => setFaqs((current) => [...current, { question: "", answer: "" }])}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="Add a question"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.xs,
                minHeight: 46,
                borderRadius: radii.md,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.border,
              }}
            >
              <AppIcon name="add" size={18} color={theme.primary} />
              <ThemedText variant="bodySm" color={theme.primary}>
                Add a question
              </ThemedText>
            </PressableScale>
          </View>

          <PrimaryButton
            label={saving ? "Saving…" : "Save changes"}
            onPress={handleSave}
            loading={saving}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
