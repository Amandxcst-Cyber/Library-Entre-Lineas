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
export type EditionOption = {
  edition: Edition;
  comparison: Comparison | null;
  extras: string;
  note: string;
};
/** Only local store purchase/search links. Bibliographic sources remain separate. */
export function chilePurchaseUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      ([
        "antartica.cl",
        "www.antartica.cl",
        "buscalibre.cl",
        "www.buscalibre.cl",
        "contrapunto.cl",
        "www.contrapunto.cl",
      ].includes(u.hostname) ||
        (u.hostname === "www.penguinlibros.com" &&
          u.pathname.startsWith("/cl/")))
    );
  } catch {
    return false;
  }
}
export function editionFeatures(edition: Pick<Edition, "title" | "format">) {
  const value = edition.title + " " + edition.format;
  return [
    /ilustrad[ao]/i.test(value) ? "Ilustrada" : "",
    /bolsillo|pocket/i.test(value) ? "De bolsillo" : "",
    /cantos pintados/i.test(value) ? "Cantos pintados" : "",
    /(?:edici[oó]n|ed\.)\s*limitada/i.test(value) ? "Edición limitada" : "",
  ].filter(Boolean);
}
export function editionReasons(edition: Edition, extras = "") {
  const reasons: string[] = [];
  if (/tapa dura|hardcover|hardback|cartoné/i.test(edition.format))
    reasons.push(
      "Tapa dura: una opción para quien prefiere una cubierta rígida.",
    );
  if (/tapa blanda|paperback|softcover|rústica/i.test(edition.format))
    reasons.push(
      "Tapa blanda: una alternativa a la cubierta rígida; compara su precio para decidir.",
    );
  if (editionFeatures(edition).includes("Ilustrada"))
    reasons.push(
      "La ficha la identifica como ilustrada: aporta una experiencia visual además del texto.",
    );
  if (editionFeatures(edition).includes("De bolsillo"))
    reasons.push(
      "La ficha indica formato de bolsillo: una opción si buscas una edición compacta.",
    );
  if (edition.translator)
    reasons.push(
      `Traducción identificada: ${edition.translator}. Su calidad requiere revisar la traducción, no solo la editorial.`,
    );
  if (extras) reasons.push(`Detalles anotados por Amanda: ${extras}`);
  if (!reasons.length)
    reasons.push(
      "Faltan detalles para recomendar este formato. Revisa la ficha de la librería.",
    );
  return reasons;
}
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

export function sameWork(
  a: Pick<Edition, "title" | "author">,
  b: Pick<Edition, "title" | "author">,
) {
  const normalized = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const title = (value: string) =>
    normalized(value)
      .replace(/[\[(].*?[\])]/g, " ")
      .replace(/\b(?:edicion|ed\.)\s.*$/, "")
      .replace(
        /\b(?:ilustrad[ao]|tapa dura|tapa blanda|de bolsillo|bolsillo|hardcover|paperback|rustica|cartone)\b/g,
        " ",
      )
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return (
    !!a.author.trim() &&
    normalized(a.author).replace(/[^a-z0-9]/g, "") ===
      normalized(b.author).replace(/[^a-z0-9]/g, "") &&
    title(a.title) === title(b.title)
  );
}

export function bookReferencePrice(book: {
  price: number | null;
  isbn: string;
  edition_options?: EditionOption[];
}) {
  if (book.price !== null) return book.price;
  const selected = book.edition_options?.find(
    (o) => o.edition.isbn === isbn13(book.isbn),
  );
  return cheapest(selected?.comparison || undefined)?.price ?? null;
}
