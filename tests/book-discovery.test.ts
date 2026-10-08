import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isbn13,
  cheapest,
  recommend,
  type Edition,
  type Comparison,
} from "../lib/book-discovery/shared";
import {
  googleEditions,
  openEdition,
  searchCatalog,
  coverUrl,
} from "../lib/book-discovery/catalog";
import { sourceText, allowedUrl } from "../lib/book-discovery/network";
import {
  robotsAllowed,
  productOffers,
  compareStores,
  productLinks,
} from "../lib/book-discovery/stores";
import {
  contrapuntoEdition,
  searchContrapunto,
} from "../lib/book-discovery/retailer-catalog";
import { bookSchema } from "../lib/validation";

const isbn = "9780141439518";
const other = "9780141439600";
const edition: Edition = {
  id: "fixture",
  title: "Historia de prueba",
  author: "Autora",
  isbn,
  publisher: "Editorial sintética",
  year: 2024,
  language: "es",
  format: "Tapa dura",
  translator: "",
  pages: 320,
  cover: "",
  description: "",
  source: "Fixture",
  sourceUrl: "https://openlibrary.org/books/OL1M",
};
const page = "https://www.antartica.cl/libro-de-prueba.html";
const jsonProduct = (patch: any = {}) => ({
  "@type": "Product",
  isbn,
  offers: {
    "@type": "Offer",
    price: "15990",
    priceCurrency: "CLP",
    availability: "https://schema.org/InStock",
  },
  ...patch,
});
const html = (data: unknown) =>
  '<script type="application/ld+json">' + JSON.stringify(data) + "</script>";
