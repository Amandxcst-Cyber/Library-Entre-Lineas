import { load } from "cheerio";
import { isbn13, type Edition } from "./shared";
import { allowedUrl, sourceText, SourceError } from "./network";
import { productLinks, robotsAllowed, structuredProducts } from "./stores";

const hosts = ["contrapunto.cl", "www.contrapunto.cl"];
const value = (v: unknown, max = 240) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export function contrapuntoEdition(html: string, page: string): Edition | null {
  const $ = load(html);
  const metadata = $(".pivot-metadata").first().clone();
  metadata.find("br").replaceWith("\n");
  const fields = new Map(
    metadata
      .text()
      .split("\n")
      .map((line) => {
        const colon = line.indexOf(":");
        return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
      }),
  );
  const displayedIsbn = isbn13(fields.get("ISBN") || "");
  const author = value($(".pivot-authors").first().text().replace(/\s+/g, " "));
  for (const product of structuredProducts(html)) {
    const isbn =
      [product.isbn, product.gtin13, product.sku]
        .map((id) => isbn13(String(id || "")))
        .find(Boolean) || "";
    const url =
      typeof product.url === "string" ? allowedUrl(product.url, hosts) : null;
    if (
      !isbn ||
      !author ||
      !url ||
      url.pathname !== new URL(page).pathname ||
      (displayedIsbn && displayedIsbn !== isbn) ||
      !value(product.name)
    )
      continue;
    let cover = "";
    const image = Array.isArray(product.image)
      ? product.image[0]
      : product.image;
    const imageUrl =
      typeof image === "string" ? allowedUrl(image, hosts) : null;
    if (imageUrl?.pathname.startsWith("/cdn/shop/")) cover = imageUrl.href;
    const pageText = fields.get("N° DE PÁGINAS") || "";
    const pages =
      /^\d+$/.test(pageText) &&
      Number(pageText) > 0 &&
      Number(pageText) <= 100000
        ? Number(pageText)
        : null;
    const description = load(value(product.description, 16000));
    description("script,style").remove();
    return {
      id: "contrapunto:" + isbn,
      title: value(product.name),
      author,
      isbn,
      publisher: value(fields.get("EDITORIAL") || product.brand?.name, 200),
      year: null,
      language: value(fields.get("IDIOMA"), 40),
      format: value(fields.get("ENCUADERNACIÓN"), 80),
      translator: "",
      pages,
      cover,
      description: description.text().trim().slice(0, 4000),
      source: "Contrapunto",
      sourceUrl: url.href,
    };
  }
  return null;
}

export async function searchContrapunto(
  query: string,
  fetcher: typeof fetch = fetch,
) {
  const search = new URL("https://contrapunto.cl/search");
  search.searchParams.set("q", isbn13(query) || query);
  search.searchParams.set("type", "product");
  const robots = await sourceText(
    "https://contrapunto.cl/robots.txt",
    hosts,
    fetcher,
    undefined,
    200000,
  );
  const permitted = (url: string) => {
    const u = new URL(url);
    if (!robotsAllowed(robots, u.pathname + u.search))
      throw new SourceError("blocked");
  };
  permitted(search.href);
  const html = await sourceText(search.href, hosts, fetcher);
  if (!/<html[\s>]/i.test(html)) throw new SourceError("unavailable");
  const links = productLinks(html, search.href, hosts).slice(0, 6);
  const results = await Promise.allSettled(
    links.map(async (url) => {
      permitted(url);
      return contrapuntoEdition(await sourceText(url, hosts, fetcher), url);
    }),
  );
  if (results.length && results.every((r) => r.status === "rejected"))
    throw new SourceError("unavailable");
  return {
    editions: results.flatMap((r) =>
      r.status === "fulfilled" && r.value ? [r.value] : [],
    ),
    partial: results.some((r) => r.status === "rejected"),
  };
}
