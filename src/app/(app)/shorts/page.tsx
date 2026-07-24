import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeFeed } from "../home/HomeFeed";

export const metadata: Metadata = { title: "Shorts Radarı" };

export default function ShortsPage() {
  return (
    <Suspense>
      <HomeFeed
        initialFilters={{ isShort: true }}
        heading="Shorts Radarı"
        subheading="Kısa formatta patlayan videolar — hook'lar burada test edilir."
      />
    </Suspense>
  );
}
