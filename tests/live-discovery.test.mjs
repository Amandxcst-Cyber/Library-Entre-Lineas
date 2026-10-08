/** Optional live catalog/price check. Auth/SQL remain isolated; no books are saved. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3003";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const seed = await fetch(origin + "/api/books").then((r) => r.json());
assert.equal(seed.books?.length, 6);
assert.ok(
  seed.books.every((b) =>
    b.cover_url?.startsWith("http://127.0.0.1:54322/fixture/covers/"),
  ),
);
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const directory =
  process.env.TEST_ARTIFACT_DIR || "/tmp/amanda-live-discovery-artifacts";
await mkdir(directory, { recursive: true });
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "America/Santiago",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  // Chromium cannot reach external images directly in this cloud sandbox.
  // Forward only real cover bytes through the environment's normal HTTPS proxy.
  // Catalog and price API responses are never intercepted in this test.
  let realCoversLoaded = 0;
  await page.route("https://contrapunto.cl/cdn/shop/**", async (route) => {
    const response = await fetch(route.request().url(), {
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    assert.ok(response.ok);
    const contentType = response.headers.get("content-type") || "";
    assert.ok(contentType.startsWith("image/"));
    const body = Buffer.from(await response.arrayBuffer());
    assert.ok(body.length > 0 && body.length < 5_000_000);
    realCoversLoaded++;
    await route.fulfill({ status: response.status, contentType, body });
  });
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
  const catalogResponse = page.waitForResponse(
    (r) => r.url().includes("/api/book-discovery?"),
    { timeout: 35000 },
  );
  await dialog.getByLabel("Título o ISBN").fill("9789566180777");
  const catalog = await (await catalogResponse).json();
  assert.ok(catalog.editions?.some((e) => e.isbn === "9789566180777"));
  const priceResponse = page.waitForResponse(
    (r) => r.url().includes("/api/book-prices?"),
    { timeout: 35000 },
  );
  await dialog
    .getByRole("button", {
      name: /Usar esta edición.*9789566180777|9789566180777.*Usar esta edición/,
    })
    .click();
  const comparison = await (await priceResponse).json();
  const store = comparison.stores.find((s) => s.store === "Contrapunto");
  const offer = store.offers.find(
    (o) => o.isbn === "9789566180777" && o.available === true,
  );
  assert.ok(offer && Number.isInteger(offer.price) && offer.price > 0);
  assert.equal(
    await dialog.getByLabel("Autor *", { exact: true }).inputValue(),
    "Jane Austen",
  );
  await dialog.getByRole("button", { name: "Usar este precio y link" }).click();
  assert.equal(
    Number(await dialog.getByLabel("Precio aproximado (CLP)").inputValue()),
    offer.price,
  );
  assert.ok(
    await dialog
      .getByText("Única fuente con oferta disponible obtenida", {
        exact: false,
      })
      .count(),
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const cover = dialog.locator(".edition-choice img").first();
  await cover.waitFor();
  await page.waitForFunction(
    () => {
      const image = document.querySelector(".edition-choice img");
      return image?.complete && image.naturalWidth > 0;
    },
    {},
    { timeout: 20000 },
  );
  assert.ok(realCoversLoaded > 0);
  await page
    .locator("[data-sonner-toast]")
    .first()
    .waitFor({ state: "hidden", timeout: 15000 });
  await dialog.locator(".form-scroll").evaluate((el) => el.scrollTo(0, 0));
  await page.screenshot({ path: directory + "/edicion-real-mobile.png" });
  await dialog.locator(".edition-prices").scrollIntoViewIfNeeded();
  await page.screenshot({ path: directory + "/precio-real-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.locator(".form-scroll").evaluate((el) => el.scrollTo(0, 0));
  await page.screenshot({ path: directory + "/edicion-real-desktop.png" });
  const after = await context.request
    .get(origin + "/api/books")
    .then((r) => r.json());
  assert.equal(after.books.length, 6);
  assert.deepEqual(errors, []);
  await writeFile(
    directory + "/resultado.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        catalog,
        comparison,
        checks: [
          "Metadatos externos reales",
          "ISBN exacto",
          "Autor y portada reales",
          "Oferta real copiada al formulario",
          "Etiqueta de cobertura limitada",
          "Sin desbordamiento móvil",
          "Sin cambios en libros de la base",
        ],
        authAndDatabase: "fixture aislada; no Supabase real",
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
  await context.close();
  console.log(
    "Consulta real en navegador aprobada; Auth/SQL aislados y ningún libro guardado. Las ofertas son instantáneas, no una garantía de precio futuro.",
  );
} finally {
  await browser.close();
}
