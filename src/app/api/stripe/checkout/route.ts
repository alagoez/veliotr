import { isDemoMode, isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { allowedOrigin } from "@/lib/security";
import { CheckoutRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (!isStripeConfigured()) return Response.json({ error: "stripe_unconfigured" }, { status: 503 });
  if (!isDemoMode() && !isSupabaseConfigured()) return Response.json({ error: "backend_unconfigured" }, { status: 503 });
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "auth_required", message: "Ödeme için giriş yapın." }, { status: 401 });

    const parsed = CheckoutRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "Geçersiz plan" }, { status: 400 });
    const priceId = parsed.data.plan === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
    if (!priceId) return Response.json({ error: "price_missing" }, { status: 503 });

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const origin = allowedOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?status=cancelled`,
      allow_promotion_codes: true,
      locale: "tr",
      metadata: { plan: parsed.data.plan, user_id: user.id },
      subscription_data: { metadata: { user_id: user.id, plan: parsed.data.plan } },
    });
    return Response.json({ url: session.url });
  }

  // Demo mode is intentionally usable without external auth/configuration.
  const parsed = CheckoutRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Geçersiz plan" }, { status: 400 });
  const priceId = parsed.data.plan === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!priceId) return Response.json({ error: "price_missing" }, { status: 503 });
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = allowedOrigin(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription", line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing?status=cancelled`, allow_promotion_codes: true, locale: "tr",
    metadata: { plan: parsed.data.plan },
  });
  return Response.json({ url: session.url });
}
