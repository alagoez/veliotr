import type { Metadata } from "next";
import { SavedVideos } from "./SavedVideos";

export const metadata: Metadata = { title: "Kaydedilenler" };

export default function SavedVideosPage() {
  return <SavedVideos />;
}
