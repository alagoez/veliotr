import type { Metadata } from "next";
import { Suspense } from "react";
import { Billing } from "./Billing";

export const metadata: Metadata = { title: "Abonelik" };

export default function BillingPage() {
  return (
    <Suspense>
      <Billing />
    </Suspense>
  );
}
