import React, { useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "@/app/components/ui/AppIcon";
import EmptyState from "@/app/components/ui/EmptyState";
import NotificationMedia from "@/app/components/NotificationMedia";
import PressableScale from "@/app/components/ui/PressableScale";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import SwipeToDelete, {
  type SwipeToDeleteHandle,
} from "@/app/components/ui/SwipeToDelete";
import ThemedText from "@/app/components/ui/ThemedText";
import { useNotifications } from "@/app/context/NotificationContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";
import {
  NOTIFICATION_TYPE_CONFIGS,
  NotificationItem,
  NotificationType,
  isTestNotification,
  notificationKey,
} from "@/app/types/notification";
import { currentDateLocale, formatRelativeTime } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateNow, useTranslationText } from "@/app/hooks/useTranslation";
import { showAlert } from "@/app/utils/showAlert";

/**
 * Older documents and push payloads use their own type vocabulary. Map the
 * common ones so a broadcast reads as an announcement instead of a generic bell.
 */
const TYPE_ALIASES: Record<string, NotificationType> = {
  admin_broadcast: "announcement",
  broadcast: "announcement",
  news: "announcement",
  trip: "info",
  departure: "info",
  shipment: "delivery",
  order: "delivery",
  payment: "success",
  support: "message",
};

function resolveType(type?: string): NotificationType {
  if (type && type in NOTIFICATION_TYPE_CONFIGS) return type as NotificationType;
  if (type && type in TYPE_ALIASES) return TYPE_ALIASES[type];
  return "general";
}