test("ISBN verifica dígito de control y normaliza ISBN-10", () => {
  assert.equal(isbn13("0-14-143951-3"), isbn);
  assert.equal(isbn13("978-0-14-143951-8"), isbn);
  for (const bad of [
    "9780141439519",
    "1234567890123",
    "ISBN desconocido",
    "0141439514",
  ])
    assert.equal(isbn13(bad), "");
  assert.equal(
    bookSchema.safeParse({
      title: "Historia",
      author: "Autora",
      priority: "love",
      isbn: "9780141439519",
    }).success,
    false,
  );
});
test("Importar metadata conserva la edición y limpia HTML sin atribuir traducciones", () => {
  const result = googleEditions({
    items: [
      {
        id: "test-volume",
        saleInfo: { isEbook: true },
        volumeInfo: {
          title: "Historia",
          authors: ["Autora"],
          industryIdentifiers: [{ identifier: isbn }],
          publishedDate: "2024-01",
          language: "es",
          publisher: "Editorial",
          description: "<p>Sinopsis <b>breve</b></p>",
          pageCount: 320,
          imageLinks: {
            thumbnail: "http://books.google.com/books/content?id=test-volume",
          },
        },
      },
    ],
  });
  assert.equal(result[0].isbn, isbn);
  assert.equal(result[0].description, "Sinopsis breve");
  assert.equal(result[0].translator, "");
  assert.equal(result[0].format, "");
  assert.ok(result[0].cover.startsWith("https:"));
  assert.equal(coverUrl("https://127.0.0.1/image.jpg"), "");
  const open = openEdition(
    {
      key: "/books/OL1M",
      title: "Historia",
      isbn_13: [isbn],
      physical_format: "Paperback",
      languages: [{ key: "/languages/spa" }],
      contributors: [{ role: "translator", name: "Traductora identificada" }],
    },
    { author_name: ["Autora"] },
  );
  assert.equal(open?.translator, "Traductora identificada");
  assert.equal(open?.language, "spa");
});
test("Solo el mismo ISBN combina fuentes y conserva sus referencias", async () => {
  const fetcher = (async (url: any) => {
    const u = String(url);
    if (u.includes("googleapis"))
      return Response.json({
        items: [
          {
            id: "google-one",
            volumeInfo: {
              title: "Historia",
              authors: ["Autora"],
              industryIdentifiers: [{ identifier: isbn }],
              language: "es",
            },
          },
        ],
      });
    if (u.includes("search.json"))
      return Response.json({
        docs: [{ author_name: ["Autora"], edition_key: ["OL1M", "OL2M"] }],
      });
    return Response.json({
      key: u.includes("OL1M") ? "/books/OL1M" : "/books/OL2M",
      title: "Historia",
      isbn_13: [u.includes("OL1M") ? isbn : other],
      physical_format: "Paperback",
      languages: [{ key: "/languages/spa" }],
    });
  }) as typeof fetch;
  const result = await searchCatalog("Historia", fetcher);
  assert.equal(result.editions.length, 2);
  const merged = result.editions.find((e) => e.isbn === isbn)!;
  assert.equal(merged.format, "Paperback");
  assert.equal(merged.sources?.length, 2);
});
test("Fuentes externas no pueden redirigir a IP privadas ni devolver respuestas ilimitadas", async () => {
  assert.equal(
    allowedUrl("https://www.antartica.cl.evil.test/x", ["www.antartica.cl"]),
    null,
  );
  assert.equal(
    allowedUrl("https://user:secret@www.antartica.cl/x", ["www.antartica.cl"]),
    null,
  );
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return new Response("", {
      status: 302,
      headers: { location: "http://127.0.0.1/admin" },
    });
  }) as typeof fetch;
  await assert.rejects(sourceText(page, ["www.antartica.cl"], fetcher));
  assert.equal(calls, 1);
  await assert.rejects(
    sourceText(
      page,
      ["www.antartica.cl"],
      (async () => new Response("x".repeat(20))) as typeof fetch,
      undefined,
      10,
    ),
  );
});
test("Un catálogo fallido no convierte la búsqueda en vacía ni borra la fuente válida", async () => {
  const fetcher = (async (url: any) => {
    if (String(url).startsWith("https://openlibrary.org"))
      return new Response("unavailable", { status: 503 });
    return Response.json({
      items: [
        {
          id: "test",
          volumeInfo: {
            title: "Historia",
            authors: ["Autora"],
            industryIdentifiers: [{ identifier: isbn }],
            language: "es",
          },
        },
      ],
    });
  }) as typeof fetch;
  const result = await searchCatalog("Historia", fetcher);
  assert.equal(result.editions.length, 1);
  assert.equal(result.partial, true);
  await assert.rejects(
    searchCatalog(
      "Historia",
      (async () => new Response("", { status: 503 })) as typeof fetch,
    ),
  );
});
test("La búsqueda por ISBN descarta otros libros aun si el proveedor los devuelve", async () => {
  const fetcher = (async (url: any) =>
    String(url).includes("openlibrary")
      ? Response.json({ docs: [] })
      : Response.json({
          items: [
            {
              id: "different",
              volumeInfo: {
                title: "Otro",
                authors: ["Autora"],
                industryIdentifiers: [{ identifier: other }],
              },
            },
          ],
        })) as typeof fetch;
  assert.equal((await searchCatalog(isbn, fetcher)).editions.length, 0);
});
test("Las ofertas exigen ISBN coincidente, CLP e importe entero; no mezclan ediciones ni monedas", () => {
  const offers = productOffers(
    html({
      "@graph": [
        jsonProduct(),
        jsonProduct({ isbn: other }),
        jsonProduct({ offers: { price: 10, priceCurrency: "USD" } }),
      ],
    }),
    page,
    isbn,
    "Antártica",
    "2026-10-08T00:00:00Z",
  );
  assert.equal(offers.length, 1);
  assert.equal(offers[0].price, 15990);
  assert.equal(offers[0].available, true);
  for (const price of ["$15.990", "15.990", 0, -1, 1.2, 10000001])
    assert.equal(
      productOffers(
        html(jsonProduct({ offers: { price, priceCurrency: "CLP" } })),
        page,
        isbn,
        "Antártica",
        "date",
      ).length,
      0,
    );
});
test("Ofertas de miembros, precios agregados y sin impuestos no se declaran como precio general", () => {
  for (const patch of [
    { validForMemberTier: "club" },
    { "@type": "AggregateOffers" },
    { priceSpecification: { valueAddedTaxIncluded: false } },
  ]) {
    assert.equal(
      productOffers(
        html(jsonProduct({ offers: { ...jsonProduct().offers, ...patch } })),
        page,
        isbn,
        "Antártica",
        "date",
      ).length,
      0,
    );
  }
});
test("Stock desconocido o agotado nunca gana la comparación de precios", () => {
  const comparison: Comparison = {
    isbn,
    stores: [
      {
        store: "Fixture",
        status: "verified",
        searchUrl: page,
        offers: [
          {
            store: "Fixture",
            isbn,
            price: 100,
            url: page,
            available: null,
            checkedAt: "date",
          },
          {
            store: "Fixture",
            isbn,
            price: 200,
            url: page,
            available: false,
            checkedAt: "date",
          },
          {
            store: "Fixture",
            isbn,
            price: 300,
            url: page,
            available: true,
            checkedAt: "date",
          },
        ],
      },
    ],
  };
  assert.equal(cheapest(comparison)?.price, 300);
});
test("robots.txt respeta prohibiciones, reglas específicas y no evade el bloqueo", async () => {
  assert.equal(
    robotsAllowed("User-agent: *\nDisallow: /search", "/search?q=1"),
    false,
  );
  assert.equal(
    robotsAllowed(
      "User-agent: *\nDisallow: /\nAllow: /products/",
      "/products/book",
    ),
    true,
  );
  assert.equal(
    robotsAllowed(
      "User-agent: AmandaEntreLineas\nDisallow: /\nUser-agent: *\nAllow: /",
      "/products/book",
    ),
    false,
  );
  assert.equal(
    robotsAllowed("User-agent: *\nCrawl-delay: 10", "/products/book"),
    false,
  );
  let productRequests = 0;
  const fetcher = (async (url: any) => {
    if (String(url).endsWith("/robots.txt"))
      return new Response("User-agent: *\nDisallow: /");
    productRequests++;
    return new Response("");
  }) as typeof fetch;
  const result = await compareStores(isbn, fetcher);
  assert.equal(productRequests, 0);
  assert.ok(
    result.stores.every((s) => s.status === "blocked" && !s.offers.length),
  );
});
test("Comparación aislada consulta las cuatro fuentes y distingue errores de stock", async () => {
  const fetcher = (async (url: any) => {
    if (String(url).endsWith("/robots.txt"))
      return new Response("", { status: 404 });
    if (String(url).includes("buscalibre"))
      return new Response("", { status: 403 });
    return new Response(
      html(
        jsonProduct({ url: new URL("/products/fixture", String(url)).href }),
      ),
    );
  }) as typeof fetch;
  const result = await compareStores(isbn, fetcher);
  assert.equal(result.stores.length, 4);
  assert.equal(
    result.stores.find((s) => s.store === "Buscalibre")?.status,
    "blocked",
  );
  assert.equal(result.stores.filter((s) => s.status === "verified").length, 3);
  assert.ok(
    result.stores
      .flatMap((s) => s.offers)
      .every((o) => o.isbn === isbn && o.checkedAt),
  );
});
test("Recomendación favorece español y no inventa calidad de traducción, extras o mejor edición", () => {
  const best = recommend(
    [{ ...edition, id: "english", language: "en" }, edition],
    "reading",
  );
  assert.equal(best?.edition.id, "fixture");
  assert.ok(best?.limitations.includes("no en una lectura"));
  const translation = recommend(
    [{ ...edition, id: "translation", translator: "Traductora" }],
    "translation",
  );
  assert.ok(
    translation?.reasons.some((r) => r.includes("no demuestra su calidad")),
  );
  assert.equal(recommend([], "reading"), null);
});
test("Una respuesta inválida del proveedor no parece un catálogo vacío", async () => {
  await assert.rejects(
    searchCatalog("Historia", (async () =>
      Response.json({ error: "upstream problem" })) as typeof fetch),
  );
  const empty = await searchCatalog("Historia", (async (url: any) =>
    String(url).includes("contrapunto.cl")
      ? new Response("<html><body>Sin resultados</body></html>")
      : Response.json(
          String(url).includes("openlibrary")
            ? { docs: [] }
            : { totalItems: 0 },
        )) as typeof fetch);
  assert.equal(empty.editions.length, 0);
  assert.equal(empty.partial, false);
});
test("Una oferta malformada no borra otra válida ni permite enlaces ajenos a la librería", () => {
  const product = jsonProduct({
    offers: [
      { ...jsonProduct().offers, url: "http://[invalid" },
      { ...jsonProduct().offers, url: "https://example.com/other" },
      jsonProduct().offers,
    ],
  });
  assert.equal(
    productOffers(html(product), page, isbn, "Antártica", "date").length,
    1,
  );
  assert.equal(
    productOffers(
      html(jsonProduct()),
      "https://www.antartica.cl/catalogsearch/result/?q=" + isbn,
      isbn,
      "Antártica",
      "date",
    ).length,
    0,
  );
});

