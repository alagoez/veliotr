import { isStripeConfigured } from "@/lib/env";

/**
 * Stripe Checkout Session oluşturur.
 * Gerekli env: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL
 * (test modu anahtarlarıyla çalışır — bkz. README "Stripe kurulumu")
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return Response.json(
      {
        error: "stripe_unconfigured",
        message:
          "Stripe henüz yapılandırılmadı. .env dosyasına STRIPE_SECRET_KEY ve fiyat ID'lerini ekleyin (README'ye bakın).",
      },
      { status: 503 },
    );
  }

  let plan: "monthly" | "annual" = "monthly";
  try {
    const body = (await request.json()) as { plan?: "monthly" | "annual" };
    if (body.plan === "annual") plan = "annual";
  } catch {
    // gövde yoksa varsayılan: monthly
  }

  const priceId =
    plan === "annual"
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY;

  if (!priceId) {
    return Response.json(
      { error: "price_missing", message: `${plan} planı için fiyat ID'si tanımlı değil.` },
      { status: 503 },
    );
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const origin =
    request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing?status=cancelled`,
    allow_promotion_codes: true,
    locale: "tr",
  });

  return Response.json({ url: session.url });
}
