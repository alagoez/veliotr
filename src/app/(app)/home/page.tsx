import type { Metadata } from "next";
import { HomeFeed } from "./HomeFeed";

export const metadata: Metadata = { title: "Keşfet" };

export default function HomePage() {
  return <HomeFeed />;
}
