import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  bridgeActive?: boolean;
  bridgeNote?: string | null;
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
function localServerUrl(port: number = 3000) {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:${port}` : `http://localhost:${port}`;
}

/** The gateway's dedicated port (server default 4100), separate from the API. */
const GATEWAY_PORT = Number(process.env.EXPO_PUBLIC_WHATSAPP_GATEWAY_PORT || 4100);

/** Where the admin typed the gateway address, if the auto-detection missed. */
const GATEWAY_ADDRESS_KEY = "whatsappGatewayAddress";

/**
 * fetch that always settles. An unreachable IP can hang for minutes, which is
 * exactly what left the panel spinning with no QR and no error.
 */
async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 6000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error((payload as { error?: string })?.error || `answered ${response.status}`);
    return payload as T;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error(`no answer in ${Math.round(timeoutMs / 1000)}s`);
    throw new Error(error?.message || "unreachable");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Candidate admin servers, most likely first: the local one in development,
 * then the deployed host from `EXPO_PUBLIC_SERVER_URL`.
 */
function serverCandidates(): string[] {
  const extra = Constants.expoConfig?.extra as { serverUrl?: string } | undefined;
  const configured = (process.env.EXPO_PUBLIC_SERVER_URL || extra?.serverUrl || "").replace(/\/$/, "");
  const gateway = localServerUrl(GATEWAY_PORT);
  const order = __DEV__ ? [gateway, localServerUrl(), configured] : [configured, gateway, localServerUrl()];
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

  const [manualAddress, setManualAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState("");
  const [attempts, setAttempts] = useState<{ base: string; ok: boolean; error?: string }[]>([]);

  const probe = useCallback(async (): Promise<{ status: GatewayStatus; base: string }> => {
    const bases = Array.from(new Set([manualAddress, ...serverCandidates()].filter(Boolean)));
    const answered: { status: GatewayStatus; base: string }[] = [];
    const tried: { base: string; ok: boolean; error?: string }[] = [];

    const checks = await Promise.allSettled(
      bases.map(async (base) => {
        const res = await fetchJson<GatewayStatus>(`${base}/api/whatsapp/status`, undefined, 4000);
        return { base, status: res };
      })
    );

    checks.forEach((check, index) => {
      const base = bases[index];
      if (check.status === "fulfilled") {
        answered.push({ status: check.value.status, base: check.value.base });
        tried.push({ base, ok: true });
      } else {
        tried.push({ base, ok: false, error: check.reason?.message || "unreachable" });
      }
    });

    setAttempts(tried);

    // Prefer manualAddress if provided and it has bridgeActive
    const manualResult = answered.find((item) => item.base === manualAddress);
    if (manualResult && manualResult.status.bridgeActive) return manualResult;

    // Prefer the server that actually holds the session: a deployed API can
    // answer this call while having no WhatsApp bridge at all.
    const withBridge = answered.find((item) => item.status.bridgeActive);
    if (withBridge) return withBridge;
    if (manualResult) return manualResult;
    if (answered.length) return answered[0];
    throw new Error(tried.map((item) => `${item.base}: ${item.error}`).join(" · "));
  }, [manualAddress]);

  const loadQr = useCallback(async () => {
    try {
      const payload = await fetchJson<{ qr?: string | null }>(`${serverBase}/api/whatsapp/qr`, undefined, 5000);
      setQr(payload?.qr ?? null);
    } catch {
      /* keep the previous QR — the address section shows why it failed */
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

  // Restore a gateway address typed earlier (phones cannot always guess it).
  useEffect(() => {
    AsyncStorage.getItem(GATEWAY_ADDRESS_KEY)
      .then((saved) => {
        if (saved) {
          setManualAddress(saved);
          setAddressDraft(saved);
        }
      })
      .catch(() => {});
  }, []);

  const saveAddress = async () => {
    const raw = addressDraft.trim().replace(/\/$/, "");
    const value = raw && !/^https?:\/\//i.test(raw) ? `http://${raw}` : raw;
    setManualAddress(value);
    setAddressDraft(value);
    setQr(null);
    try {
      if (value) await AsyncStorage.setItem(GATEWAY_ADDRESS_KEY, value);
      else await AsyncStorage.removeItem(GATEWAY_ADDRESS_KEY);
    } catch {
      /* storage is best-effort */
    }
    if (value) {
      setLoading(true);
      try {
        const testStatus = await fetchJson<GatewayStatus>(`${value}/api/whatsapp/status`, undefined, 4000);
        setStatus(testStatus);
        setServerBase(value);
        setStatusError(false);
        showAlert(
          "Ansluten",
          testStatus.bridgeActive
            ? "Servern är ansluten och WhatsApp-sessionen är aktiv!"
            : "Servern svarade, men WhatsApp-bryggan körs inte på den adressen."
        );
      } catch (err: any) {
        showAlert("Kunde inte ansluta", `Kunde inte nå ${value}: ${err?.message || "unreachable"}`);
      } finally {
        setLoading(false);
      }
    } else {
      void load(true);
    }
  };

  // A light status check that does not touch the news list.
  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await fetchJson<GatewayStatus>(`${serverBase}/api/whatsapp/status`, undefined, 5000));
    } catch {
      /* keep the previous state */
    }
  }, [serverBase]);

  // While the session is not linked, keep the QR fresh (codes rotate) and
  // watch for the moment pairing succeeds, so the panel flips on its own.
  useEffect(() => {
    if (status?.connected || statusError) return;
    void loadQr();
    const timer = setInterval(() => {
      void loadQr();
      void refreshStatus();
    }, 8000);
    return () => clearInterval(timer);
  }, [status?.connected, statusError, loadQr, refreshStatus]);

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
      showAlert("Kontrollera numret", "Ange företagets nummer inklusive landsnummer.");
      return;
    }
    setPairBusy(true);
    try {
      const payload = await fetchJson<{ code: string }>(`${serverBase}/api/whatsapp/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      }, 20000);
      setPairCode(String(payload.code));
    } catch (error: any) {
      showAlert("Kunde inte hämta kod", error?.message || "Administratörsservern svarade inte.");
    } finally {
      setPairBusy(false);
    }
  };

  const logout = () => {
    showAlert("Logga ut", "Servern kopplar bort WhatsApp. Skanna en ny QR-kod för att länka igen.", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Logga ut",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`${serverBase}/api/whatsapp/logout`, { method: "POST" });
            setPairCode(null);
            await load();
          } catch {
            showAlert("Kunde inte logga ut", "Administratörsservern svarade inte.");
          }
        },
      },
    ]);
  };

  const addNumber = async () => {
    const trimmed = phone.trim();
    if (trimmed.replace(/[^0-9]/g, "").length < 8) {
      showAlert("Kontrollera numret", "Ange hela numret inklusive landsnummer.");
      return;
    }

    setBusy(true);
    try {
      const payload = await fetchJson<{ phone: string }>(`${serverBase}/api/whatsapp/numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });

      setPhone("");
      showAlert(
        "Nummer tillagt",
        `${maskPhone(payload.phone)} kan nu publicera nyheter genom att skicka ett foto eller en video till företagsnumret.`,
      );
      await load();
    } catch (error: any) {
      showAlert("Kunde inte lägga till nummer", error?.message || "Administratörsservern svarade inte.");
    } finally {
      setBusy(false);
    }
  };

  const setAllowAll = async (value: boolean) => {
    setSettingsBusy(true);
    setStatus((current) => (current ? { ...current, allowAll: value } : current)); // optimistic
    try {
      await fetchJson(`${serverBase}/api/whatsapp/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowAll: value }),
      });
    } catch (error: any) {
      setStatus((current) => (current ? { ...current, allowAll: !value } : current));
      showAlert("Kunde inte spara", error?.message || "Administratörsservern svarade inte.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const revoke = (number: VerifiedNumber) => {
    showAlert(
      "Ta bort nummer",
      `${maskPhone(number.phone)} kan inte längre publicera via WhatsApp.`,
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Ta bort",
          style: "destructive",
          onPress: async () => {
            try {
              await fetchJson(`${serverBase}/api/whatsapp/numbers/${number.phone}`, { method: "DELETE" });
              await load();
            } catch {
              showAlert("Kunde inte ta bort", "Administratörsservern svarade inte.");
            }
          },
        },
      ],
    );
  };

  const numbers = status?.numbers ?? [];
  const connected = Boolean(status?.connected);
  // The server answered but has no WhatsApp session (e.g. the Vercel API).
  const bridgeDown = Boolean(!connected && status && status.bridgeActive === false);
  const stateLabel = loading
    ? "Kontrollerar"
    : connected
      ? "Ansluten"
      : statusError
        ? "Servern offline"
        : "Inte länkat";
  const stateTone: BadgeTone = loading ? "info" : connected ? "success" : statusError ? "danger" : "warning";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScreenHeader title="WhatsApp-nyheter" subtitle="Länka ett nummer, skicka sedan media" showBack />

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
              <ThemedText variant="headline">{connected ? "Ansluten" : "Länka WhatsApp"}</ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                {connected
                  ? status?.businessNumber
                    ? `Länkad som +${status.businessNumber}`
                    : "Sessionen är aktiv"
                  : "Skanna QR-koden eller para ihop med numret"}
              </ThemedText>
            </View>
            <Badge label={stateLabel} tone={stateTone} />
          </View>

          {statusError && !loading ? (
            <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: spacing.md }}>
              {`Ingen administratörsserver svarade på ${serverCandidates().join(" eller ")}. Starta den med npm run server.`}
            </ThemedText>
          ) : null}

          {bridgeDown ? (
            <View
              style={{
                marginTop: spacing.md,
                padding: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: theme.borderSubtle,
                gap: 4,
              }}
            >
              <ThemedText variant="bodySm" style={{ fontWeight: "700" }}>
                Gatewayen körs inte på denna server
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                {status?.bridgeNote
                  || `Starta den med npm run server på maskinen som ska hålla WhatsApp-sessionen, dra sedan nedåt för att uppdatera. Denna vy kommunicerar med ${serverBase}.`}
              </ThemedText>
              {status?.lastError ? (
                <ThemedText variant="caption" tone="tertiary">{`Senaste fel: ${status.lastError}`}</ThemedText>
              ) : null}
            </View>
          ) : null}

          {!connected && !statusError && !bridgeDown ? (
            <View style={{ marginTop: spacing.lg, alignItems: "center", gap: spacing.md }}>
              {qr ? (
                <Image
                  source={{ uri: qr }}
                  style={{ width: 220, height: 220, borderRadius: radii.md, backgroundColor: "#fff" }}
                />
              ) : (
                <View style={{ paddingVertical: spacing.xl, alignItems: "center", gap: spacing.sm }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <ThemedText variant="caption" tone="tertiary" align="center">
                    {status?.lastError
                      ? `Försöker igen efter: ${status.lastError}`
                      : "Startar WhatsApp-sessionen…"}
                  </ThemedText>
                </View>
              )}
              <ThemedText variant="bodySm" tone="secondary" align="center">
                WhatsApp → Länkade enheter → Länka en enhet, skanna sedan koden.
              </ThemedText>

              <ThemedText variant="caption" tone="tertiary">
                Ingen kamera till hands? Para ihop med telefonnummer istället:
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
                  label="Hämta kod"
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
                    {`${pairCode.length} tecken. På telefonen: Länkade enheter → Länka med telefonnummer istället, ange sedan denna kod.`}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Who may publish: any number, admin-approved. Works whether or not
              the session is linked yet, so numbers can be prepared up front. */}
          <View style={{ marginTop: spacing.lg }}>
            <ThemedText variant="bodySm" style={{ fontWeight: "700", marginBottom: spacing.sm }}>
              Vem kan publicera
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
                <ThemedText variant="bodySm">Alla WhatsApp-nummer</ThemedText>
                <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  Ingen lista behövs — alla kan publicera.
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
                  Eller tillåt endast nummer du lägger till:
                </ThemedText>
                <Input
                  placeholder="+46 70 987 65 43"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <PrimaryButton
                  label={numbers.length ? "Lägg till ytterligare ett nummer" : "Lägg till nummer"}
                  onPress={addNumber}
                  loading={busy}
                  disabled={busy}
                  style={{ marginTop: spacing.md }}
                />
              </>
            ) : null}

            <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
              {status?.businessNumber
                ? `Oavsett vilket publicerar de genom att skicka ett foto eller en video till +${String(status.businessNumber).replace(/[^0-9]/g, "")}.`
                : "Oavsett vilket publicerar de genom att skicka ett foto eller en video till det länkade numret."}
            </ThemedText>

            {connected ? (
              <PressableScale
                onPress={logout}
                accessibilityRole="button"
                accessibilityLabel="Logga ut från WhatsApp"
                haptic="light"
                style={{ marginTop: spacing.sm, alignSelf: "flex-start" }}
              >
                <ThemedText variant="caption" tone="secondary" style={{ textDecorationLine: "underline" }}>
                  Logga ut och länka ett annat nummer
                </ThemedText>
              </PressableScale>
            ) : null}
          </View>
        </View>

        {/* Gateway address: for when the phone cannot guess the computer's IP. */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader
            title="Gateway-adress"
            subtitle={serverBase ? `Använder ${serverBase}` : "Inte inställd"}
          />
          <Input
            placeholder="http://192.168.8.44:4100"
            value={addressDraft}
            onChangeText={setAddressDraft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <PrimaryButton
            label="Använd denna adress"
            onPress={saveAddress}
            style={{ marginTop: spacing.md }}
          />
          {attempts.length ? (
            <View style={{ marginTop: spacing.sm, gap: 2 }}>
              {attempts.map((item) => (
                <ThemedText
                  key={item.base}
                  variant="caption"
                  tone="tertiary"
                  translate={false}
                >
                  {`${item.ok ? "OK" : "X"}  ${item.base}${item.ok ? "" : ` — ${item.error}`}`}
                </ThemedText>
              ))}
            </View>
          ) : null}
        </View>

        {/* Allowed numbers */}
        {numbers.length ? (
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Tillåtna nummer" subtitle="De kan publicera genom att skicka media" />
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
                        : "Tillåten"}
                    </ThemedText>
                  </View>
                  <PressableScale
                    onPress={() => revoke(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ta bort ${maskPhone(item.phone)}`}
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
            title="Publicerat från WhatsApp"
            subtitle={news.length ? `${news.length} aktiva i appen` : "Skicka ett foto eller en video för att börja"}
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
                  Tillåtna nummer kan skicka ett foto eller en video; det visas här och i Nyheter.
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
