/**
 * In-memory sliding-window rate limiter for serverless / edge runtime.
 * Provides protection against credential stuffing, OTP brute force, and email spam.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    // Keep only timestamps from the last 1 hour
    const activeTimestamps = record.timestamps.filter((ts) => now - ts < 3600 * 1000);
    if (activeTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = activeTimestamps;
    }
  }
}

/**
 * Check if an action is within allowed rate limits.
 * @param key Unique identifier (e.g. `login:user@example.com` or `otp:192.168.1.1`)
 * @param maxAttempts Maximum attempts allowed within window
 * @param windowSeconds Window length in seconds
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupStaleEntries(now);

  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Filter timestamps within current sliding window
  const recentTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (recentTimestamps.length >= maxAttempts) {
    const oldestInWindow = recentTimestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Record this attempt
  recentTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: recentTimestamps });

  return {
    allowed: true,
    remaining: maxAttempts - recentTimestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Reset rate limit counter on successful action (e.g. successful login)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
