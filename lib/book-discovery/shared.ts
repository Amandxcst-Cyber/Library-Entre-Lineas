export type Edition = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  year: number | null;
  language: string;
  format: string;
  translator: string;
  pages: number | null;
  cover: string;
  description: string;
  source: string;
  sourceUrl: string;
  sources?: { label: string; url: string }[];
};
export type Offer = {
  store: string;
  isbn: string;
  price: number;
  url: string;
  available: boolean | null;
  checkedAt: string;
};
export type StoreResult = {
  store: string;
  searchUrl: string;
  status: "verified" | "unavailable" | "blocked" | "no_match";
  offers: Offer[];
};
export type Comparison = { isbn: string; stores: StoreResult[] };
export type Preference = "reading" | "collecting" | "translation";

export function isbn13(value: string): string {
  const raw = value.toUpperCase().replace(/[\s-]/g, "");
  if (/^\d{9}[\dX]$/.test(raw)) {
    const sum = [...raw].reduce(
      (s, c, i) => s + (c === "X" ? 10 : Number(c)) * (10 - i),
      0,
    );
    if (sum % 11) return "";
    const prefix = "978" + raw.slice(0, 9);
    const check =
      (10 -
        ([...prefix].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) %
          10)) %
      10;
    return prefix + check;
  }
  if (!/^97[89]\d{10}$/.test(raw)) return "";
  return [...raw].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) %
    10 ===
    0
    ? raw
    : "";
}
export function spanish(language: string) {
  return /^(es|spa|español|spanish)(-|$)/i.test(language);
}
export function cheapest(comparison?: Comparison) {
  return comparison?.stores
    .flatMap((s) => s.offers)
    .filter((o) => o.available === true && o.isbn === comparison.isbn)
    .sort((a, b) => a.price - b.price)[0];
}
export function recommend(
  editions: Edition[],
  preference: Preference,
  prices: Record<string, Comparison> = {},
) {
  const ranked = editions
    .map((edition) => {
      const reasons: string[] = [];
      let score = 0;
      if (spanish(edition.language)) {
        score += 20;
        reasons.push("El catálogo indica que está en español.");
      }
      if (
        preference === "collecting" &&
        /hardcover|hardback|tapa dura|cartoné/i.test(edition.format)
      ) {
        score += 15;
        reasons.push("Su formato de tapa dura encaja con una colección.");
      }
      if (preference === "translation" && edition.translator) {
        score += 12;
        reasons.push(
          `La fuente identifica la traducción: ${edition.translator}. Esto permite investigarla, pero no demuestra su calidad.`,
        );
      }
      if (edition.isbn) {
        score += 2;
      }
      const offer = cheapest(prices[edition.isbn]);
      if (offer) {
        reasons.push(
          `Tiene una oferta con stock confirmado de $${offer.price.toLocaleString("es-CL")} CLP para este ISBN, sin envío.`,
        );
      }
      return { edition, reasons, score, price: offer?.price ?? Infinity };
    })
    .sort((a, b) => b.score - a.score || a.price - b.price);
  if (!ranked.length) return null;
  const best = ranked[0];
  return {
    ...best,
    reasons: best.reasons.length
      ? best.reasons
      : [
          "Hay pocos datos para elegir: revisa idioma, formato y traducción antes de comprar.",
        ],
    limitations:
      "Orientación basada en los datos del catálogo, no en una lectura de la traducción. Los precios sin consultar y el envío no se comparan. No se presume que más páginas o una edición más reciente sean mejores.",
  };
}
