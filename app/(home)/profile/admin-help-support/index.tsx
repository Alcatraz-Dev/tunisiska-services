import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import Input from "@/app/components/ui/Input";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import PressableScale from "@/app/components/ui/PressableScale";
import AppIcon from "@/app/components/ui/AppIcon";
import Badge from "@/app/components/ui/Badge";
import EmptyState from "@/app/components/ui/EmptyState";
import { client } from "@/sanityClient";
import { helpSupportQuery } from "@/app/hooks/useQuery";
import { useAdminAccess } from "@/app/hooks/useAdminAccess";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { showAlert } from "@/app/utils/showAlert";
import type { FaqItem, HelpSupportData } from "@/app/schemas/serviceSchemas";

export default function AdminHelpSupportScreen() {
  const { resolvedTheme } = useTheme();
  const theme = useThemeColors();
  const router = useRouter();
  const { isAdmin, loading: checkingAdmin } = useAdminAccess();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [supportHours, setSupportHours] = useState("");
  const [responseNotice, setResponseNotice] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  // FAQ modal state
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [modalQuestion, setModalQuestion] = useState("");
  const [modalAnswer, setModalAnswer] = useState("");
  const [modalCategory, setModalCategory] = useState("");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data: HelpSupportData | null = await client.fetch(helpSupportQuery);
      if (data) {
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setWhatsapp(data.whatsapp || "");
        setSupportHours(data.supportHours || "");
        setResponseNotice(data.responseNotice || "");
        setHeroTitle(data.heroTitle || "");
        setHeroSubtitle(data.heroSubtitle || "");
        setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
      } else {
        // Fallback to env vars if document doesn't exist yet
        setEmail(process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "");
        setPhone(process.env.EXPO_PUBLIC_SUPPORT_PHONE || "");
        setWhatsapp(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || "");
        setHeroTitle("How can we help?");
        setHeroSubtitle("Choose a contact option or browse the information below.");
        setSupportHours("Måndag - Fredag: 08:00 - 18:00");
        setResponseNotice("Vi svarar oftast inom 1-2 timmar.");
        setFaqs([
          {
            _key: "faq-1",
            question: "Var hittar jag mina bokningar?",
            answer: "Öppna Mina sändningar från din profil för att se status och detaljer för dina bokningar.",
          },
          {
            _key: "faq-2",
            question: "Hur spårar jag ett paket?",
            answer: "Öppna Spåra i menyn Resor och fyll i ditt spårningsnummer från bokningen.",
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load help & support data:", err);
      showAlert("Error", "Could not load support information. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadData();
    }
  }, [isAdmin, loadData]);

  const handleSave = async () => {
    if (saving) return;

    if (email && !email.includes("@")) {
      showAlert("Invalid email", "Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const doc = {
        _type: "helpSupport" as const,
        _id: "helpSupport",
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        supportHours: supportHours.trim(),
        responseNotice: responseNotice.trim(),
        heroTitle: heroTitle.trim() || "How can we help?",
        heroSubtitle: heroSubtitle.trim() || "Choose a contact option or browse the information below.",
        faqs: faqs.map((f, idx) => ({
          ...f,
          _key: f._key || `faq-${idx}-${Date.now()}`,
        })),
        updatedAt: new Date().toISOString(),
      };

      await client.createOrReplace(doc);
      showAlert("Saved", "Help & Support information has been successfully updated!");
    } catch (err: any) {
      console.error("Failed to save help & support info:", err);
      showAlert("Error saving", err?.message || "Failed to update support info. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openAddFaq = () => {
    setEditingFaqIndex(null);
    setModalQuestion("");
    setModalAnswer("");
    setModalCategory("");
    setFaqModalVisible(true);
  };

  const openEditFaq = (index: number) => {
    const item = faqs[index];
    if (!item) return;
    setEditingFaqIndex(index);
    setModalQuestion(item.question);
    setModalAnswer(item.answer);
    setModalCategory(item.category || "");
    setFaqModalVisible(true);
  };

  const handleSaveModalFaq = () => {
    if (!modalQuestion.trim() || !modalAnswer.trim()) {
      showAlert("Required fields", "Both Question and Answer are required.");
      return;
    }

    const updatedItem: FaqItem = {
      _key: editingFaqIndex !== null && faqs[editingFaqIndex]?._key
        ? faqs[editingFaqIndex]._key
        : `faq-${Date.now()}`,
      question: modalQuestion.trim(),
      answer: modalAnswer.trim(),
      category: modalCategory.trim() || undefined,
    };

    if (editingFaqIndex !== null) {
      setFaqs((prev) => {
        const next = [...prev];
        next[editingFaqIndex] = updatedItem;
        return next;
      });
    } else {
      setFaqs((prev) => [...prev, updatedItem]);
    }

    setFaqModalVisible(false);
  };

  const handleDeleteFaq = (index: number) => {
    showAlert("Delete question", "Are you sure you want to delete this FAQ question?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setFaqs((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  if (checkingAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }}>
        <ScreenHeader title="Help & Support Admin" showBack />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: spacing.gutter }}>
          <EmptyState
            icon="lock-closed-outline"
            title="Admin Access Required"
            description="You need administrator privileges to change Help & Support settings."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader
        title="Edit Help & Support"
        subtitle="Manage contact channels, hours & FAQs"
        showBack
        right={
          <PressableScale
            onPress={() => router.push("/(home)/profile/help-support" as any)}
            haptic="light"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderRadius: radii.md,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
            }}
          >
            <AppIcon name="eye-outline" size={16} color={theme.primary} />
            <ThemedText variant="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              Preview
            </ThemedText>
          </PressableScale>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} tintColor={theme.primary} />}
        >
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.md }}>
                Loading settings…
              </ThemedText>
            </View>
          ) : (
            <View style={{ gap: spacing.xl, marginTop: spacing.sm }}>
              {/* SECTION: Direct Contact Channels */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm }}>
                  <AppIcon name="call-outline" size={18} color={theme.primary} />
                  <ThemedText variant="headline">Contact Channels</ThemedText>
                </View>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: spacing.md,
                    gap: spacing.md,
                    ...shadows.sm,
                  }}
                >
                  <View>
                    <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                      Support Email
                    </ThemedText>
                    <Input
                      placeholder="e.g. support@tunisiskaservices.se"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View>
                    <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                      Support Phone Number
                    </ThemedText>
                    <Input
                      placeholder="e.g. +46 70 123 45 67"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View>
                    <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                      WhatsApp Number
                    </ThemedText>
                    <Input
                      placeholder="e.g. +46 73 777 87 37"
                      value={whatsapp}
                      onChangeText={setWhatsapp}
                      keyboardType="phone-pad"
                    />
                    <ThemedText variant="footnote" tone="tertiary" style={{ marginTop: 4 }}>
                      Include country code (e.g. +46). WhatsApp links will be opened directly.
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* SECTION: Hours & Response Notice */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm }}>
                  <AppIcon name="time-outline" size={18} color={theme.primary} />
                  <ThemedText variant="headline">Hours & Availability</ThemedText>
                </View>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: spacing.md,
                    gap: spacing.md,
                    ...shadows.sm,
                  }}
                >
                  <View>
                    <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                      Opening / Working Hours
                    </ThemedText>
                    <Input
                      placeholder="e.g. Måndag - Fredag: 08:00 - 18:00"
                      value={supportHours}
                      onChangeText={setSupportHours}
                    />
                  </View>

                  <View>
                    <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                      Response Notice / SLA
                    </ThemedText>
                    <Input
                      placeholder="e.g. Vi svarar vanligtvis inom 1-2 timmar."
                      value={responseNotice}
                      onChangeText={setResponseNotice}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION: Hero Banner Text */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm }}>
                  <AppIcon name="color-palette-outline" size={18} color={theme.primary} />
                  <ThemedText variant="headline">Header & Banner Text</ThemedText>
                </View>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: spacing.md,
                    gap: spacing.md,
                    ...shadows.sm,
                  }}
                >
                  <View>
                    <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                      Hero Card Title
                    </ThemedText>
                    <Input
                      placeholder="e.g. Hur kan vi hjälpa dig?"
                      value={heroTitle}
                      onChangeText={setHeroTitle}
                    />
                  </View>

                  <View>
                    <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                      Hero Card Subtitle
                    </ThemedText>
                    <Input
                      placeholder="e.g. Välj ett kontaktalternativ eller läs vanliga frågor."
                      value={heroSubtitle}
                      onChangeText={setHeroSubtitle}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION: FAQs */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                    <AppIcon name="help-circle-outline" size={18} color={theme.primary} />
                    <ThemedText variant="headline">Frequently Asked Questions ({faqs.length})</ThemedText>
                  </View>
                  <PressableScale
                    onPress={openAddFaq}
                    haptic="light"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 5,
                      borderRadius: radii.md,
                      backgroundColor: theme.primarySoft,
                    }}
                  >
                    <AppIcon name="add" size={16} color={theme.primary} />
                    <ThemedText variant="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                      Add FAQ
                    </ThemedText>
                  </PressableScale>
                </View>

                {faqs.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: spacing.lg,
                      alignItems: "center",
                    }}
                  >
                    <ThemedText variant="bodySm" tone="secondary">
                      No FAQs added yet. Tap "Add FAQ" to create one.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ gap: spacing.sm }}>
                    {faqs.map((faq, index) => (
                      <View
                        key={faq._key || index}
                        style={{
                          backgroundColor: theme.surface,
                          borderRadius: radii.lg,
                          borderWidth: 1,
                          borderColor: theme.border,
                          padding: spacing.md,
                          ...shadows.sm,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm }}>
                          <View style={{ flex: 1, gap: 4 }}>
                            {faq.category ? (
                              <View style={{ alignSelf: "flex-start", marginBottom: 2 }}>
                                <Badge label={faq.category} tone="info" />
                              </View>
                            ) : null}
                            <ThemedText variant="headline" style={{ color: theme.textPrimary }}>
                              {faq.question}
                            </ThemedText>
                            <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: 2 }}>
                              {faq.answer}
                            </ThemedText>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <PressableScale
                              onPress={() => openEditFaq(index)}
                              haptic="light"
                              style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                            >
                              <AppIcon name="pencil" size={15} color={theme.primary} />
                            </PressableScale>
                            <PressableScale
                              onPress={() => handleDeleteFaq(index)}
                              haptic="light"
                              style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                            >
                              <AppIcon name="trash-outline" size={15} color="#DC2626" />
                            </PressableScale>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* SAVE BUTTON */}
              <View style={{ marginTop: spacing.md }}>
                <PrimaryButton
                  label={saving ? "Saving changes…" : "Save All Changes"}
                  onPress={handleSave}
                  disabled={saving}
                  loading={saving}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL FOR ADDING / EDITING FAQ */}
      <Modal
        visible={faqModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFaqModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: spacing.lg }}>
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: theme.border,
              gap: spacing.md,
              ...shadows.lg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <ThemedText variant="title3">
                {editingFaqIndex !== null ? "Edit FAQ Question" : "Add FAQ Question"}
              </ThemedText>
              <PressableScale onPress={() => setFaqModalVisible(false)} haptic="selection">
                <AppIcon name="close" size={22} color={theme.textTertiary} />
              </PressableScale>
            </View>

            <View>
              <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                Question *
              </ThemedText>
              <Input
                placeholder="e.g. Hur lång tid tar frakten?"
                value={modalQuestion}
                onChangeText={setModalQuestion}
              />
            </View>

            <View>
              <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                Answer *
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Write the detailed answer here…"
                placeholderTextColor={theme.textTertiary}
                value={modalAnswer}
                onChangeText={setModalAnswer}
                style={{
                  minHeight: 90,
                  backgroundColor: theme.surfaceAlt,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: spacing.md,
                  color: theme.textPrimary,
                  fontSize: 14,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <View>
              <ThemedText variant="caption" tone="secondary" style={{ marginBottom: 4 }}>
                Category (Optional)
              </ThemedText>
              <Input
                placeholder="e.g. Frakt, Bokning, Priser"
                value={modalCategory}
                onChangeText={setModalCategory}
              />
            </View>

            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <PressableScale
                  onPress={() => setFaqModalVisible(false)}
                  haptic="light"
                  style={{
                    height: 48,
                    borderRadius: radii.md,
                    backgroundColor: theme.surfaceAlt,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText variant="button" style={{ color: theme.textSecondary }}>
                    Cancel
                  </ThemedText>
                </PressableScale>
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label={editingFaqIndex !== null ? "Update" : "Add Question"}
                  onPress={handleSaveModalFaq}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
