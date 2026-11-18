import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
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
  connected: boolean;
  businessNumber?: string | null;
  lastError?: string | null;
  sanityWritable: boolean;
  allowAll: boolean;
  adminNumbers: number;
  numbers: VerifiedNumber[];
  ready: boolean;
};

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
 * Link a number, then publish.
 *
 * No Meta app, no tokens, no webhook: the server holds a WhatsApp session.
 * Link it once by scanning the QR (or by pairing code), add the numbers that
 * may publish, and anything they send to the business number appears in News.
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

  const [qr, setQr] = useState<string | null>(null);
  const [pairPhone, setPairPhone] = useState("");
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairBusy, setPairBusy] = useState(false);

  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

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

  const loadQr = useCallback(async () => {
    try {
      const response = await fetch(`${serverBase}/api/whatsapp/qr`);
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      setQr(payload?.qr ?? null);
    } catch {
      /* keep the previous QR */
    }
  }, [serverBase]);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);

      const [statusResult, newsResult] = await Promise.allSettled([
        probe(),
        client.fetch<WhatsappNews[]>(NEWS_QUERY),
      ]);

      if (statusResult.status === "fulfilled") {
        setStatus(statusResult.value.status);
        setServerBase(statusResult.value.base);
        setStatusError(false);
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

  // A light status check that does not touch the news list.
  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch(`${serverBase}/api/whatsapp/status`);
      if (!response.ok) return;
      setStatus((await response.json()) as GatewayStatus);
    } catch {
      /* keep the previous state */
    }
  }, [serverBase]);

  // While the session is not linked, keep the QR fresh (codes rotate) and
  // watch for the moment pairing succeeds, so the panel flips on its own.
  useEffect(() => {
    if (!status || status.connected || statusError) return;
    void loadQr();
    const timer = setInterval(() => {
      void loadQr();
      void refreshStatus();
    }, 8000);
    return () => clearInterval(timer);
  }, [status, statusError, loadQr, refreshStatus]);

  // The QR is single-use: once linked, stop showing the old one.
  useEffect(() => {
    if (status?.connected) {
      setQr(null);
      setPairCode(null);
    }
  }, [status?.connected]);

  const requestCode = async () => {
    const trimmed = pairPhone.trim();
    if (trimmed.replace(/[^0-9]/g, "").length < 8) {
      showAlert("Check the number", "Enter the business number including the country code.");
      return;
    }
    setPairBusy(true);
    try {
      const response = await fetch(`${serverBase}/api/whatsapp/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Server answered ${response.status}`);
      setPairCode(String(payload.code));
    } catch (error: any) {
      showAlert("Could not get a code", error?.message || "The admin server did not respond.");
    } finally {
      setPairBusy(false);
    }
  };

  const logout = () => {
    showAlert("Log out", "The server will unlink WhatsApp. Scan a new QR to link again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${serverBase}/api/whatsapp/logout`, { method: "POST" });
            setPairCode(null);
            await load();
          } catch {
            showAlert("Could not log out", "The admin server did not respond.");
          }
        },
      },
    ]);
  };

  const addNumber = async () => {
    const trimmed = phone.trim();
    if (trimmed.replace(/[^0-9]/g, "").length < 8) {
      showAlert("Check the number", "Enter the full number including the country code.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${serverBase}/api/whatsapp/numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Server answered ${response.status}`);

      setPhone("");
      showAlert(
        "Number added",
        `${maskPhone(payload.phone)} can now publish news by sending a photo or video to the business number.`,
      );
      await load();
    } catch (error: any) {
      showAlert("Could not add number", error?.message || "The admin server did not respond.");
    } finally {
      setBusy(false);
    }
  };

  const setAllowAll = async (value: boolean) => {
    setSettingsBusy(true);
    setStatus((current) => (current ? { ...current, allowAll: value } : current)); // optimistic
    try {
      const response = await fetch(`${serverBase}/api/whatsapp/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowAll: value }),
      });
      if (!response.ok) throw new Error(`Server answered ${response.status}`);
    } catch (error: any) {
      setStatus((current) => (current ? { ...current, allowAll: !value } : current));
      showAlert("Could not save", error?.message || "The admin server did not respond.");
    } finally {
      setSettingsBusy(false);
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

  const numbers = status?.numbers ?? [];
  const connected = Boolean(status?.connected);
  const stateLabel = loading
    ? "Checking"
    : connected
      ? "Connected"
      : statusError
        ? "Server offline"
        : "Not linked";
  const stateTone: BadgeTone = loading ? "info" : connected ? "success" : statusError ? "danger" : "warning";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScreenHeader title="WhatsApp news" subtitle="Link a number, then just send media" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: 64 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }
      >
        {/* Link / allowed numbers */}
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
              <ThemedText variant="headline">{connected ? "Connected" : "Link WhatsApp"}</ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                {connected
                  ? status?.businessNumber
                    ? `Linked as +${status.businessNumber}`
                    : "Session is live"
                  : "Scan the QR or pair with the number"}
              </ThemedText>
            </View>
            <Badge label={stateLabel} tone={stateTone} />
          </View>

          {statusError && !loading ? (
            <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: spacing.md }}>
              {`No admin server answered at ${serverCandidates().join(" or ")}. Start it with npm run server.`}
            </ThemedText>
          ) : null}

          {!connected && !statusError ? (
            <View style={{ marginTop: spacing.lg, alignItems: "center", gap: spacing.md }}>
              {qr ? (
                <Image
                  source={{ uri: qr }}
                  style={{ width: 220, height: 220, borderRadius: radii.md, backgroundColor: "#fff" }}
                />
              ) : (
                <View style={{ paddingVertical: spacing.xl }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}
              <ThemedText variant="bodySm" tone="secondary" align="center">
                WhatsApp → Linked devices → Link a device, then scan the code.
              </ThemedText>

              <ThemedText variant="caption" tone="tertiary">
                No camera handy? Pair with the number instead:
              </ThemedText>
              <View style={{ flexDirection: "row", gap: spacing.sm, width: "100%" }}>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="+46 70 123 45 67"
                    value={pairPhone}
                    onChangeText={setPairPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <PrimaryButton
                  label="Get code"
                  onPress={requestCode}
                  loading={pairBusy}
                  disabled={pairBusy}
                />
              </View>
              {pairCode ? (
                <View style={{ alignItems: "center", gap: 4 }}>
                  <ThemedText
                    variant="title1"
                    translate={false}
                    style={{ letterSpacing: 5 }}
                  >
                    {pairCode}
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary" align="center">
                    {`${pairCode.length} characters. On the phone: Linked devices → Link with phone number instead, then type this code.`}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Who may publish: any number, admin-approved. Works whether or not
              the session is linked yet, so numbers can be prepared up front. */}
          <View style={{ marginTop: spacing.lg }}>
            <ThemedText variant="bodySm" style={{ fontWeight: "700", marginBottom: spacing.sm }}>
              Who can publish
            </ThemedText>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                paddingVertical: spacing.xs,
              }}
            >
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodySm">Any WhatsApp number</ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  No list to maintain — everyone can publish.
                </ThemedText>
              </View>
              <Switch
                value={Boolean(status?.allowAll)}
                onValueChange={setAllowAll}
                disabled={settingsBusy || statusError || !status}
                trackColor={{ true: theme.primary, false: theme.border }}
              />
            </View>

            {!status?.allowAll ? (
              <>
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.borderSubtle,
                    marginVertical: spacing.sm,
                  }}
                />
                <ThemedText variant="caption" tone="secondary" style={{ marginBottom: spacing.sm }}>
                  Or allow only the numbers you add:
                </ThemedText>
                <Input
                  placeholder="+46 70 987 65 43"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <PrimaryButton
                  label={numbers.length ? "Add another number" : "Add number"}
                  onPress={addNumber}
                  loading={busy}
                  disabled={busy}
                  style={{ marginTop: spacing.md }}
                />
              </>
            ) : null}

            <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
              {status?.businessNumber
                ? `Either way, they publish by sending a photo or video to +${String(status.businessNumber).replace(/[^0-9]/g, "")}.`
                : "Either way, they publish by sending a photo or video to the linked number."}
            </ThemedText>

            {connected ? (
              <PressableScale
                onPress={logout}
                accessibilityRole="button"
                accessibilityLabel="Log out of WhatsApp"
                haptic="light"
                style={{ marginTop: spacing.sm, alignSelf: "flex-start" }}
              >
                <ThemedText variant="caption" tone="secondary" style={{ textDecorationLine: "underline" }}>
                  Log out and link a different number
                </ThemedText>
              </PressableScale>
            ) : null}
          </View>
        </View>

        {/* Allowed numbers */}
        {numbers.length ? (
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Allowed numbers" subtitle="They can publish by sending media" />
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
                        : "Allowed"}
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
                  Allowed numbers can send a photo or video; it appears here and in News.
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
