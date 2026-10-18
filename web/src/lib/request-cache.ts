/** جلوگیری از درخواست تکراری همزمان + کش کوتاه سمت مرورگر */
type Entry<T> = { exp: number; promise: Promise<T> };

const store = new Map<string, Entry<unknown>>();

export function cachedRequest<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) {
    return hit.promise as Promise<T>;
  }
  const promise = loader().catch((e) => {
    store.delete(key);
    throw e;
  });
  store.set(key, { exp: now + ttlMs, promise });
  if (store.size > 64) {
    for (const [k, v] of store) {
      if (v.exp <= now) store.delete(k);
    }
  }
  return promise;
}

export function invalidateCachedRequest(keyPrefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
}
