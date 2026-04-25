type CacheEnvelope<T> = {
  v: 1;
  ts: number;
  value: T;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function keyFor(path: string) {
  return `validly.cache:${path}`;
}

export function cacheGet<T>(path: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(path));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || parsed.v !== 1) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function cacheSet<T>(path: string, value: T) {
  if (!canUseStorage()) return;
  try {
    const env: CacheEnvelope<T> = { v: 1, ts: Date.now(), value };
    window.localStorage.setItem(keyFor(path), JSON.stringify(env));
  } catch {
    // ignore quota/serialization issues
  }
}

