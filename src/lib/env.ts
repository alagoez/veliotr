/** Ortam anahtarları yoksa uygulama demo modunda çalışır (bkz. README). */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true"
    || (process.env.NODE_ENV !== "production" && !isSupabaseConfigured());
}

export function isProductionReady(): boolean {
  return isSupabaseConfigured()
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    && Boolean(process.env.NEXT_PUBLIC_APP_URL);
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
