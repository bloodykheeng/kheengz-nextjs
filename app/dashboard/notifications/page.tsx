import type { Metadata } from "next";
import NotificationsList from "./NotificationsList";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="p-4 sm:p-6">
      <NotificationsList />
    </div>
  );
}
