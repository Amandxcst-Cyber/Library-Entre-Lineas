import { load } from "cheerio";
import { allowedUrl, SourceError, sourceText, STORE_HOSTS } from "./network";
import {
  isbn13,
  type Comparison,
  type Offer,
  type StoreResult,
} from "./shared";

export const stores = [
  {
    name: "Penguin Libros",
    origin: "https://www.penguinlibros.com",
    search: (isbn: string) =>
      `https://www.penguinlibros.com/cl/busqueda?controller=search&s=${isbn}`,
  },
  {
    name: "Antártica",
    origin: "https://www.antartica.cl",
    search: (isbn: string) =>
      `https://www.antartica.cl/catalogsearch/result/?q=${isbn}`,
  },
  {
    name: "Buscalibre",
    origin: "https://www.buscalibre.cl",
    search: (isbn: string) =>
      `https://www.buscalibre.cl/libros/search?q=${isbn}`,
  },
  {
    name: "Contrapunto",
    origin: "https://contrapunto.cl",
    search: (isbn: string) =>
      `https://contrapunto.cl/search?q=${isbn}&type=product`,
  },
];
export function robotsAllowed(robots: string, path: string) {
  const groups: {
    agents: string[];
    rules: { allow: boolean; value: string }[];
    delay: number;
  }[] = [];
  let current = {
    agents: [] as string[],
    rules: [] as { allow: boolean; value: string }[],
    delay: 0,
  };
  let hasRules = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase(),
      value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (hasRules) {
        groups.push(current);
        current = { agents: [], rules: [], delay: 0 };
        hasRules = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (["allow", "disallow"].includes(key)) {
      current.rules.push({ allow: key === "allow", value });
      hasRules = true;
    } else if (key === "crawl-delay") {
      current.delay = Number(value) || 0;
      hasRules = true;
    }
  }
  groups.push(current);
  const explicit = groups.filter((g) =>
    g.agents.some((a) => a !== "*" && "amandaentrelineas".startsWith(a)),
  );
  const selected = explicit.length
    ? explicit
    : groups.filter((g) => g.agents.includes("*"));
  if (selected.some((g) => g.delay > 0)) return false;
  const matches = selected
    .flatMap((g) => g.rules)
    .filter((r) => {
      if (!r.value) return false;
      const end = r.value.endsWith("$");
      const escaped = r.value
        .replace(/\$$/, "")
        .split("*")
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      return new RegExp("^" + escaped + (end ? "$" : "")).test(path);
    })
    .sort(
      (a, b) =>
        b.value.replace(/\*/g, "").length - a.value.replace(/\*/g, "").length ||
        Number(b.allow) - Number(a.allow),
    );
  return matches[0]?.allow ?? true;
}
export function productOffers(
  html: string,
  page: string,
  isbn: string,
  store: string,
  checkedAt: string,
): Offer[] {
  const host = new URL(page).hostname;
  const $ = load(html);
  const products: any[] = [];
  const collect = (node: any, depth = 0) => {
    if (!node || depth > 8) return;
    if (Array.isArray(node)) {
      node.slice(0, 100).forEach((n) => collect(n, depth + 1));
      return;
    }
    if (typeof node !== "object") return;
    const types = Array.isArray(node["@type"])
      ? node["@type"]
      : [node["@type"]];
    if (
      types.some(
        (type: unknown) =>
          typeof type === "string" &&
          ["Product", "Book"].includes(type.split("/").pop() || ""),
      )
    )
      products.push(node);
    for (const key of [
      "@graph",
      "itemListElement",
      "item",
      "mainEntity",
      "hasVariant",
    ])
      collect(node[key], depth + 1);
  };
  $("script[type='application/ld+json']")
    .slice(0, 40)
    .each((_, script) => {
      try {
        collect(JSON.parse($(script).text()));
      } catch {
        /* Another schema block may contain a valid offer. */
      }
    });
  const results: Offer[] = [];
  for (const product of products) {
    const identity = [product.isbn, product.gtin13, product.gtin, product.sku]
      .map((v) =>
        typeof v === "string" || typeof v === "number" ? isbn13(String(v)) : "",
      )
      .filter(Boolean);
    if (!identity.includes(isbn)) continue;
    const offers = Array.isArray(product.offers)
      ? product.offers
      : [product.offers];
    for (const offer of offers.slice(0, 30)) {
      if (
        !offer ||
        offer.priceCurrency !== "CLP" ||
        offer.validForMemberTier ||
        offer.priceSpecification?.validForMemberTier ||
        offer.priceSpecification?.valueAddedTaxIncluded === false
      )
        continue;
      if (
        offer["@type"] === "AggregateOffer" ||
        offer["@type"] === "AggregateOffers"
      )
        continue;
      const price =
        typeof offer.price === "number"
          ? offer.price
          : /^\d+(?:\.\d{1,2})?$/.test(offer.price || "")
            ? Number(offer.price)
            : NaN;
      if (!Number.isInteger(price) || price <= 0 || price > 10_000_000)
        continue;
      const href = offer.url || product.url;
      if (!href && /(?:search|busqueda)/i.test(new URL(page).pathname))
        continue;
      let url: URL | null = null;
      try {
        url = allowedUrl(
          new URL(typeof href === "string" ? href : page, page).href,
          STORE_HOSTS.filter(
            (h) => h.replace(/^www\./, "") === host.replace(/^www\./, ""),
          ),
        );
      } catch {
        continue;
      }
      if (!url) continue;
      const stock =
        typeof offer.availability === "string"
          ? offer.availability.split("/").pop()
          : "";
      const available =
        stock === "InStock"
          ? true
          : ["OutOfStock", "Discontinued", "SoldOut"].includes(stock)
            ? false
            : null;
      results.push({ store, isbn, price, url: url.href, available, checkedAt });
    }
  }
  return [...new Map(results.map((o) => [o.url + ":" + o.price, o])).values()];
}
export async function compareStores(
  isbn: string,
  fetcher: typeof fetch = fetch,
): Promise<Comparison> {
  if (!isbn13(isbn) || isbn13(isbn) !== isbn)
    throw new Error("Busca una edición con ISBN válido.");
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(
    stores.map(async (store): Promise<StoreResult> => {
      const searchUrl = store.search(isbn);
      const allowedHosts = STORE_HOSTS.filter(
        (h) =>
          h.replace(/^www\./, "") ===
          new URL(store.origin).hostname.replace(/^www\./, ""),
      );
      try {
        let robots = "";
        try {
          robots = await sourceText(
            store.origin + "/robots.txt",
            allowedHosts,
            fetcher,
            undefined,
            200000,
          );
        } catch (e) {
          if (!(e instanceof SourceError && e.status === 404)) throw e;
        }
        const permitted = (url: string) => {
          const u = new URL(url);
          if (!robotsAllowed(robots, u.pathname + u.search))
            throw new SourceError("blocked");
        };
        permitted(searchUrl);
        const html = await sourceText(searchUrl, allowedHosts, fetcher);
        let offers = productOffers(
          html,
          searchUrl,
          isbn,
          store.name,
          checkedAt,
        );
        if (!offers.length) {
          const $ = load(html);
          const links: string[] = [];
          $("a[href]").each((_, element) => {
            const href = $(element).attr("href");
            if (!href) return;
            try {
              const u = allowedUrl(new URL(href, searchUrl).href, allowedHosts);
              if (
                u &&
                u.pathname !== new URL(searchUrl).pathname &&
                !u.search &&
                (u.pathname.includes(isbn) ||
                  /\/(product|products|libro|libros)\//i.test(u.pathname))
              )
                links.push(u.href);
            } catch {
              /* Ignore malformed links. */
            }
          });
          for (const link of [...new Set(links)].slice(0, 2)) {
            permitted(link);
            const page = await sourceText(link, allowedHosts, fetcher);
            offers.push(
              ...productOffers(page, link, isbn, store.name, checkedAt),
            );
            if (offers.length) break;
          }
        }
        return {
          store: store.name,
          searchUrl,
          status: offers.length ? "verified" : "no_match",
          offers,
        };
      } catch (e) {
        return {
          store: store.name,
          searchUrl,
          status:
            e instanceof SourceError && e.kind === "blocked"
              ? "blocked"
              : "unavailable",
          offers: [],
        };
      }
    }),
  );
  return { isbn, stores: results };
}