test("El ISBN de Open Library se consulta directamente sin tomar otra edición de la obra", async () => {
  const calls: string[] = [];
  const fetcher = (async (url: any) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("googleapis"))
      return new Response("rate limit", { status: 429 });
    if (u.includes("contrapunto"))
      return new Response("<html><body>Sin resultados</body></html>");
    if (u.includes("/isbn/"))
      return Response.json({
        key: "/books/OL1M",
        title: "Historia",
        isbn_13: [isbn],
        authors: [{ key: "/authors/OL1A" }],
        languages: [{ key: "/languages/spa" }],
      });
    if (u.includes("/authors/OL1A"))
      return Response.json({ name: "Autora de esta edición" });
    throw new Error("Unexpected request");
  }) as typeof fetch;
  const result = await searchCatalog(isbn, fetcher);
  assert.equal(result.editions[0].isbn, isbn);
  assert.equal(result.editions[0].author, "Autora de esta edición");
  assert.ok(!calls.some((url) => url.includes("search.json")));
  assert.equal(result.partial, true);
});

test("Los colaboradores de una obra no se atribuyen a una edición con autores propios", async () => {
  const fetcher = (async (url: any) => {
    const u = String(url);
    if (u.includes("googleapis")) return Response.json({ totalItems: 0 });
    if (u.includes("contrapunto"))
      return new Response("<html><body>Sin resultados</body></html>");
    if (u.includes("search.json"))
      return Response.json({
        docs: [
          {
            author_name: ["Autora", "Colaboradora de otra edición"],
            edition_key: ["OL1M"],
          },
        ],
      });
    if (u.includes("/authors/")) return Response.json({ name: "Autora" });
    return Response.json({
      key: "/books/OL1M",
      title: "Historia",
      isbn_13: [isbn],
      authors: [{ key: "/authors/OL1A" }],
      languages: [{ key: "/languages/spa" }],
    });
  }) as typeof fetch;
  const result = await searchCatalog("Historia", fetcher);
  assert.equal(result.editions[0].author, "Autora");
});

