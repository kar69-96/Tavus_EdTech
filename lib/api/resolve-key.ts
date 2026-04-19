import "server-only";
import { TavusError } from "./tavus-client";
import { env } from "./env";

/**
 * Request header wins over env so a demo presenter can paste a fresh key without redeploying.
 * Header name is case-insensitive per Fetch spec.
 */
export function resolveTavusApiKeyFromRequest(req: Request): string | null {
  const fromHeader = req.headers.get("x-tavus-api-key")?.trim();
  if (fromHeader) return fromHeader;
  const fromEnv = env.TAVUS_API_KEY?.trim();
  return fromEnv || null;
}

/**
 * Ordered keys for server-side Tavus calls: primary first, then backup if different.
 * Callers that already verified `resolveTavusApiKeyFromRequest` is non-null get at least one key.
 */
export function getTavusApiKeyCandidates(req: Request): string[] {
  const primary = resolveTavusApiKeyFromRequest(req);
  if (!primary) return [];
  const backup = env.TAVUS_BACKUP_API_KEY?.trim() ?? "";
  if (!backup || backup === primary) return [primary];
  return [primary, backup];
}

/**
 * Runs `operation(apiKey)` with the primary key; on Tavus quota exhaustion (402/429),
 * retries once with the backup key. Other errors are thrown immediately.
 */
export async function withTavusKeyFailover<T>(
  req: Request,
  operation: (apiKey: string) => Promise<T>,
): Promise<T> {
  const keys = getTavusApiKeyCandidates(req);
  if (keys.length === 0) {
    throw new Error("withTavusKeyFailover: no API key candidates");
  }
  for (let i = 0; i < keys.length; i++) {
    try {
      return await operation(keys[i]);
    } catch (e) {
      const quota =
        e instanceof TavusError && (e.status === 402 || e.status === 429);
      if (quota && i < keys.length - 1) continue;
      throw e;
    }
  }
  // Unreachable — loop always returns or throws
  throw new Error("withTavusKeyFailover: exhausted key chain");
}
