type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Development-safe limiter. Production uses a bounded in-memory limiter until Redis is configured. */
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

  // Prevent an unbounded process-local map in long-running dev processes.
  if (buckets.size > 10_000) {
    for (const key of Array.from(buckets.keys())) {
      const value = buckets.get(key);
      if (value && value.resetAt <= now) buckets.delete(key);
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

export function requestIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}
