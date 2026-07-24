import { isStripeConfigured, isSupabaseConfigured } from "@/lib/env";

/**
 * Stripe webhook: abonelik durumunu subscriptions tablosuna yazar.
 * Gerekli env: STRIPE_WEBHOOK_SECRET (stripe listen / dashboard'dan)
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return Response.json({ error: "stripe_unconfigured" }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return Response.json({ error: "İmza veya webhook secret eksik" }, { status: 400 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const payload = await request.text();
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch {
    return Response.json({ error: "İmza doğrulanamadı" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) break;

      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      if (event.type === "checkout.session.completed") {
        const s = event.data.object;
        await admin.from("subscriptions").upsert({
          stripe_customer_id: String(s.customer ?? ""),
          stripe_subscription_id: String(s.subscription ?? ""),
          status: "active",
          user_email: s.customer_details?.email ?? null,
        }, { onConflict: "stripe_subscription_id" });
      } else {
        const sub = event.data.object;
        await admin.from("subscriptions").upsert({
          stripe_customer_id: String(sub.customer),
          stripe_subscription_id: sub.id,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
        }, { onConflict: "stripe_subscription_id" });
      }
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