test("Una variante con otro ISBN no hereda la identidad del producto principal", () => {
  const offers = productOffers(
    html(jsonProduct({ offers: { ...jsonProduct().offers, sku: other } })),
    page,
    isbn,
    "Fixture",
    "date",
  );
  assert.equal(offers.length, 0);
});

test("Los enlaces de Shopify conservan la edición y eliminan solo las marcas de analítica", () => {
  const links = productLinks(
    '<a href="/products/book?_pos=1&_sid=abc&_ss=r">Libro</a><a href="/products/book?variant=2">Otra variante</a><a href="http://[invalid">Inválido</a><a href="https://example.com/products/book">Ajeno</a>',
    "https://contrapunto.cl/search?q=test",
    ["contrapunto.cl"],
  );
  assert.deepEqual(links, ["https://contrapunto.cl/products/book"]);
});

const retailerHtml = () =>
  '<html><body><div class="pivot-authors">Autora de ejemplo</div><p class="pivot-metadata"><span>EDITORIAL:</span> Editorial de ejemplo<br><span>ISBN:</span> ' +
  isbn +
  "<br><span>ENCUADERNACIÓN:</span> Tapa blanda<br><span>IDIOMA:</span> Español<br><span>N° DE PÁGINAS:</span> 320</p>" +
  html(
    jsonProduct({
      name: "Historia de prueba",
      url: "https://contrapunto.cl/products/book",
      image: ["https://contrapunto.cl/cdn/shop/files/cover.png"],
      brand: { name: "Editorial de ejemplo" },
      description: "<p>Sinopsis</p>",
    }),
  ) +
  "</body></html>";

