import { isStripeConfigured, isSupabaseConfigured } from "@/lib/env";

export async function POST(request: Request) {
  if (!isStripeConfigured()) return Response.json({ error: "stripe_unconfigured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ error: "İmza veya webhook secret eksik" }, { status: 400 });

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "İmza doğrulanamadı" }, { status: 400 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "backend_unconfigured" }, { status: 503 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error: eventError } = await admin.from("stripe_events").insert({ id: event.id, event_type: event.type });
  if (eventError?.code === "23505") return Response.json({ received: true, duplicate: true });
  if (eventError) return Response.json({ error: "Webhook event kaydedilemedi" }, { status: 500 });
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (!session.subscription) break;
      const { error } = await admin.from("subscriptions").upsert({
        stripe_subscription_id: String(session.subscription),
        stripe_customer_id: session.customer ? String(session.customer) : null,
        user_id: session.client_reference_id || session.metadata?.user_id || null,
        user_email: session.customer_details?.email ?? null,
        status: "active",
        price_id: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });
      if (error) return Response.json({ error: "Abonelik kaydedilemedi" }, { status: 500 });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const existing = await admin.from("subscriptions").select("user_id").eq("stripe_subscription_id", subscription.id).maybeSingle();
      const item = subscription.items.data[0];
      const { error } = await admin.from("subscriptions").upsert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: String(subscription.customer),
        user_id: existing.data?.user_id ?? subscription.metadata?.user_id ?? null,
        status: subscription.status,
        price_id: item?.price.id ?? null,
        current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });
      if (error) return Response.json({ error: "Abonelik güncellenemedi" }, { status: 500 });
      break;
    }
    default:
      break;
  }
  return Response.json({ received: true });
}