export default function Notification() {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { language } = useLanguage();
  const locale = currentDateLocale(language);
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    unreadCount,
  } = useNotifications();
  const markAllLabel = useTranslationText(
    "Mark all notifications as read",
    language,
  );
  const unreadLabel = useTranslationText("unread", language);
  const deleteLabel = useTranslationText("Delete notification", language);
  const revealDeleteLabel = useTranslationText("Show delete action", language);
  const deleteActionLabel = useTranslationText("Delete", language);
  const clearAllLabel = useTranslationText("Clear all notifications", language);

  /** Anything an admin created for testing is never shown to a customer. */
  const visible = useMemo(
    () => notifications.filter((item) => !isTestNotification(item)),
    [notifications],
  );

  const groups = useMemo(() => {
    const unread = visible.filter((item) => !item.read);
    const read = visible.filter((item) => item.read);

    return [
      { key: "new" as const, title: "New", items: unread },
      { key: "earlier" as const, title: "Earlier", items: read },
    ].filter((group) => group.items.length > 0);
  }, [visible]);

  const openNotification = (item: NotificationItem) => {
    markAsRead(notificationKey(item));
    if (item.route) router.push(item.route as any);
  };

  /**
   * Deleting is confirmed and permanent for this user: the id is remembered, so
   * the next sync cannot bring the same notification back.
   */
  const confirmDelete = (item: NotificationItem) => {
    const id = notificationKey(item);
    void showAlert(
      translateNow("Delete notification", language),
      translateNow(
        "This notification will be removed from your inbox.",
        language,
      ),
      [
        { text: translateNow("Cancel", language), style: "cancel" },
        {
          text: translateNow("Delete", language),
          style: "destructive",
          onPress: () => deleteNotification(id, item),
        },
      ],
    );
  };

  /**
   * Rows are addressed by notification key so the card's trash button can reveal
   * that row's action. Deleting always goes through the swipe action — there is
   * exactly one delete path.
   */
  const rowRefs = useRef<Record<string, SwipeToDeleteHandle | null>>({});

  /** Clear all is irreversible, so it is always confirmed. */
  const confirmClearAll = () => {
    void showAlert(
      translateNow("Clear all notifications", language),
      translateNow(
        "Every notification will be removed from your inbox.",
        language,
      ),
      [
        { text: translateNow("Cancel", language), style: "cancel" },
        {
          text: translateNow("Clear all", language),
          style: "destructive",
          onPress: clearAllNotifications,
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader
        title="Notifications"
        subtitle="Recent account updates"
        showBack
        rightIcon={visible.length > 0 ? "trash-outline" : undefined}
        onRightPress={confirmClearAll}
        rightAccessibilityLabel={clearAllLabel}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {visible.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            description="Booking, shipment and departure updates will appear here."
          />
        ) : (
          groups.map((group) => (
            <View key={group.key} style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  paddingHorizontal: 2,
                  marginTop: group.key === "earlier" ? spacing.xs : 0,
                }}
              >
                <ThemedText
                  variant="overline"
                  tone={group.key === "new" ? "accent" : "tertiary"}
                >
                  {group.title}
                </ThemedText>
                {group.key === "new" ? (
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 5,
                      borderRadius: 9,
                      backgroundColor: theme.accent,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ThemedText
                      variant="overline"
                      translate={false}
                      style={{ color: theme.textOnAccent, fontSize: 10 }}
                    >
                      {group.items.length}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={{ flex: 1, height: 1, backgroundColor: theme.borderSubtle }} />
                {group.key === "new" && unreadCount > 0 ? (
                  <PressableScale
                    onPress={markAllAsRead}
                    haptic="light"
                    accessibilityRole="button"
                    accessibilityLabel={markAllLabel}
                    pressedScale={0.94}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 9,
                      height: 28,
                      borderRadius: radii.pill,
                      backgroundColor: theme.accentSoft,
                      borderWidth: 1,
                      borderColor: theme.accentBorder,
                    }}
                  >
                    <AppIcon name="checkmark" size={13} color={theme.accent} />
                    <ThemedText
                      variant="caption"
                      style={{ color: theme.accent, fontWeight: "600", fontSize: 12 }}
                    >
                      Mark all read
                    </ThemedText>
                  </PressableScale>
                ) : null}
              </View>

              {group.items.map((item, index) => {
                const config = NOTIFICATION_TYPE_CONFIGS[resolveType(item.type)];
                const id = notificationKey(item, String(index));
                const date = item.date ?? item.date_sent;
                const relative = date ? formatRelativeTime(date, new Date(), locale) : "";

                return (
                  <SwipeToDelete
                    key={id}
                    ref={(handle) => {
                      rowRefs.current[id] = handle;
                    }}
                    onDelete={() => confirmDelete(item)}
                    actionLabel={deleteActionLabel}
                  >
                  {/*
                    The card is a plain container and only the row body is
                    pressable. A delete control nested inside a pressable row
                    renders as a <button> inside a <button> on web, which is
                    invalid DOM and logged as a hydration error.
                  */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: spacing.sm + 2,
                      paddingVertical: spacing.md,
                      paddingStart: spacing.md + 2,
                      paddingEnd: spacing.sm,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: item.read ? theme.borderSubtle : theme.accentBorder,
                      backgroundColor: item.read ? theme.surfaceAlt : theme.surface,
                      overflow: "hidden",
                    }}
                  >
                  <PressableScale
                    onPress={() => openNotification(item)}
                    haptic="light"
                    accessibilityRole="button"
                    accessibilityState={{ selected: !item.read }}
                    accessibilityLabel={`${item.title}${item.read ? "" : `, ${unreadLabel}`}`}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: spacing.sm + 2,
                    }}
                  >
                    {!item.read ? (
                      <View
                        style={{
                          position: "absolute",
                          start: 0,
                          top: 16,
                          bottom: 16,
                          width: 3,
                          borderTopEndRadius: 3,
                          borderBottomEndRadius: 3,
                          backgroundColor: theme.accent,
                        }}
                      />
                    ) : null}

                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        backgroundColor: `${config.color}18`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppIcon
                        name={config.icon as any}
                        size={19}
                        color={config.color}
                      />
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                        <ThemedText
                          variant="headline"
                          numberOfLines={2}
                          style={{ flex: 1, lineHeight: 21 }}
                        >
                          {item.title}
                        </ThemedText>
                        {!item.read ? (
                          <View
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 3.5,
                              backgroundColor: theme.accent,
                            }}
                          />
                        ) : null}
                      </View>

                      {item.message || item.image || item.videoUrl ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: spacing.sm,
                            marginTop: 2,
                          }}
                        >
                          {item.message ? (
                            <ThemedText
                              variant="bodySm"
                              tone={item.read ? "tertiary" : "secondary"}
                              numberOfLines={3}
                              style={{ flex: 1, lineHeight: 20 }}
                            >
                              {item.message}
                            </ThemedText>
                          ) : null}
                        </View>
                      ) : null}

                      {relative ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 1,
                          }}
                        >
                          <AppIcon
                            name="time-outline"
                            size={12}
                            color={theme.textQuaternary}
                          />
                          <ThemedText
                            variant="footnote"
                            tone="tertiary"
                            translate={false}
                          >
                            {relative}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </PressableScale>

                    {item.image || item.videoUrl ? (
                      <NotificationMedia
                        imageUrl={item.image}
                        videoUrl={item.videoUrl}
                        size={56}
                      />
                    ) : null}

                    <View style={{ alignItems: "center", gap: 4, marginTop: 8 }}>
                      <PressableScale
                        onPress={() => rowRefs.current[id]?.open()}
                        haptic="light"
                        accessibilityRole="button"
                        accessibilityLabel={`${revealDeleteLabel}: ${item.title}`}
                        accessibilityHint={deleteLabel}
                        pressedScale={0.9}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: theme.surfaceAlt,
                        }}
                      >
                        <AppIcon
                          name="trash-outline"
                          size={15}
                          color={theme.textTertiary}
                        />
                      </PressableScale>

                      {item.route ? (
                        <AppIcon
                          name="chevron-forward"
                          size={16}
                          color={theme.textQuaternary}
                        />
                      ) : null}
                    </View>
                  </View>
                  </SwipeToDelete>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
