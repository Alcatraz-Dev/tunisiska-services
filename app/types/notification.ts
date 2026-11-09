export type NotificationType =
  | "general"
  | "message"
  | "booking"
  | "warning"
  | "info"
  | "success"
  | "error"
  | "offer"
  | "delivery"
  | "service"
  | "security"
  | "review"
  | "system"
  | "update"
  | "announcement"
  | "maintenance"
  | "promotion";

export interface NotificationTypeConfig {
  icon: string;
  color: string;
  label: string;
}

export const NOTIFICATION_TYPE_CONFIGS: Record<NotificationType, NotificationTypeConfig> = {
  general: { icon: "notifications-outline", color: "#3B82F6", label: "Allmänt" },
  message: { icon: "chatbubble-ellipses-outline", color: "#3B82F6", label: "Meddelande" },
  booking: { icon: "calendar-outline", color: "#8B5CF6", label: "Bokning" },
  warning: { icon: "warning-outline", color: "#F59E0B", label: "Varning" },
  info: { icon: "information-circle-outline", color: "#0EA5E9", label: "Info" },
  success: { icon: "checkmark-circle-outline", color: "#10B981", label: "Framgång" },
  error: { icon: "close-circle-outline", color: "#EF4444", label: "Fel" },
  offer: { icon: "pricetag-outline", color: "#F472B6", label: "Erbjudande" },
  delivery: { icon: "cube-outline", color: "#FBBF24", label: "Leverans" },
  service: { icon: "construct-outline", color: "#60A5FA", label: "Service" },
  security: { icon: "lock-closed-outline", color: "#F97316", label: "Säkerhet" },
  review: { icon: "star-outline", color: "#14B8A6", label: "Recension" },
  system: { icon: "settings-outline", color: "#A78BFA", label: "System" },
  update: { icon: "refresh-outline", color: "#06B6D4", label: "Uppdatering" },
  announcement: { icon: "megaphone-outline", color: "#F59E0B", label: "Annons" },
  maintenance: { icon: "construct-outline", color: "#EF4444", label: "Underhåll" },
  promotion: { icon: "pricetag-outline", color: "#EC4899", label: "Kampanj" },
};

export interface NotificationItem {
  id?: string;
  notification_id?: string;
  title: string;
  message: string;
  type?: NotificationType;
  category?: string;
  read?: boolean;
  date?: string;
  date_sent?: string;
  image?: string;
  route?: string;
  /**
   * Identifier the OS assigned to the delivered notification. Needed to dismiss
   * it from the system tray once the customer deletes it from the inbox.
   */
  nativeId?: string;
  screenImage?: string;
  mediaType?: string;
  videoUrl?: string;
  /**
   * Where the item came from. `remote` items mirror a Sanity document, so the
   * device must drop them when that document is deleted. Device-only items
   * (local test notifications, system pushes) have no source and are kept.
   */
  source?: "remote" | "device";
}

/**
 * The identity of a notification.
 *
 * Sources disagree: Sanity rows carry `_id` mapped to `id`, push payloads carry
 * `notification_id`, and system pushes only have a title and a timestamp. Every
 * consumer must key on the same value or read state and de-duplication break,
 * so the resolution lives here instead of being re-invented per screen.
 */
export function notificationKey(item: NotificationItem, fallback = ""): string {
  return (
    item.id ||
    item.notification_id ||
    `${item.title ?? ""}|${item.date ?? item.date_sent ?? fallback}`
  );
}

/**
 * Test notifications are for administrators, never for the customer inbox.
 *
 * Two shapes exist: admin broadcasts are prefixed `[TEST]`, and the "send test"
 * button presents a device-local notification carrying `test` in its payload.
 * Both are recognised here so every consumer filters them the same way.
 */
export function isTestNotification(
  item: Partial<NotificationItem> | null | undefined,
): boolean {
  if (!item) return false;

  const type = String(item.type ?? "").toLowerCase();
  if (type === "test" || type === "test_notification") return true;

  const title = String(item.title ?? "").trim().toLowerCase();
  return (
    title.startsWith("[test]") ||
    title === "test notification" ||
    title === "testnotis"
  );
}

/** Sort newest first; items without a date keep their incoming order. */
export function notificationTimestamp(item: NotificationItem): number {
  const value = item.date ?? item.date_sent;
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}