import type { Metadata } from "next";
import { AlertsManage } from "./AlertsManage";

export const metadata: Metadata = { title: "Uyarıları Yönet" };

export default function AlertsManagePage() {
  return <AlertsManage />;
}
