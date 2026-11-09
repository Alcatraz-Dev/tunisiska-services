import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import AppIcon from "@/app/components/ui/AppIcon";
import Badge, { type BadgeTone } from "@/app/components/ui/Badge";
import Input from "@/app/components/ui/Input";
import PressableScale from "@/app/components/ui/PressableScale";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import VideoPlayer from "@/app/components/VideoPlayer";
import NotificationMedia from "@/app/components/NotificationMedia";
import { buildPushMessages } from "@/app/lib/pushPayload";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { useThemeColors } from "@/app/theme";
import { currentDateLocale } from "@/app/lib/time";
import { presentLocalNotification } from "@/app/lib/localNotification";
import { showAlert } from "@/app/utils/showAlert";
import {
  NotificationType,
  NOTIFICATION_TYPE_CONFIGS,
} from "@/app/types/notification";
import { client } from "@/sanityClient";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

type HistoryItem = {
  id: string;
  title: string;
  message: string;
  date?: string;
  status?: string;
  delivered?: number;
  failed?: number;
  imageUrl?: string;
  /** Still frame of a video, used as its thumbnail and Android push image. */
  posterUrl?: string;
  videoUrl?: string;
};

/** How a stored `notificationHistory.status` reads to an admin. */
const STATUS_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  sent: { label: "Delivered", tone: "success" },
  failed_push: { label: "Push failed", tone: "danger" },
  history_only: { label: "Saved only", tone: "warning" },
  sending: { label: "Sending", tone: "info" },
};

/**
 * Extract and upload a still frame so a video notification has a poster.
 *
 * `expo-video-thumbnails` is a native module, so it is imported lazily: a build
 * made before it was installed must still be able to send videos, just without
 * a poster frame, instead of crashing on import.
 */
async function createVideoPoster(videoUri: string): Promise<string | null> {
  try {
    const videoThumbnails = await import("expo-video-thumbnails");
    const frame = await videoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000,
      quality: 0.7,
    });
    const response = await fetch(frame.uri);
    const blob = await response.blob();
    const asset = await client.assets.upload("image", blob, {
      filename: `poster-${Date.now()}.jpg`,
    });
    return asset.url;
  } catch (error) {
    console.warn("Could not create a video poster:", error);
    return null;
  }
}

