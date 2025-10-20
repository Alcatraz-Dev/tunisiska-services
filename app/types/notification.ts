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
  screenImage?: string;
  mediaType?: string;
  videoUrl?: string;
}