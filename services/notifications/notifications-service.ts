import axiosAPI from "../axiosApi";

/** One notice in the bell (KheengzNotification on the API). `kind` picks the icon (NotificationBell KIND_STYLE). */
export interface AppNotification {
  id: string;
  kind: "order" | "payout" | "stock" | "warning" | "vendor" | "shop" | "account";
  title: string;
  body: string;
  link: string | null;
  vendor_id: string | null;
  read_at: string | null;
  created_at: string | null;
}

export interface NotificationPage {
  data: AppNotification[];
  meta: { total: number; per_page: number; current_page: number; last_page: number };
  unread_count: number;
}

export async function getNotifications(page = 1, perPage = 10, unreadOnly = false) {
  const { data } = await axiosAPI.get<NotificationPage>("/v1/notifications", {
    params: { page, per_page: perPage, ...(unreadOnly ? { "filter[unread]": 1 } : {}) },
  });
  return data;
}

export async function getUnreadCount() {
  const { data } = await axiosAPI.get<{ unread_count: number }>("/v1/notifications/unread-count");
  return data.unread_count;
}

export async function markNotificationRead(id: string) {
  await axiosAPI.post(`/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await axiosAPI.post("/v1/notifications/read-all");
}

export async function deleteNotification(id: string) {
  await axiosAPI.delete(`/v1/notifications/${id}`);
}
