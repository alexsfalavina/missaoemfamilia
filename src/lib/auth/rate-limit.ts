import type { NextRequest } from 'next/server';

interface RateLimitBucket {
  timestamps: number[];
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS_PER_ACCOUNT = 5;
const MAX_ATTEMPTS_PER_IP = 15;
const MAX_TRACKED_KEYS = 2000;

const accountBuckets = new Map<string, RateLimitBucket>();
const ipBuckets = new Map<string, RateLimitBucket>();

function pruneBucket(bucket: RateLimitBucket, now: number): number[] {
  const cutoff = now - WINDOW_MS;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  return bucket.timestamps;
}

function evictIfOversized(store: Map<string, RateLimitBucket>, now: number): void {
  if (store.size <= MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of store.entries()) {
    if (pruneBucket(bucket, now).length === 0) {
      store.delete(key);
    }
  }
}

export function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown';
}

export function checkLoginRateLimit(
  ip: string,
  emailInput: string
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const normalizedEmail = emailInput.trim().toLowerCase() || 'empty';
  const accountKey = `${ip}::${normalizedEmail}`;

  const ipBucket = ipBuckets.get(ip);
  if (ipBucket) {
    const recent = pruneBucket(ipBucket, now);
    if (recent.length >= MAX_ATTEMPTS_PER_IP) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
  }

  const accBucket = accountBuckets.get(accountKey);
  if (accBucket) {
    const recent = pruneBucket(accBucket, now);
    if (recent.length >= MAX_ATTEMPTS_PER_ACCOUNT) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
  }

  return { allowed: true };
}

export function recordFailedLoginAttempt(ip: string, emailInput: string): void {
  const now = Date.now();
  const normalizedEmail = emailInput.trim().toLowerCase() || 'empty';
  const accountKey = `${ip}::${normalizedEmail}`;

  evictIfOversized(ipBuckets, now);
  evictIfOversized(accountBuckets, now);

  const ipBucket = ipBuckets.get(ip) ?? { timestamps: [] };
  pruneBucket(ipBucket, now);
  ipBucket.timestamps.push(now);
  ipBuckets.set(ip, ipBucket);

  const accBucket = accountBuckets.get(accountKey) ?? { timestamps: [] };
  pruneBucket(accBucket, now);
  accBucket.timestamps.push(now);
  accountBuckets.set(accountKey, accBucket);
}

export function clearLoginRateLimitForAccount(ip: string, emailInput: string): void {
  const normalizedEmail = emailInput.trim().toLowerCase() || 'empty';
  accountBuckets.delete(`${ip}::${normalizedEmail}`);
}
