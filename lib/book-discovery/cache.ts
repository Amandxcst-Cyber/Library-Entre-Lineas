import { HttpError } from "../auth";
const requests = new Map<string, { start: number; count: number }>();
const cache = new Map<string, { until: number; value: Promise<unknown> }>();
export function discoveryLimit(user: string) {
  const now = Date.now();
  for (const [key, value] of requests)
    if (now - value.start >= 60000) requests.delete(key);
  const current = requests.get(user) || { start: now, count: 0 };
  current.count++;
  requests.set(user, current);
  if (current.count > 30)
    throw new HttpError(
      429,
      "Muchas búsquedas seguidas. Espera un minuto y vuelve a intentar.",
    );
}
export async function cached<T>(
  key: string,
  ttl: number,
  get: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.until <= now) cache.delete(key);
  const previous = cache.get(key);
  if (previous) return previous.value as Promise<T>;
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  const value = get();
  cache.set(key, { until: now + ttl, value });
  try {
    return await value;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}
