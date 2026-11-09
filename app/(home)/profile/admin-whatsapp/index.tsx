import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import AppIcon from "@/app/components/ui/AppIcon";
import Badge, { type BadgeTone } from "@/app/components/ui/Badge";
import Input from "@/app/components/ui/Input";
import PressableScale from "@/app/components/ui/PressableScale";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import SectionHeader from "@/app/components/ui/SectionHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { client } from "@/sanityClient";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { currentDateLocale, formatRelativeTime } from "@/app/lib/time";
import { showAlert } from "@/app/utils/showAlert";

type VerifiedNumber = { phone: string; verifiedAt?: string };

type GatewayStatus = {
  webhookUrl: string;
  businessNumber?: string | null;
  verifyTokenConfigured: boolean;
  appSecretConfigured: boolean;
  accessTokenConfigured: boolean;
  phoneNumberIdConfigured: boolean;
  sanityWritable: boolean;
  adminNumbers: number;
  numbers: VerifiedNumber[];
  ready: boolean;
};

type PendingCode = { phone: string; code: string; expiresAt: string; businessNumber?: string | null };

type WhatsappNews = {
  id: string;
  title: string;
  slug?: string;
  publishedAt?: string;
  mediaType?: "image" | "video";
  imageUrl?: string;
  sender?: string;
};

const NEWS_QUERY = `*[_type == "announcement" && source == "whatsapp"] | order(date desc)[0...20]{
  "id": _id,
  title,
  "slug": slug.current,
  "publishedAt": coalesce(publishedAt, date),
  "mediaType": media.type,
  "imageUrl": media.image.asset->url,
  "sender": whatsappSender
}`;