test("La ficha comercial importa datos explícitos del libro y exige identidad consistente", () => {
  const parsed = contrapuntoEdition(
    retailerHtml(),
    "https://contrapunto.cl/products/book",
  );
  assert.equal(parsed?.isbn, isbn);
  assert.equal(parsed?.author, "Autora de ejemplo");
  assert.equal(parsed?.language, "Español");
  assert.equal(parsed?.pages, 320);
  assert.equal(parsed?.translator, "");
  assert.equal(parsed?.year, null);
  assert.equal(
    contrapuntoEdition(retailerHtml(), "https://contrapunto.cl/products/other"),
    null,
  );
  assert.equal(
    contrapuntoEdition(
      retailerHtml().replace("ISBN:</span> " + isbn, "ISBN:</span> " + other),
      "https://contrapunto.cl/products/book",
    ),
    null,
  );
});

test("El catálogo comercial obtiene HTML y respeta robots antes de consultar productos", async () => {
  let products = 0;
  const fetcher = (async (url: any, options: any) => {
    const u = String(url);
    if (u.endsWith("/robots.txt"))
      return new Response("User-agent: *\nAllow: /");
    assert.equal(options.headers.Accept, "text/html,text/plain");
    if (u.includes("/search?"))
      return new Response(
        '<html><a href="/products/book?_pos=1&_sid=abc&_ss=r">Libro</a></html>',
      );
    products++;
    return new Response(retailerHtml());
  }) as typeof fetch;
  const result = await searchContrapunto("Historia", fetcher);
  assert.equal(products, 1);
  assert.equal(result.editions[0].isbn, isbn);
  await assert.rejects(
    searchContrapunto(
      "Historia",
      (async () => new Response("User-agent: *\nDisallow: /")) as typeof fetch,
    ),
  );
});

test("Búsqueda por nombre descarta otros idiomas y el idioma desconocido", async () => {
  const fetcher = (async (url: any) => {
    if (String(url).includes("googleapis")) {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get("langRestrict"), "es");
      assert.equal(parsed.searchParams.get("country"), "CL");
      return Response.json({
        items: ["es", "pol", "ara", ""].map((language, i) => ({
          id: "language-" + i,
          volumeInfo: { title: "Historia", authors: ["Autora"], language },
        })),
      });
    }
    if (String(url).includes("search.json")) return Response.json({ docs: [] });
    return new Response("User-agent: *\nDisallow: /");
  }) as typeof fetch;
  const result = await searchCatalog("Historia", fetcher);
  assert.deepEqual(
    result.editions.map((e) => e.language),
    ["es"],
  );
});

