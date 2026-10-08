/** Local fixture only. Metadata and prices are intercepted, not claims about real stores. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3003";
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(origin).hostname),
  "Tests require loopback fixture.",
);
const preflight = await fetch(origin + "/api/books").then((r) => r.json());
assert.equal(preflight.books?.length, 6);
assert.ok(
  preflight.books.every((b) =>
    b.cover_url?.startsWith("http://127.0.0.1:54322/fixture/covers/"),
  ),
  "Refusing to mutate a non-fixture database.",
);
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
  args: ["--no-sandbox"],
});
const artifactDir =
  process.env.TEST_ARTIFACT_DIR || "/tmp/amanda-discovery-artifacts";
await mkdir(artifactDir, { recursive: true });
const first = {
  id: "mock-spanish",
  title: "Historia de prueba",
  author: "Autora de ejemplo",
  isbn: "9780141439518",
  publisher: "Editorial de ejemplo",
  year: 2024,
  language: "es",
  format: "Tapa dura",
  translator: "Traductora de ejemplo",
  pages: 320,
  cover: "https://covers.openlibrary.org/b/id/999999999-M.jpg",
  description: "Sinopsis ficticia para comprobar el autocompletado.",
  source: "Open Library (simulado)",
  sourceUrl: "https://openlibrary.org/books/OL1M",
};
const second = {
  ...first,
  id: "mock-english",
  isbn: "9780141439600",
  language: "en",
  format: "Paperback",
  publisher: "Editorial de ejemplo 2",
};
const errors = [];
try {
  const anon = await browser.newContext();
  assert.equal(
    (
      await anon.request.get(origin + "/api/book-discovery?q=Historia")
    ).status(),
    401,
  );
  assert.equal(
    (
      await anon.request.get(origin + "/api/book-prices?isbn=" + first.isbn)
    ).status(),
    401,
  );
  await anon.close();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://covers.openlibrary.org/**", (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150"><rect width="100" height="150" fill="#6b2e47"/><text x="10" y="50" fill="white">PRUEBA</text></svg>',
    }),
  );
  let mode = "normal";
  await page.route("**/api/book-discovery?*", async (r) => {
    const query = new URL(r.request().url()).searchParams.get("q");
    if (query === "Lento") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await r.fulfill({
        json: {
          editions: [{ ...first, title: "Resultado anterior" }],
          partial: false,
        },
      });
      return;
    }
    if (mode === "error") {
      await r.fulfill({
        status: 503,
        json: {
          error:
            "No pudimos consultar los catálogos. Puedes completar el libro manualmente y reintentar.",
        },
      });
      return;
    }
    await r.fulfill({ json: { editions: [first, second], partial: false } });
  });
  await page.route("**/api/book-prices?*", (r) =>
    r.fulfill({
      json: {
        isbn: new URL(r.request().url()).searchParams.get("isbn"),
        stores: [
          {
            store: "Antártica (simulada)",
            status: "verified",
            searchUrl: "https://www.antartica.cl/",
            offers: [
              {
                store: "Antártica",
                isbn: first.isbn,
                price: 15990,
                url: "https://www.antartica.cl/products/prueba",
                available: true,
                checkedAt: "2026-10-08T12:00:00Z",
              },
            ],
          },
          {
            store: "Buscalibre (simulada)",
            status: "blocked",
            searchUrl: "https://www.buscalibre.cl/",
            offers: [],
          },
        ],
      },
    }),
  );
  await page.goto(origin + "/login");
  await page.getByLabel("Correo", { exact: true }).fill("owner@example.test");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("fixture-only-password");
  await page.getByRole("button", { name: "Entrar a mi espacio" }).click();
  await page.waitForURL("**/admin");
  await page
    .getByRole("button", { name: "Agregar libro", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título o ISBN").fill("Lento");
  await page.waitForTimeout(800);
  await dialog.getByLabel("Título o ISBN").fill("Historia");
  await dialog
    .getByRole("button", { name: /Usar esta edición/ })
    .first()
    .waitFor();
  await page.waitForTimeout(1600);
  assert.equal(
    await dialog.getByText("Resultado anterior", { exact: true }).count(),
    0,
  );
  await dialog
    .getByRole("button", {
      name: /Historia de prueba.*Autora de ejemplo.*9780141439518/,
    })
    .click();
  assert.equal(
    await dialog.getByLabel("Autor *", { exact: true }).inputValue(),
    "Autora de ejemplo",
  );
  await dialog.getByRole("button", { name: "Usar este precio y link" }).click();
  assert.equal(
    await dialog.getByLabel("Precio aproximado (CLP)").inputValue(),
    "15990",
  );
  await dialog
    .getByText("Edición, saga y otros detalles", { exact: true })
    .click();
  assert.equal(
    await dialog.getByLabel("ISBN", { exact: true }).inputValue(),
    first.isbn,
  );
  assert.equal(
    await dialog.getByLabel("Editorial", { exact: true }).inputValue(),
    first.publisher,
  );
  assert.equal(
    await dialog.getByLabel("Link de compra").inputValue(),
    "https://www.antartica.cl/products/prueba",
  );
  assert.equal(
    await dialog.getByLabel("Año de publicación").inputValue(),
    "2024",
  );
  assert.equal(
    await dialog.getByLabel("Páginas", { exact: true }).inputValue(),
    "320",
  );
  assert.equal(
    await dialog.getByLabel("Traducción", { exact: true }).inputValue(),
    "Traductora de ejemplo",
  );
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Viewport overflow " + width,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.locator(".form-scroll").evaluate((el) => el.scrollTo(0, 0));
  await page
    .locator("[data-sonner-toast]")
    .first()
    .waitFor({ state: "hidden", timeout: 15000 });
  await page.screenshot({ path: artifactDir + "/autocompletar-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: artifactDir + "/autocompletar-desktop.png" });
  await dialog
    .getByRole("button", { name: "Agregar libro", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  const data = await context.request
    .get(origin + "/api/books?view=admin")
    .then((r) => r.json());
  const saved = data.books.find((b) => b.title === first.title);
  assert.ok(saved);
  assert.equal(saved.isbn, first.isbn);
  assert.equal(saved.author, first.author);
  assert.equal(saved.price, 15990);
  assert.equal(saved.page_count, 320);
  assert.equal(
    (
      await context.request.delete(origin + "/api/books/" + saved.id, {
        headers: { Origin: origin },
      })
    ).status(),
    200,
  );
  await page
    .getByRole("button", { name: "Agregar libro", exact: true })
    .click();
  mode = "error";
  await page
    .getByRole("dialog")
    .getByLabel("Título o ISBN")
    .fill("Sin conexión");
  await page
    .getByRole("alert")
    .filter({ hasText: "No pudimos consultar los catálogos" })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByLabel("Autor *", { exact: true })
    .fill("Autora manual");
  assert.equal(
    await page
      .getByRole("dialog")
      .getByLabel("Autor *", { exact: true })
      .inputValue(),
    "Autora manual",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    artifactDir + "/resultado.json",
    JSON.stringify(
      {
        checks: [
          "Acceso privado de endpoints",
          "Búsquedas anteriores canceladas",
          "Autocompletado de edición",
          "Comparación con stock y fuente bloqueada",
          "Datos persistidos por API/SQL",
          "Edición manual tras fallo",
          "Sin desbordamiento móvil/tablet/escritorio",
        ],
        externalSources: "simuladas",
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
  await context.close();
  console.log(
    "Pruebas de navegador aprobadas: buscador, precio, ISBN persistido, errores y tamaños móviles. Catálogos y ofertas simulados; Auth simulado; SQL/RLS real PGlite.",
  );
} finally {
  await browser.close();
}
