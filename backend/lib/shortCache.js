/** پاسخ کوتاه‌مدت در حافظه — برای endpointهای پرخوان عمومی */
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.exp <= now) store.delete(key);
  }
}

/**
 * @template T
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<T>} loader
 * @returns {Promise<T>}
 */
async function getOrLoad(key, ttlMs, loader) {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) {
    return hit.data;
  }
  const data = await loader();
  store.set(key, { data, exp: Date.now() + ttlMs });
  if (store.size > 200) prune();
  return data;
}

function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** فقط درخواست‌های همزمان با کلید یکسان — بدون کش بعد از اتمام */
const inflight = new Map();

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} loader
 * @returns {Promise<T>}
 */
function dedupeInflight(key, loader) {
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = Promise.resolve()
    .then(loader)
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/** پس از تغییر قفل سانس — درخواست‌های در حال dedupe برای همان روز/زمین باطل شوند */
function invalidateInflightPrefix(prefix) {
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

module.exports = {
  getOrLoad,
  invalidatePrefix,
  dedupeInflight,
  invalidateInflightPrefix,
};
