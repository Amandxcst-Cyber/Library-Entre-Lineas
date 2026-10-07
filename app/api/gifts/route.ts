import { readJson } from "@/lib/http";
import {
  database,
  getSettings,
  listGiftItems,
  requireData,
} from "@/lib/repository";
import {
  authorizeOwner,
  checkOrigin,
  apiError,
  HttpError,
  noStore,
} from "@/lib/auth";
import { giftItemSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("view") === "admin";
    if (admin) await authorizeOwner();
    return Response.json(
      { items: await listGiftItems(admin) },
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
    const data = giftItemSchema.parse(await readJson(request)),
      settings = await getSettings();
    if (!settings.priorities.some((p) => p.id === data.priority))
      throw new HttpError(400, "Elige una prioridad de tu lista.");
    const db = await database(),
      count = await db
        .from("gift_items")
        .select("id", { count: "exact", head: true });
    if (count.error) throw new Error(count.error.message);
    if ((count.count || 0) >= 200)
      throw new HttpError(
        400,
        "Puedes mantener hasta 200 regalitos. Elimina los que ya no necesitas.",
      );
    const item = requireData(
      await db.from("gift_items").insert(data).select("*").single(),
    );
    return Response.json({ item }, { status: 201, headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
