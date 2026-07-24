import type { Metadata } from "next";
import { Notifications } from "./Notifications";

export const metadata: Metadata = { title: "Bildirimler" };

export default function NotificationsPage() {
  return <Notifications />;
}
