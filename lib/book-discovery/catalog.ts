import { load } from "cheerio";
import { catalogJson } from "./network";
import { isbn13, type Edition } from "./shared";

const text = (v: unknown, max = 240) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const plain = (v: unknown) => {
  const $ = load(text(v, 16000));
  $("script,style").remove();
  return $.text().trim().slice(0, 4000);
};
const number = (v: unknown, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v > 0 && v <= max ? v : null;
export function coverUrl(value: unknown) {
  try {
    const url = new URL(text(value, 2048));
    if (
      ![
        "books.google.com",
        "books.googleusercontent.com",
        "covers.openlibrary.org",
      ].includes(url.hostname) ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return "";
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.protocol = "https:";
    return url.href;
  } catch {
    return "";
  }
}
export function googleEditions(payload: any): Edition[] {
  if (!Array.isArray(payload?.items)) return [];
  return payload.items.slice(0, 8).flatMap((item: any): Edition[] => {
    const v = item?.volumeInfo;
    if (
      !v ||
      !text(v.title) ||
      !Array.isArray(v.authors) ||
      !v.authors.length ||
      !/^[\w-]{1,100}$/.test(item.id || "")
    )
      return [];
    const isbn =
      (Array.isArray(v.industryIdentifiers) ? v.industryIdentifiers : [])
        .map((i: any) => isbn13(text(i?.identifier)))
        .find(Boolean) || "";
    const match = text(v.publishedDate).match(/^([12]\d{3})(?:-|$)/);
    return [
      {
        id: "google:" + item.id,
        title: text(v.title),
        author: v.authors
          .map((a: unknown) => text(a))
          .filter(Boolean)
          .join(", ")
          .slice(0, 240),
        isbn,
        publisher: text(v.publisher, 200),
        year: match ? Number(match[1]) : null,
        language: text(v.language, 40),
        // Google saleInfo describes its checkout, not necessarily this ISBN's binding.
        format: "",
        translator: "",
        pages: number(v.pageCount, 100000),
        cover: coverUrl(
          v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail,
        ),
        description: plain(v.description),
        source: "Google Books",
        sourceUrl:
          "https://books.google.com/books?id=" + encodeURIComponent(item.id),
      },
    ];
  });
}
export function openEdition(v: any, doc: any): Edition | null {
  const key = text(v?.key);
  if (
    !/^\/books\/OL\d+M$/.test(key) ||
    !text(v.title) ||
    !Array.isArray(doc.author_name)
  )
    return null;
  const isbn =
    [...(v.isbn_13 || []), ...(v.isbn_10 || [])]
      .map((s: unknown) => isbn13(text(s)))
      .find(Boolean) || "";
  const cover =
    Array.isArray(v.covers) && Number.isInteger(v.covers[0]) && v.covers[0] > 0
      ? `https://covers.openlibrary.org/b/id/${v.covers[0]}-M.jpg`
      : "";
  const date = text(v.publish_date).match(/\b([12]\d{3})\b/);
  return {
    id: "open:" + key,
    title: text(v.title),
    author: doc.author_name
      .map((a: unknown) => text(a))
      .join(", ")
      .slice(0, 240),
    isbn,
    publisher: Array.isArray(v.publishers)
      ? v.publishers
          .map((p: unknown) => text(p))
          .join(", ")
          .slice(0, 200)
      : "",
    year: date ? Number(date[1]) : null,
    language: text(v.languages?.[0]?.key?.replace("/languages/", ""), 40),
    format: text(v.physical_format, 80),
    translator: Array.isArray(v.contributors)
      ? v.contributors
          .filter((c: any) =>
            /^(translator|traductor|traductora)$/i.test(c?.role || ""),
          )
          .map((c: any) => text(c.name))
          .join(", ")
          .slice(0, 240)
      : "",
    pages: number(v.number_of_pages, 100000),
    cover,
    description: plain(
      typeof v.description === "object" ? v.description?.value : v.description,
    ),
    source: "Open Library",
    sourceUrl: "https://openlibrary.org" + key,
  };
}
export async function searchCatalog(
  query: string,
  fetcher: typeof fetch = fetch,
) {
  const isbn = isbn13(query);
  const google = new URL("https://www.googleapis.com/books/v1/volumes");
  google.searchParams.set(
    "q",
    isbn ? "isbn:" + isbn : `intitle:"${query.replace(/["\\]/g, " ")}"`,
  );
  google.searchParams.set("maxResults", "8");
  google.searchParams.set("printType", "books");
  const open = new URL("https://openlibrary.org/search.json");
  open.searchParams.set(isbn ? "isbn" : "title", isbn || query);
  open.searchParams.set("limit", "3");
  open.searchParams.set("fields", "title,author_name,edition_key");
  const [g, o] = await Promise.allSettled([
    catalogJson(google.href, fetcher).then((data) => {
      if (
        !data ||
        data.error ||
        (!Array.isArray(data.items) && data.totalItems !== 0)
      )
        throw new Error("Invalid catalog response");
      return data;
    }),
    catalogJson(open.href, fetcher).then((data) => {
      if (!Array.isArray(data?.docs))
        throw new Error("Invalid catalog response");
      return data;
    }),
  ]);
  let editions: Edition[] =
    g.status === "fulfilled" ? googleEditions(g.value) : [];
  let openFailed = false;
  if (o.status === "fulfilled" && Array.isArray(o.value?.docs)) {
    const candidates = o.value.docs
      .slice(0, 3)
      .flatMap((doc: any) =>
        (Array.isArray(doc.edition_key) ? doc.edition_key : [])
          .filter(
            (id: unknown) => typeof id === "string" && /^OL\d+M$/.test(id),
          )
          .slice(0, 2)
          .map((id: string) => ({ doc, id })),
      )
      .slice(0, 4);
    const details = await Promise.allSettled(
      candidates.map(async ({ doc, id }: any) =>
        openEdition(
          await catalogJson(
            `https://openlibrary.org/books/${id}.json`,
            fetcher,
          ),
          doc,
        ),
      ),
    );
    editions.push(
      ...details.flatMap((r) =>
        r.status === "fulfilled" && r.value ? [r.value] : [],
      ),
    );
    openFailed = details.some((r) => r.status === "rejected");
  }
  if (g.status === "rejected" && o.status === "rejected")
    throw new Error(
      "No pudimos consultar los catálogos. Puedes completar el libro manualmente y reintentar.",
    );
  const unique = new Map<string, Edition>();
  for (const e of editions) {
    if (isbn && e.isbn !== isbn) continue;
    const key = e.isbn || e.id;
    const previous = unique.get(key);
    if (!previous) unique.set(key, e);
    else
      unique.set(key, {
        ...previous,
        cover: previous.cover || e.cover,
        description: previous.description || e.description,
        format: previous.format || e.format,
        translator: previous.translator || e.translator,
        pages: previous.pages || e.pages,
        publisher: previous.publisher || e.publisher,
        language: previous.language || e.language,
        year: previous.year || e.year,
        sources: [
          ...(previous.sources || [
            { label: previous.source, url: previous.sourceUrl },
          ]),
          { label: e.source, url: e.sourceUrl },
        ],
      });
  }
  return {
    editions: [...unique.values()].slice(0, 10),
    partial: g.status === "rejected" || o.status === "rejected" || openFailed,
  };
}