/** The admin server running beside the app, as seen from a simulator or phone. */
function localServerUrl() {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:3000` : "http://localhost:3000";
}

/**
 * Candidate admin servers, most likely first: the local one in development,
 * then the deployed host from `EXPO_PUBLIC_SERVER_URL`.
 */
function serverCandidates(): string[] {
  const extra = Constants.expoConfig?.extra as { serverUrl?: string } | undefined;
  const configured = (process.env.EXPO_PUBLIC_SERVER_URL || extra?.serverUrl || "").replace(/\/$/, "");
  const order = __DEV__ ? [localServerUrl(), configured] : [configured, localServerUrl()];
  return Array.from(new Set(order.filter(Boolean)));
}

function maskPhone(phone: string) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  return digits.length > 4 ? `${digits.slice(0, 3)}•••${digits.slice(-3)}` : digits;
}

/**
 * Connect a number, verify it, publish.
 *
 * The panel never asks for tokens or webhook details: an admin types the number
 * that may publish, sends the generated code from WhatsApp to the business
 * number, and the gateway adds it to the allowed senders.
 */
export default function AdminWhatsappScreen() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [serverBase, setServerBase] = useState(serverCandidates()[0] ?? "");
  const [statusError, setStatusError] = useState(false);
  const [news, setNews] = useState<WhatsappNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState<PendingCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const pendingRef = useRef<PendingCode | null>(null);
  pendingRef.current = pending;

  const probe = useCallback(async (): Promise<{ status: GatewayStatus; base: string }> => {
    let lastError: unknown = new Error("No admin server is configured");
    for (const base of serverCandidates()) {
      try {
        const response = await fetch(`${base}/api/whatsapp/status`);
        if (!response.ok) throw new Error(`${base} answered ${response.status}`);
        return { status: (await response.json()) as GatewayStatus, base };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }, []);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);

      const [statusResult, newsResult] = await Promise.allSettled([
        probe(),
        client.fetch<WhatsappNews[]>(NEWS_QUERY),
      ]);

      if (statusResult.status === "fulfilled") {
        const next = statusResult.value.status;
        setStatus(next);
        setServerBase(statusResult.value.base);
        setStatusError(false);

        // Stop waiting once the code has been accepted.
        const waiting = pendingRef.current;
        if (waiting && (next.numbers || []).some((item) => item.phone === waiting.phone)) {
          setPending(null);
          setPhone("");
          showAlert("Connected", `${maskPhone(waiting.phone)} can now publish news.`);
        }
      } else {
        setStatus(null);
        setServerBase(serverCandidates()[0] ?? localServerUrl());
        setStatusError(true);
      }

      setNews(newsResult.status === "fulfilled" && Array.isArray(newsResult.value) ? newsResult.value : []);
      setLoading(false);
      setRefreshing(false);
    },
    [probe],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while a code is outstanding, so the screen flips to Connected on its own.
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [pending, load]);

  const startVerification = async () => {
    const trimmed = phone.trim();
    if (trimmed.replace(/[^0-9]/g, "").length < 8) {
      showAlert("Check the number", "Enter the full number including the country code.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${serverBase}/api/whatsapp/verify/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Server answered ${response.status}`);

      setPending({
        phone: payload.phone,
        code: payload.code,
        expiresAt: payload.expiresAt,
        businessNumber: payload.businessNumber ?? status?.businessNumber ?? null,
      });
      setStatus((current) =>
        current ? { ...current, businessNumber: payload.businessNumber ?? current.businessNumber } : current,
      );
    } catch (error: any) {
      showAlert("Could not start verification", error?.message || "The admin server did not respond.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = (number: VerifiedNumber) => {
    showAlert(
      "Remove number",
      `${maskPhone(number.phone)} will no longer be able to publish from WhatsApp.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${serverBase}/api/whatsapp/numbers/${number.phone}`, { method: "DELETE" });
              await load();
            } catch {
              showAlert("Could not remove", "The admin server did not respond.");
            }
          },
        },
      ],
    );
  };

  const copyWebhook = async () => {
    await Clipboard.setStringAsync(status?.webhookUrl || `${serverBase}/api/whatsapp/webhook`);
    showAlert("Copied", "The webhook URL is on your clipboard.");
  };

  const numbers = status?.numbers ?? [];
  const connected = numbers.length > 0;
  const stateLabel = loading
    ? "Checking"
    : connected
      ? "Connected"
      : statusError
        ? "Server offline"
        : "Not connected";
  const stateTone: BadgeTone = loading ? "info" : connected ? "success" : statusError ? "danger" : "warning";

  const requirements = [
    { label: "Access token", done: status?.accessTokenConfigured, env: "WHATSAPP_TOKEN" },
    { label: "Phone number ID", done: status?.phoneNumberIdConfigured, env: "WHATSAPP_PHONE_NUMBER_ID" },
    { label: "Verify token", done: status?.verifyTokenConfigured, env: "WHATSAPP_VERIFY_TOKEN" },
    { label: "App secret", done: status?.appSecretConfigured, env: "WHATSAPP_APP_SECRET" },
    { label: "Sanity write access", done: status?.sanityWritable, env: "EXPO_PUBLIC_SANITY_TOKEN" },
  ];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScreenHeader title="WhatsApp news" subtitle="Verify a number, then just send media" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: 64 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }
      >
        {/* Connect / verify */}
        <View
          style={{
            padding: spacing.lg,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: connected ? theme.primary : theme.borderSubtle,
            backgroundColor: theme.surface,
            ...shadows.sm,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primarySoft,
              }}
            >
              <AppIcon name="logo-whatsapp" size={21} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline">{connected ? "Connected" : "Connect a number"}</ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                {connected ? "Verified numbers can publish" : "Two steps, no settings to copy"}
              </ThemedText>
            </View>
            <Badge label={stateLabel} tone={stateTone} />
          </View>

          {statusError && !loading ? (
            <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: spacing.md }}>
              {`No admin server answered at ${serverCandidates().join(" or ")}. Start it with npm run server.`}
            </ThemedText>
          ) : null}

          {pending ? (
            <View style={{ marginTop: spacing.lg }}>
              <ThemedText variant="bodySm" tone="secondary">
                1. Send this code from WhatsApp
              </ThemedText>
              <ThemedText
                variant="title1"
                translate={false}
                style={{ letterSpacing: 6, marginTop: spacing.sm, marginBottom: spacing.md }}
              >
                {pending.code}
              </ThemedText>
              <ThemedText variant="bodySm" tone="secondary">
                {`2. To ${pending.businessNumber ? `+${String(pending.businessNumber).replace(/[^0-9]/g, "")}` : "the business number"} from +${pending.phone}`}
              </ThemedText>

              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg }}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText variant="caption" tone="tertiary" style={{ flex: 1 }}>
                  Waiting for your message…
                </ThemedText>
                <PressableScale
                  onPress={() => setPending(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel verification"
                  haptic="light"
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: 8,
                    borderRadius: radii.md,
                    backgroundColor: theme.surfaceAlt,
                  }}
                >
                  <ThemedText variant="caption" tone="secondary">
                    Cancel
                  </ThemedText>
                </PressableScale>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: spacing.lg }}>
              <ThemedText variant="bodySm" style={{ fontWeight: "700", marginBottom: spacing.sm }}>
                WhatsApp number
              </ThemedText>
              <Input
                placeholder="+46 70 123 45 67"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <PrimaryButton
                label={connected ? "Verify another number" : "Get verification code"}
                onPress={startVerification}
                loading={busy}
                disabled={busy}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}
        </View>

        {/* Verified numbers */}
        {numbers.length ? (
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Verified numbers" subtitle="They can publish by sending media" />
            <View style={{ gap: spacing.sm }}>
              {numbers.map((item) => (
                <View
                  key={item.phone}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: theme.borderSubtle,
                    backgroundColor: theme.surface,
                  }}
                >
                  <AppIcon name="checkmark-circle" size={18} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodySm" translate={false} style={{ fontWeight: "700" }}>
                      {`+${item.phone}`}
                    </ThemedText>
                    <ThemedText variant="caption" tone="tertiary" translate={false} style={{ marginTop: 2 }}>
                      {item.verifiedAt
                        ? formatRelativeTime(item.verifiedAt, new Date(), currentDateLocale())
                        : "Verified"}
                    </ThemedText>
                  </View>
                  <PressableScale
                    onPress={() => revoke(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${maskPhone(item.phone)}`}
                    haptic="light"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.surfaceAlt,
                    }}
                  >
                    <AppIcon name="trash-outline" size={16} color={theme.textSecondary} />
                  </PressableScale>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Published from WhatsApp */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader
            title="Published from WhatsApp"
            subtitle={news.length ? `${news.length} live in the app` : "Send a photo or video to start"}
          />
          <View style={{ gap: spacing.sm }}>
            {news.map((item) => (
              <PressableScale
                key={item.id}
                onPress={() => item.slug && router.push(`/(home)/announcements/${item.slug}` as any)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                haptic="light"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: theme.borderSubtle,
                  backgroundColor: theme.surface,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: theme.surfaceAlt,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.mediaType === "image" && item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : (
                    <AppIcon
                      name={item.mediaType === "video" ? "videocam-outline" : "image-outline"}
                      size={20}
                      color={theme.primary}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySm" numberOfLines={1} style={{ fontWeight: "700" }}>
                    {item.title}
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 3 }} translate={false}>
                    {item.publishedAt
                      ? formatRelativeTime(item.publishedAt, new Date(), currentDateLocale())
                      : item.sender || "WhatsApp"}
                  </ThemedText>
                </View>
                <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />
              </PressableScale>
            ))}

            {!loading && news.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: spacing.xl,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: theme.borderSubtle,
                  backgroundColor: theme.surface,
                }}
              >
                <AppIcon name="logo-whatsapp" size={34} color={theme.textQuaternary} />
                <ThemedText
                  variant="bodySm"
                  tone="secondary"
                  align="center"
                  style={{ marginTop: spacing.sm, paddingHorizontal: spacing.lg }}
                >
                  Verified numbers can send a photo or video; it appears here and in News.
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {/* One-time server setup, collapsed */}
        <PressableScale
          onPress={() => setAdvanced((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel="Advanced setup"
          haptic="light"
          style={{
            marginTop: spacing.xl,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            paddingVertical: spacing.sm,
          }}
        >
          <AppIcon name={advanced ? "chevron-down" : "chevron-forward"} size={15} color={theme.textTertiary} />
          <ThemedText variant="caption" tone="secondary">
            Advanced setup
          </ThemedText>
        </PressableScale>

        {advanced ? (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: theme.borderSubtle,
                backgroundColor: theme.surface,
              }}
            >
              <ThemedText variant="caption" tone="secondary" translate={false} style={{ flex: 1 }}>
                {status?.webhookUrl || `${serverBase}/api/whatsapp/webhook`}
              </ThemedText>
              <PressableScale
                onPress={copyWebhook}
                accessibilityRole="button"
                accessibilityLabel="Copy webhook URL"
                haptic="light"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.primarySoft,
                }}
              >
                <AppIcon name="copy-outline" size={16} color={theme.primary} />
              </PressableScale>
            </View>

            {requirements.map((item) => (
              <View key={item.env} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm }}>
                <AppIcon
                  name={item.done ? "checkmark-circle" : "alert-circle-outline"}
                  size={15}
                  color={item.done ? theme.primary : theme.textQuaternary}
                />
                <ThemedText variant="caption" tone="tertiary" translate={false} style={{ flex: 1 }}>
                  {`${item.label} · ${item.env}`}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
