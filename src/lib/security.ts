const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts)/i,
  /(?:reveal|show|print|repeat).{0,30}(system prompt|developer message)/i,
  /\b(?:admin|developer)\s+mode\b/i,
  /\[\s*system\s*\]/i,
];

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function allowedOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const allowed = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    configured,
    "https://viralab.dev",
    "https://www.viralab.dev",
    "https://app.viralab.dev",
  ].filter(Boolean));
  return origin && allowed.has(origin) ? origin : configured || "http://localhost:3000";
}

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "anonymous";
}
