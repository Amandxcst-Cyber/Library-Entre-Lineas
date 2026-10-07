import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookSchema,
  goalSchema,
  settingsSchema,
  giftItemSchema,
  reservationTargetSchema,
  reservationCreateSchema,
} from "../lib/validation";
import { defaults } from "../lib/types";
const book = { title: "  Una historia  ", author: "Amanda", priority: "love" };
test("Título y autor bastan; los campos opcionales tienen valores seguros", () => {
  const parsed = bookSchema.parse(book);
  assert.equal(parsed.title, "Una historia");
  assert.equal(parsed.status, "wishlist");
  assert.equal(parsed.price, null);
});
test("Precios CLP, estados y campos inesperados se validan", () => {
  for (const patch of [
    { price: -1 },
    { price: 1.5 },
    { status: "read" },
    { owner_id: "intruso" },
  ])
    assert.equal(bookSchema.safeParse({ ...book, ...patch }).success, false);
});
test("Enlaces peligrosos, credenciales y rutas externas no pasan", () => {
  for (const cover_url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://user:secret@example.com",
    "/admin",
    "//example.com",
  ])
    assert.equal(bookSchema.safeParse({ ...book, cover_url }).success, false);
  assert.equal(
    bookSchema.safeParse({ ...book, cover_url: "/media/123.jpg" }).success,
    true,
  );
  assert.equal(
    bookSchema.safeParse({ ...book, purchase_url: "/media/123.jpg" }).success,
    false,
  );
});
test("Publicar una vaquita requiere un enlace de aporte HTTPS", () => {
  const goal = { title: "Mi Kindle", target_amount: 150000, status: "active" };
  assert.equal(goalSchema.safeParse(goal).success, false);
  assert.equal(
    goalSchema.safeParse({ ...goal, contribution_url: "http://example.com" })
      .success,
    false,
  );
  assert.equal(
    goalSchema.safeParse({
      ...goal,
      contribution_url: "https://example.com/aportar",
    }).success,
    true,
  );
  assert.equal(
    goalSchema.safeParse({ ...goal, status: "draft" }).success,
    true,
  );
});
test("Meta y monto recaudado no aceptan negativos ni decimales", () => {
  for (const patch of [
    { target_amount: 0 },
    { collected_amount: -1 },
    { collected_amount: 1.5 },
  ])
    assert.equal(
      goalSchema.safeParse({ title: "Sueño", target_amount: 100, ...patch })
        .success,
      false,
    );
});
test("Categorías únicas y rangos de precios configurables", () => {
  assert.equal(settingsSchema.safeParse(defaults).success, true);
  assert.equal(
    settingsSchema.safeParse({
      ...defaults,
      genres: [defaults.genres[0], defaults.genres[0]],
    }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({
      ...defaults,
      priceBands: [{ id: "a", label: "Rango", min: 15000, max: 10000 }],
    }).success,
    false,
  );
});

test("Regalos con categorías propias, notas y precios válidos", () => {
  const item = {
    title: "Un juego cooperativo",
    category: "Juegos con amigos",
    priority: "love",
  };
  assert.equal(giftItemSchema.parse(item).status, "wishlist");
  for (const patch of [
    { category: "" },
    { price: -1 },
    { image_url: "javascript:alert(1)" },
    { status: "active" },
    { owner_id: "intruso" },
  ])
    assert.equal(
      giftItemSchema.safeParse({ ...item, ...patch }).success,
      false,
    );
});
test("Una reserva apunta a un libro o un regalito, nunca a ambos", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(
    reservationTargetSchema.safeParse({ book_id: id }).success,
    true,
  );
  assert.equal(
    reservationTargetSchema.safeParse({ gift_item_id: id }).success,
    true,
  );
  assert.equal(
    reservationTargetSchema.safeParse({ book_id: id, gift_item_id: id })
      .success,
    false,
  );
  assert.equal(reservationTargetSchema.safeParse({}).success, false);
  assert.equal(reservationCreateSchema.parse({ gift_item_id: id }).days, 7);
  assert.equal(
    reservationCreateSchema.safeParse({ gift_item_id: id, days: 8 }).success,
    false,
  );
});
