export interface NotificationItem {
  id?: string;
  notification_id?: string;
  title: string;
  message: string;
  type?: string;
  category?: string;
  read?: boolean;
  date?: string;
  date_sent?: string;
  image?: string;
}