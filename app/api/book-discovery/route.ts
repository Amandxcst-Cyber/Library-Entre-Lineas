import { z } from "zod";
import { apiError, authorizeOwner, HttpError, noStore } from "@/lib/auth";
import { searchCatalog } from "@/lib/book-discovery/catalog";
import { cached, discoveryLimit } from "@/lib/book-discovery/cache";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: Request) {
  try {
    const user = await authorizeOwner();
    discoveryLimit(user.id);
    const query = z
      .string()
      .trim()
      .min(3)
      .max(160)
      .parse(new URL(request.url).searchParams.get("q"));
    const result = await cached(
      "catalog:" + query.toLocaleLowerCase("es"),
      300000,
      () => searchCatalog(query),
    );
    return Response.json(result, { headers: noStore });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("No pudimos consultar")
    )
      return apiError(new HttpError(503, error.message));
    return apiError(error);
  }
}
