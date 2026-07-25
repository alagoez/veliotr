import type { Metadata } from "next";
import { GettingStarted } from "./GettingStarted";

export const metadata: Metadata = { title: "Başlangıç" };

export default function GettingStartedPage() {
  return <GettingStarted />;
}
