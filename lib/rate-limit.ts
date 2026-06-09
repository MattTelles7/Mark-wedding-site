type RateLimitStore = Map<string, number[]>;

declare global {
  var __weddingRateLimitStore: RateLimitStore | undefined;
}

const store =
  globalThis.__weddingRateLimitStore ??
  (globalThis.__weddingRateLimitStore = new Map<string, number[]>());

const MAX_KEYS = 5_000;

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult =
  | { allowed: true; retryAfterSeconds: 0 }
  | { allowed: false; retryAfterSeconds: number };

export function rateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (store.get(key) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );

  if (recent.length >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recent[0] + windowMs - now) / 1000),
    );
    store.delete(key);
    store.set(key, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  store.delete(key);
  store.set(key, recent);

  if (store.size > MAX_KEYS) {
    const keysToDelete = store.size - MAX_KEYS;
    let deleted = 0;

    for (const storedKey of store.keys()) {
      store.delete(storedKey);
      deleted += 1;
      if (deleted >= keysToDelete) {
        break;
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