test("Las alternativas mantienen ISBN, enlaces de Chile y ofertas del mismo vendedor", async () => {
  const { editionOptionsSchema } = await import("../lib/validation");
  const option = {
    edition,
    comparison: {
      isbn,
      stores: [
        {
          store: "Antártica",
          searchUrl: "https://www.antartica.cl/",
          status: "verified",
          offers: [
            {
              store: "Antártica",
              isbn,
              price: 15990,
              url: "https://www.antartica.cl/libro",
              available: true,
              checkedAt: "2026-10-08T12:00:00Z",
            },
          ],
        },
      ],
    },
    note: "Prefiero esta tapa.",
    extras: "Prólogo",
  };
  assert.equal(editionOptionsSchema.safeParse([option]).success, true);
  for (const changed of [
    { ...option, edition: { ...edition, language: "pol" } },
    { ...option, comparison: { ...option.comparison, isbn: other } },
    {
      ...option,
      comparison: {
        ...option.comparison,
        stores: [
          {
            ...option.comparison.stores[0],
            searchUrl: "https://www.penguinlibros.com/es/",
          },
        ],
      },
    },
    {
      ...option,
      comparison: {
        ...option.comparison,
        stores: [
          {
            ...option.comparison.stores[0],
            offers: [{ ...option.comparison.stores[0].offers[0], isbn: other }],
          },
        ],
      },
    },
    {
      ...option,
      comparison: {
        ...option.comparison,
        stores: [
          {
            ...option.comparison.stores[0],
            offers: [
              {
                ...option.comparison.stores[0].offers[0],
                url: "https://www.buscalibre.cl/libro",
              },
            ],
          },
        ],
      },
    },
  ])
    assert.equal(editionOptionsSchema.safeParse([changed]).success, false);
  assert.equal(editionOptionsSchema.safeParse([option, option]).success, false);
});

test("Diferencias de versión describen datos explícitos sin inventar extras ni mezclar tomos", async () => {
  const { editionFeatures, editionReasons, sameWork } = await import(
    "../lib/book-discovery/shared"
  );
  assert.deepEqual(
    editionFeatures({ ...edition, title: "Boulevard 1 (edición ilustrada)" }),
    ["Ilustrada"],
  );
  assert.ok(
    editionReasons({ ...edition, format: "De bolsillo" }).some((r) =>
      r.includes("compacta"),
    ),
  );
  assert.ok(
    !editionReasons(edition).some((r) =>
      /ilustrad|prologo|mejor editorial/i.test(r),
    ),
  );
  assert.equal(
    sameWork(
      { ...edition, title: "Boulevard 1" },
      { ...edition, title: "Boulevard 1 (edición ilustrada)" },
    ),
    true,
  );
  assert.equal(
    sameWork(
      { ...edition, title: "Boulevard 1" },
      { ...edition, title: "Boulevard 2" },
    ),
    false,
  );
});

test("La búsqueda de una obra elige ediciones españolas antes de resolver autores", async () => {
  const calls: string[] = [];
  const fetcher = (async (url: any) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("googleapis")) return Response.json({ totalItems: 0 });
    if (u.includes("contrapunto"))
      return new Response("User-agent: *\nDisallow: /");
    if (u.includes("search.json"))
      return Response.json({
        docs: [
          {
            key: "/works/OL1W",
            title: "Historia",
            author_name: ["Autora"],
            edition_key: ["OL1M"],
          },
        ],
      });
    if (u.includes("/works/OL1W/editions.json"))
      return Response.json({
        entries: [
          {
            key: "/books/OL1M",
            title: "Historia extranjera",
            isbn_13: [other],
            languages: [{ key: "/languages/pol" }],
            authors: [{ key: "/authors/OL9A" }],
          },
          {
            key: "/books/OL2M",
            title: "Historia",
            isbn_13: [isbn],
            languages: [{ key: "/languages/spa" }],
            publishers: ["Sello español"],
            physical_format: "Tapa blanda",
          },
        ],
      });
    throw new Error("Unexpected lookup");
  }) as typeof fetch;
  const result = await searchCatalog("Historia", fetcher);
  assert.equal(result.editions.length, 1);
  assert.equal(result.editions[0].isbn, isbn);
  assert.equal(result.editions[0].publisher, "Sello español");
  assert.ok(!calls.some((u) => u.includes("/authors/OL9A")));
});
