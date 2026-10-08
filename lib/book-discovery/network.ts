export class SourceError extends Error {
  constructor(
    public kind: "blocked" | "unavailable",
    public status = 0,
  ) {
    super(kind);
  }
}
export const STORE_HOSTS = [
  "www.penguinlibros.com",
  "www.antartica.cl",
  "antartica.cl",
  "www.buscalibre.cl",
  "buscalibre.cl",
  "contrapunto.cl",
  "www.contrapunto.cl",
];
const CATALOG_HOSTS = ["openlibrary.org", "www.googleapis.com"];
export function allowedUrl(value: string, hosts: string[]) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      hosts.includes(u.hostname)
      ? u
      : null;
  } catch {
    return null;
  }
}
export async function sourceText(
  url: string,
  hosts: string[],
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
  maxBytes = 2_000_000,
): Promise<string> {
  let current = allowedUrl(url, hosts);
  if (!current) throw new SourceError("blocked");
  const deadline = AbortSignal.timeout(6500);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  for (let n = 0; n < 3; n++) {
    const response = await fetcher(current.href, {
      redirect: "manual",
      cache: "no-store",
      signal: requestSignal,
      headers: {
        "User-Agent": "AmandaEntreLineas/1.0 (ISBN catalog comparison)",
        Accept: "application/json,text/html,text/plain",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = allowedUrl(
        new URL(response.headers.get("location") || "", current).href,
        hosts,
      );
      await response.body?.cancel();
      if (!next) throw new SourceError("blocked");
      current = next;
      continue;
    }
    if ([401, 403, 429].includes(response.status)) {
      await response.body?.cancel();
      throw new SourceError("blocked", response.status);
    }
    if (
      !response.ok ||
      Number(response.headers.get("content-length")) > maxBytes
    ) {
      await response.body?.cancel();
      throw new SourceError("unavailable", response.status);
    }
    if (!response.body) throw new SourceError("unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > maxBytes) throw new SourceError("unavailable");
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    const all = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      all.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(all);
  }
  throw new SourceError("blocked");
}
export async function catalogJson(url: string, fetcher: typeof fetch = fetch) {
  return JSON.parse(await sourceText(url, CATALOG_HOSTS, fetcher));
}
