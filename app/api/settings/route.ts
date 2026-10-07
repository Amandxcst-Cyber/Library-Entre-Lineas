import { readJson } from "@/lib/http";
import { database, getSettings, requireData } from "@/lib/repository";
import {
  authorizeOwner,
  checkOrigin,
  apiError,
  HttpError,
  noStore,
} from "@/lib/auth";
import { settingsSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(
      { settings: await getSettings() },
      { headers: noStore },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const settings = settingsSchema.parse(await readJson(request));
    const db = await database();
    const [bookResult, giftResult] = await Promise.all([
      db.from("books").select("genre,priority"),
      db.from("gift_items").select("priority"),
    ]);
    const used = requireData(bookResult),
      gifts = requireData(giftResult);
    if (
      gifts.some(
        (i) => !settings.priorities.some((p) => p.id === i.priority),
      ) ||
      used.some(
        (b) =>
          !settings.priorities.some((p) => p.id === b.priority) ||
          (b.genre && !settings.genres.some((g) => g.id === b.genre)),
      )
    )
      throw new HttpError(
        400,
        "Primero cambia los libros y regalitos que usan esa categoría. Después podrás eliminarla.",
      );
    const { error } = await db
      .from("wishlist_settings")
      .upsert({ id: 1, data: settings }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return Response.json({ settings }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
