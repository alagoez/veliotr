import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeFeed } from "./HomeFeed";

export const metadata: Metadata = { title: "Keşfet" };

export default function HomePage() {
  return (
    <Suspense>
      <HomeFeed />
    </Suspense>
  );
}
