import { database } from "./repository";
import { HttpError, siteOrigin } from "./auth";

export const DEFAULT_RESERVATION_DAYS = 7;
export type ReservationDays = 7 | 14;
type ReservationState = {
  reserved: boolean;
  is_mine: boolean;
  expires_at: string | null;
  hours: number | null;
};
const validSecret = /^[a-f0-9]{64}$/;
const VISITOR_COOKIE = "gift_visitor";
const receiptCookie = (id: string, kind: "book" | "item") =>
  `gift_receipt_${kind === "item" ? "item_" : ""}${id.replaceAll("-", "")}`;

function secret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
async function hashSecret(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function readCookie(request: Request, name: string) {
  const raw = (request.headers.get("cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="));
  const value = raw?.slice(name.length + 1) || "";
  return validSecret.test(value) ? value : "";
}
function cookie(name: string, value: string, maxAge: number) {
  const secure = new URL(siteOrigin()).protocol === "https:";
  return `${name}=${value}; Path=/api/reservations; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}
function checkResult(error: { code?: string; message: string } | null) {
  if (!error) return;
  const statuses: Record<string, number> = {
    P0002: 404,
    P4000: 400,
    P4030: 403,
    P4090: 409,
    P4290: 429,
  };
  const status = statuses[error.code || ""];
  if (status) throw new HttpError(status, error.message);
  throw new Error(error.message);
}
export async function reservationState(
  request: Request,
  bookId: string,
  kind: "book" | "item" = "book",
): Promise<ReservationState> {
  const proof = readCookie(request, receiptCookie(bookId, kind));
  const { data, error } = await (
    await database()
  ).rpc("get_gift_state", {
    p_kind: kind,
    p_item_id: bookId,
    p_token_hash: proof ? await hashSecret(proof) : null,
  });
  checkResult(error);
  return data as ReservationState;
}
export async function createReservation(
  request: Request,
  bookId: string,
  days: ReservationDays = DEFAULT_RESERVATION_DAYS,
  kind: "book" | "item" = "book",
) {
  if (days !== 7 && days !== 14)
    throw new HttpError(400, "Elige una reserva de 1 o 2 semanas.");
  const visitor = readCookie(request, VISITOR_COOKIE) || secret(),
    proof = secret();
  const { data, error } = await (
    await database()
  ).rpc("reserve_wishlist_gift", {
    p_kind: kind,
    p_item_id: bookId,
    p_token_hash: await hashSecret(proof),
    p_visitor_hash: await hashSecret(visitor),
    p_days: days,
  });
  checkResult(error);
  return {
    state: data as ReservationState,
    cookies: [
      cookie(VISITOR_COOKIE, visitor, 30 * 86400),
      cookie(receiptCookie(bookId, kind), proof, days * 86400),
    ],
  };
}
export async function cancelReservation(
  request: Request,
  bookId: string,
  kind: "book" | "item" = "book",
) {
  const proof = readCookie(request, receiptCookie(bookId, kind));
  if (!proof)
    throw new HttpError(
      403,
      "Solo puedes cancelar tu propia reserva desde el navegador donde la hiciste.",
    );
  const { error } = await (
    await database()
  ).rpc("cancel_wishlist_gift", {
    p_kind: kind,
    p_item_id: bookId,
    p_token_hash: await hashSecret(proof),
  });
  checkResult(error);
  return cookie(receiptCookie(bookId, kind), "", 0);
}
