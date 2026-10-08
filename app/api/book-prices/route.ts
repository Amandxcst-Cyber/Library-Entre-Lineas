import { apiError, authorizeOwner, HttpError, noStore } from "@/lib/auth";
import { compareStores } from "@/lib/book-discovery/stores";
import { isbn13 } from "@/lib/book-discovery/shared";
import { cached, discoveryLimit } from "@/lib/book-discovery/cache";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: Request) {
  try {
    const user = await authorizeOwner();
    discoveryLimit(user.id);
    const isbn = isbn13(new URL(request.url).searchParams.get("isbn") || "");
    if (!isbn)
      throw new HttpError(
        400,
        "Selecciona una edición con ISBN válido para comparar precios.",
      );
    const comparison = await cached("prices:" + isbn, 600000, () =>
      compareStores(isbn),
    );
    return Response.json(comparison, { headers: noStore });
  } catch (error) {
    return apiError(error);
  }
}
