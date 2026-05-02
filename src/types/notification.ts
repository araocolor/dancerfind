export type NotificationType = "application" | "approved" | "cancelled" | "notice" | "modified";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  type: NotificationType;
  link_url: string | null;
  related_id: string | null;
  created_at: string;
}
