import type { Metadata } from "next";
import { SavedChannels } from "./SavedChannels";

export const metadata: Metadata = { title: "Kanallarım" };

export default function SavedChannelsPage() {
  return <SavedChannels />;
}
