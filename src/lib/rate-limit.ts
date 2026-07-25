type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;

/**
 * Süreç-içi hız sınırlayıcı.
 * Not: çok örnekli (serverless) dağıtımda örnek başına sayar; kesin sınır için
 * Redis/Upstash'e taşınmalı. Yine de kötüye kullanımı anlamlı ölçüde yavaşlatır.
 */
export function checkRateLimit(
  identifier: string,
  limit = 30,
  windowMs = 60_000,
): { remaining: number; resetAt: number } {
  const now = Date.now();
  const current = buckets.get(identifier);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  bucket.count += 1;
  buckets.set(identifier, bucket);

  if (bucket.count > limit) {
    throw new RateLimitError(bucket.resetAt);
  }

  // Belleği sınırla. Yalnızca süresi dolanları silmek yetmez: saldırgan tek
  // pencerede binlerce CANLI kova açabilir; o durumda eski kod hiçbir şey
  // silmeyip her istekte 10.000+ elemanlı dizi geziyordu (CPU + bellek DoS).
  if (buckets.size > MAX_BUCKETS) {
    for (const [key, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(key);
    }
    if (buckets.size > MAX_BUCKETS) {
      let removed = 0;
      const excess = buckets.size - MAX_BUCKETS;
      for (const key of buckets.keys()) {
        buckets.delete(key); // Map ekleme sırasını korur → en eski önce düşer
        if (++removed >= excess) break;
      }
    }
  }

  return { remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

export class RateLimitError extends Error {
  constructor(public readonly resetAt: number) {
    super("Çok fazla istek. Lütfen biraz bekleyin.");
    this.name = "RateLimitError";
  }
}

/**
 * İstemci kimliği.
 * X-Forwarded-For'un SOLDAKİ girdisi istemci tarafından uydurulabilir; her
 * istekte farklı bir değer göndererek sınır tamamen atlanabiliyordu. Bu yüzden
 * önce platformun güvenilir başlıkları denenir, XFF'te ise en SAĞDAKİ
 * (bize en yakın proxy'nin yazdığı) hop kullanılır.
 */
export function requestIdentifier(request: Request): string {
  const trusted =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip");
  if (trusted) return trusted.trim();

  const chain = request.headers.get("x-forwarded-for");
  if (chain) {
    const hops = chain.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "anonymous";
}