export default function AdminNotificationsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const theme = useThemeColors();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<NotificationType>("general");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<
    "image" | "video" | null
  >(null);
  const [imageUrl, setImageUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"send" | "sent">("send");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { language } = useLanguage();
  const deleteWord = useTranslationText("Delete", language);
  const removeMediaLabel = useTranslationText("Remove media", language);
  const refreshLabel = useTranslationText("Refresh", language);
  const imageLabel = useTranslationText("Image", language);
  const videoLabel = useTranslationText("Video", language);

  const fetchHistory = useCallback(async () => {
    setFetchingHistory(true);
    try {
      // Older rows only have `dateSent`, newer ones `sentAt`; sort by whichever
      // the document carries so the list is always newest first.
      const sanityHistory = await client.fetch(
        '*[_type == "notificationHistory"] | order(coalesce(sentAt, dateSent, _createdAt) desc)[0...100]',
      );

      const rows: HistoryItem[] = (Array.isArray(sanityHistory)
        ? sanityHistory
        : []
      )
        // Soft-deleted rows are tombstones for the user inbox: never listed.
        .filter((item: any) => item?.status !== "deleted")
        .map((item: any) => ({
        id: item._id,
        title: item.title || "",
        message: item.message || "",
        date: item.sentAt || item.dateSent || item._createdAt,
        status: item.status,
        delivered: item.delivered ?? 0,
        failed: item.failed ?? 0,
        imageUrl: item.posterUrl ?? item.imageUrl,
        videoUrl: item.videoUrl,
      }));

      setHistoryItems(rows);
    } catch (error) {
      console.warn("Error fetching notification history:", error);
    } finally {
      setFetchingHistory(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const pickMedia = async (mediaType: "image" | "video") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          mediaType === "image"
            ? ImagePicker.MediaTypeOptions.Images
            : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        setSelectedMediaType(mediaType);
        // Never attach a file from an earlier pick if this upload fails.
        setImageUrl("");
        setPosterUrl("");

        // Upload to Sanity
        setLoading(true);
        try {
          showAlert("Uploading…", "Please wait");

          const response = await fetch(asset.uri);
          const blob = await response.blob();

          const assetDoc = await client.assets.upload(
            mediaType === "image" ? "image" : "file",
            blob,
            { filename: asset.uri.split("/").pop() },
          );

          setImageUrl(assetDoc.url);

          // A tray notification cannot play a video. A still frame gives
          // Android a rich image and gives the app a thumbnail behind the play
          // button, so a video notification is recognisable at a glance.
          if (mediaType === "video") {
            const poster = await createVideoPoster(asset.uri);
            if (poster) setPosterUrl(poster);
          }

          showAlert("Uploaded", "The file has been uploaded.");
        } catch (error) {
          console.warn("Upload failed:", error);
          showAlert("Error", "The file could not be uploaded.");
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.warn("Error picking media:", error);
      showAlert("Error", "The photo library could not be opened.");
    }
  };

  /** Expo issues both `ExponentPushToken[...]` and `ExpoPushToken[...]`. */
  const isExpoToken = (token: unknown): token is string =>
    typeof token === "string" &&
    /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token.trim());

  const sendNotification = async () => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage) {
      showAlert("Warning", "Enter both a title and a message.");
      return;
    }

    setLoading(true);

    // 1. Save first. The push carries this document id, so the device can
    //    match a received notification to the inbox row it later syncs.
    let documentId: string;
    try {
      const document = await client.create({
        _type: "notificationHistory",
        title: cleanTitle,
        message: cleanMessage,
        type,
        imageUrl: selectedMediaType === "image" ? imageUrl : undefined,
        posterUrl:
          selectedMediaType === "video" ? posterUrl || undefined : undefined,
        videoUrl: selectedMediaType === "video" ? imageUrl : undefined,
        sentAt: new Date().toISOString(),
        status: "sending",
      });
      documentId = document._id;
    } catch (error) {
      console.warn("Sanity save failed:", error);
      showAlert("Error", "The notification could not be saved.");
      setLoading(false);
      return;
    }

    let delivered = 0;
    let failed = 0;
    let deviceCount = 0;

    try {
      // 2. Registered devices. A token is stored per user, and the same device
      //    can appear more than once after a re-install.
      const users = await client.fetch<
        { _id: string; expoPushToken?: string }[]
      >('*[_type == "users" && defined(expoPushToken)]{ _id, expoPushToken }');

      const ownersByToken = new Map<string, string[]>();
      users.forEach((user) => {
        const token = user.expoPushToken?.trim();
        if (!isExpoToken(token)) return;
        ownersByToken.set(token, [
          ...(ownersByToken.get(token) ?? []),
          user._id,
        ]);
      });

      const tokens = Array.from(ownersByToken.keys());
      deviceCount = tokens.length;

      const deadTokens: string[] = [];

      // 3. Expo accepts at most 100 messages per request, and answers with one
      //    ticket per message — a 200 response still contains per-device errors.
      for (let index = 0; index < tokens.length; index += 100) {
        const chunk = tokens.slice(index, index + 100);

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildPushMessages(chunk, {
              title: cleanTitle,
              message: cleanMessage,
              type,
              notificationId: documentId,
              imageUrl:
                selectedMediaType === "image"
                  ? imageUrl
                  : selectedMediaType === "video"
                    ? posterUrl || undefined
                    : undefined,
              videoUrl: selectedMediaType === "video" ? imageUrl : undefined,
            }),
          ),
        });

        if (!response.ok) {
          console.warn("Expo push request failed:", response.status);
          failed += chunk.length;
          continue;
        }

        const payload = await response.json().catch(() => null);
        const tickets: any[] = Array.isArray(payload?.data) ? payload.data : [];

        if (tickets.length !== chunk.length) {
          // Cannot attribute results; treat the batch as unconfirmed.
          failed += chunk.length;
          continue;
        }

        tickets.forEach((ticket, ticketIndex) => {
          if (ticket?.status === "ok") {
            delivered += 1;
            return;
          }
          failed += 1;
          if (ticket?.details?.error === "DeviceNotRegistered") {
            deadTokens.push(chunk[ticketIndex]);
          }
        });
      }

      // 4. Forget tokens Expo says no longer exist, so they stop failing.
      for (const token of deadTokens) {
        for (const userId of ownersByToken.get(token) ?? []) {
          await client
            .patch(userId)
            .unset(["expoPushToken"])
            .commit()
            .catch(() => {});
        }
      }
    } catch (error) {
      console.warn("Expo push delivery failed:", error);
    }

    const status =
      delivered > 0 ? "sent" : failed > 0 ? "failed_push" : "history_only";

    try {
      await client
        .patch(documentId)
        .set({ status, delivered, failed })
        .commit();
    } catch (error) {
      console.warn("Could not update notification status:", error);
    }

    if (delivered > 0) {
      showAlert(
        "Sent",
        `The notification reached ${delivered} of ${deviceCount} devices and was saved.`,
      );
    } else if (deviceCount === 0) {
      showAlert(
        "Saved",
        "The notification was saved to the history. No devices with a push token were found.",
      );
    } else {
      showAlert(
        "Push failed",
        "No device received the notification. It remains in the history.",
      );
    }

    setTitle("");
    setMessage("");
    setSelectedImage(null);
    setSelectedMediaType(null);
    setImageUrl("");
    setPosterUrl("");
    void fetchHistory();
    setLoading(false);
  };

  /**
   * Present a notification on *this* device.
   *
   * Simulators cannot receive remote push reliably, so this exercises the same
   * native presentation path (permission, channel, banner, shade) locally.
   */
  const sendTestNotification = async () => {
    setLoading(true);

    const result = await presentLocalNotification({
      title: title.trim() || "Test notification",
      body: message.trim() || "Test of notifications from Tunisiska Mega.",
      type,
      imageUrl:
        selectedMediaType === "image"
          ? imageUrl
          : selectedMediaType === "video"
            ? posterUrl || undefined
            : undefined,
    });

    setLoading(false);

    if (result.ok) {
      showAlert(
        "Test notification sent",
        "The notification appeared on this device.",
      );
      return;
    }

    if (result.reason === "permission") {
      showAlert(
        "Permission missing",
        "Allow notifications for the app in device settings and try again.",
      );
      return;
    }

    showAlert(
      "Could not show the notification",
      "The notification module is not available on this device.",
    );
  };

  /**
   * Remove a sent notification.
   *
   * The user inbox sync treats `status == "deleted"` as a tombstone and
   * purges every cached copy (including pushes already delivered to the
   * device) on the next foreground sync — a hard delete would leave those
   * push copies behind with nothing to match them against.
   */
  const deleteNotification = (item: HistoryItem) => {
    void showAlert(
      "Delete notification",
      "Delete this notification? It disappears from the history for every admin, and customers no longer receive it on their next sync.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await client.patch(item.id).set({ status: "deleted" }).commit();
              setHistoryItems((previous) =>
                previous.filter((row) => row.id !== item.id),
              );
              showAlert("Deleted", "The notification was deleted.");
            } catch (error) {
              console.warn("Could not delete notification:", error);
              showAlert(
                "Could not delete",
                "The notification could not be deleted. Please try again.",
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderHistoryItem = (item: HistoryItem) => {
    const status = item.status ? STATUS_CONFIG[item.status] : undefined;
    const total = (item.delivered ?? 0) + (item.failed ?? 0);
    const isDeleting = deletingId === item.id;

    return (
      <View
        key={item.id}
        style={{
          marginBottom: spacing.sm,
          padding: spacing.md,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: theme.borderSubtle,
          backgroundColor: theme.surface,
          ...shadows.sm,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}
        >
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline" numberOfLines={2}>
              {item.title}
            </ThemedText>
            {item.message || item.imageUrl || item.videoUrl ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  marginTop: 3,
                }}
              >
                {item.message ? (
                  <ThemedText
                    variant="bodySm"
                    tone="secondary"
                    numberOfLines={3}
                    style={{ flex: 1 }}
                  >
                    {item.message}
                  </ThemedText>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                {item.imageUrl || item.videoUrl ? (
                  <NotificationMedia imageUrl={item.imageUrl} videoUrl={item.videoUrl} size={56} />
                ) : null}
              </View>
            ) : null}
          </View>

          <PressableScale
            onPress={() => deleteNotification(item)}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel={`${deleteWord || "Delete"} ${item.title}`}
            haptic="light"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.surfaceAlt,
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <AppIcon name="trash-outline" size={17} color="#B32525" />
            )}
          </PressableScale>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          {status ? <Badge label={status.label} tone={status.tone} /> : null}
          {total > 0 ? (
            <ThemedText variant="caption" tone="secondary">
              {`${item.delivered ?? 0} / ${total}`}
            </ThemedText>
          ) : null}
          <View style={{ flex: 1 }} />
          {item.date ? (
            <ThemedText variant="caption" tone="tertiary">
              {new Date(item.date).toLocaleDateString(currentDateLocale())}
            </ThemedText>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading && !selectedImage && activeTab === "send") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.canvas,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText variant="bodySm" style={{ marginTop: spacing.sm }}>
          Loading…
        </ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScreenHeader
        title="Notification center"
        subtitle="Send and review notifications"
        showBack
      />

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: spacing.gutter,
          marginBottom: spacing.sm,
          padding: 4,
          borderRadius: radii.md,
          backgroundColor: theme.surfaceAlt,
        }}
      >
        {(["send", "sent"] as const).map((tab) => {
          const selected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                minHeight: 42,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? theme.surface : "transparent",
                borderWidth: selected ? 1 : 0,
                borderColor: theme.border,
              }}
            >
              <ThemedText
                variant="bodySm"
                style={{
                  fontWeight: "700",
                  color: selected ? theme.primary : theme.textSecondary,
                }}
              >
                {tab === "send" ? "Send" : "Sent"}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.md,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "send" ? (
          <View
            style={{
              padding: spacing.lg,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: theme.borderSubtle,
              backgroundColor: theme.surface,
              ...shadows.sm,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
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
                <AppIcon name="send-outline" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="headline">Send a notification</ThemedText>
                <ThemedText
                  variant="caption"
                  tone="secondary"
                  style={{ marginTop: 2 }}
                >
                  Share an update with customers
                </ThemedText>
              </View>
            </View>

            <ThemedText
              variant="bodySm"
              style={{ fontWeight: "700", marginBottom: spacing.sm }}
            >
              Notification type
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.lg }}
            >
              {(Object.keys(NOTIFICATION_TYPE_CONFIGS) as NotificationType[]).map(
                (itemType) => {
                  const selected = type === itemType;
                  return (
                    <TouchableOpacity
                      key={itemType}
                      onPress={() => setType(itemType)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: spacing.md,
                        paddingVertical: 10,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.surface,
                        marginRight: spacing.sm,
                      }}
                    >
                      <AppIcon
                        name={NOTIFICATION_TYPE_CONFIGS[itemType].icon as any}
                        size={18}
                        color={selected ? theme.primary : theme.textSecondary}
                      />
                      <ThemedText
                        variant="caption"
                        style={{
                          marginLeft: spacing.sm,
                          color: selected ? theme.primary : theme.textPrimary,
                        }}
                      >
                        {NOTIFICATION_TYPE_CONFIGS[itemType].label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>

            <ThemedText
              variant="bodySm"
              style={{ fontWeight: "700", marginBottom: spacing.sm }}
            >
              Title
            </ThemedText>
            <View style={{ marginBottom: spacing.lg }}>
              <Input
                placeholder="Enter a title"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <ThemedText
              variant="bodySm"
              style={{ fontWeight: "700", marginBottom: spacing.sm }}
            >
              Message
            </ThemedText>
            <View style={{ marginBottom: spacing.lg }}>
              <Input
                placeholder="Write your message…"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
              />
            </View>

            <ThemedText
              variant="bodySm"
              style={{ fontWeight: "700", marginBottom: spacing.sm }}
            >
              Media (optional)
            </ThemedText>
            <View
              style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}
            >
              {(
                [
                  { kind: "image" as const, icon: "image-outline" as const, label: "Image" },
                  { kind: "video" as const, icon: "videocam-outline" as const, label: "Video" },
                ]
              ).map((media) => (
                <TouchableOpacity
                  key={media.kind}
                  onPress={() => pickMedia(media.kind)}
                  accessibilityRole="button"
                  accessibilityLabel={media.kind === "image" ? imageLabel || "Image" : videoLabel || "Video"}
                  style={{
                    flex: 1,
                    height: 110,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: theme.border,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.surfaceAlt,
                  }}
                >
                  <AppIcon name={media.icon} size={28} color={theme.primary} />
                  <ThemedText
                    variant="caption"
                    style={{ color: theme.primary, marginTop: 6 }}
                  >
                    {media.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {selectedImage ? (
              <View
                style={{
                  marginBottom: spacing.lg,
                  borderRadius: radii.md,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {selectedMediaType === "image" ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={{ width: "100%", height: 190 }}
                  />
                ) : (
                  <View style={{ width: "100%", height: 190 }}>
                    <VideoPlayer uri={selectedImage} />
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(null);
                    setSelectedMediaType(null);
                    setImageUrl("");
                    setPosterUrl("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={removeMediaLabel || "Remove media"}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    borderRadius: 18,
                    padding: 6,
                  }}
                >
                  <AppIcon name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : null}

            <PrimaryButton
              label="Send notification"
              onPress={sendNotification}
              loading={loading}
            />

            <PrimaryButton
              label="Test on this device"
              variant="secondary"
              icon="notifications-outline"
              onPress={sendTestNotification}
              disabled={loading}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : (
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.md,
              }}
            >
              <ThemedText variant="overline" tone="secondary">
                {`${historyItems.length} ${
                  historyItems.length === 1 ? "record" : "records"
                }`}
              </ThemedText>
              <PressableScale
                onPress={() => void fetchHistory()}
                disabled={fetchingHistory}
                accessibilityRole="button"
                accessibilityLabel={refreshLabel || "Refresh"}
                haptic="selection"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.surfaceAlt,
                }}
              >
                <AppIcon
                  name="refresh-outline"
                  size={17}
                  color={theme.primary}
                />
              </PressableScale>
            </View>

            {fetchingHistory && historyItems.length === 0 ? (
              <ActivityIndicator
                size="large"
                color={theme.primary}
                style={{ marginTop: spacing.xl }}
              />
            ) : historyItems.length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: spacing.xxxl }}
              >
                <AppIcon
                  name="mail-open-outline"
                  size={56}
                  color={theme.textQuaternary}
                />
                <ThemedText
                  variant="headline"
                  style={{ marginTop: spacing.md }}
                >
                  No notifications sent yet
                </ThemedText>
                <ThemedText
                  variant="bodySm"
                  tone="secondary"
                  align="center"
                  style={{ marginTop: 4, paddingHorizontal: spacing.lg }}
                >
                  Sent notifications and delivery results appear here.
                </ThemedText>
              </View>
            ) : (
              historyItems.map(renderHistoryItem)
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
