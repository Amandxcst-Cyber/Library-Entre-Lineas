import { createClient } from "./supabase/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorizeOwner() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new HttpError(401, "Inicia sesión para entrar a tu biblioteca.");
  const owner = await client.rpc("is_owner");
  if (owner.error) throw new Error("No pudimos verificar el acceso.");
  if (owner.data !== true)
    throw new HttpError(403, "Este espacio es privado de Amanda.");
  return user;
}
export function siteOrigin() {
  return new URL(process.env.SITE_URL || "http://localhost:3000").origin;
}
export function checkOrigin(request: Request) {
  if (
    request.headers.get("origin") !== siteOrigin() ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "La solicitud debe venir desde esta web.");
}
export const noStore = { "Cache-Control": "private, no-store" };
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: noStore },
    );
  if (error && typeof error === "object" && "issues" in error)
    return Response.json(
      { error: "Revisa los campos e intenta de nuevo." },
      { status: 400, headers: noStore },
    );
  console.error(
    "wishlist request failed",
    error instanceof Error ? error.message : "Unexpected backend error",
  );
  return Response.json(
    { error: "No pudimos conectar con la biblioteca. Intenta de nuevo." },
    { status: 503, headers: noStore },
  );
}
