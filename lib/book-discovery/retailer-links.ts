import { isbn13, type Comparison } from "./shared";

export const retailers = [
  {
    name: "Penguin Libros",
    home: "https://www.penguinlibros.com/cl/",
    domain: "www.penguinlibros.com/cl/",
    origin: "https://www.penguinlibros.com",
    search: (isbn: string) =>
      `https://www.penguinlibros.com/cl/busqueda?controller=search&s=${isbn}`,
  },
  {
    name: "Antártica",
    home: "https://www.antartica.cl/",
    domain: "antartica.cl",
    origin: "https://www.antartica.cl",
    search: (isbn: string) =>
      `https://www.antartica.cl/catalogsearch/result/?q=${isbn}`,
  },
  {
    name: "Buscalibre",
    home: "https://www.buscalibre.cl/",
    domain: "buscalibre.cl",
    origin: "https://www.buscalibre.cl",
    search: (isbn: string) =>
      `https://www.buscalibre.cl/libros/search?q=${isbn}`,
  },
  {
    name: "Contrapunto",
    home: "https://contrapunto.cl/",
    domain: "contrapunto.cl",
    origin: "https://contrapunto.cl",
    search: (isbn: string) =>
      `https://contrapunto.cl/search?q=${isbn}&type=product`,
  },
];
export function retailerWebSearch(name: string, isbn: string) {
  const store = retailers.find((s) => s.name === name);
  const code = isbn13(isbn);
  if (!store || !code) return "";
  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(`site:${store.domain} "${code}"`)
  );
}
/** Store a blocked source separately from a verified offer; never present a blocked search as a working product link. */
export function comparisonRows(isbn: string, comparison: Comparison | null) {
  const code = isbn13(isbn);
  return retailers
    .map((retailer) => {
      const result =
        comparison?.isbn === code
          ? comparison.stores.find((s) => s.store === retailer.name)
          : undefined;
      const offers = (result?.offers || []).filter((o) => {
        if (
          !code ||
          o.isbn !== code ||
          o.store !== retailer.name ||
          !Number.isInteger(o.price) ||
          o.price <= 0
        )
          return false;
        try {
          const url = new URL(o.url);
          return (
            url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            !url.port &&
            url.hostname.replace(/^www\./, "") ===
              new URL(retailer.home).hostname.replace(/^www\./, "") &&
            (retailer.name !== "Penguin Libros" ||
              url.pathname.startsWith("/cl/"))
          );
        } catch {
          return false;
        }
      });
      return { ...retailer, status: result?.status || "unavailable", offers };
    })
    .sort((a, b) => Number(!!b.offers.length) - Number(!!a.offers.length));
}
