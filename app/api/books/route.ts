import { readJson } from "@/lib/http";
import {
  database,
  getSettings,
  listBooks,
  requireData,
} from "@/lib/repository";
import {
  authorizeOwner,
  checkOrigin,
  apiError,
  HttpError,
  noStore,
} from "@/lib/auth";
import { bookSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("view") === "admin";
    if (admin) await authorizeOwner();
    return Response.json(
      { books: await listBooks(admin) },
      { headers: noStore },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const book = bookSchema.parse(await readJson(request)),
      settings = await getSettings();
    if (
      !settings.priorities.some((p) => p.id === book.priority) ||
      (book.genre && !settings.genres.some((g) => g.id === book.genre))
    )
      throw new HttpError(400, "Elige un género y una prioridad de la lista.");
    const db = await database(),
      count = await db
        .from("books")
        .select("id", { count: "exact", head: true });
    if (count.error) throw new Error(count.error.message);
    if ((count.count || 0) >= 500)
      throw new HttpError(
        400,
        "Tu biblioteca alcanzó el límite de 500 libros.",
      );
    const saved = requireData(
      await db.from("books").insert(book).select("*").single(),
    );
    return Response.json({ book: saved }, { status: 201, headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
