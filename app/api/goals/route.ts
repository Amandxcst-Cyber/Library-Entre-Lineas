import { readJson } from "@/lib/http";
import { database, listGoals, requireData } from "@/lib/repository";
import {
  authorizeOwner,
  checkOrigin,
  apiError,
  HttpError,
  noStore,
} from "@/lib/auth";
import { goalSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("view") === "admin";
    if (admin) await authorizeOwner();
    return Response.json(
      { goals: await listGoals(admin) },
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
    const data = goalSchema.parse(await readJson(request));
    const db = await database(),
      count = await db
        .from("gift_goals")
        .select("id", { count: "exact", head: true });
    if (count.error) throw new Error(count.error.message);
    if ((count.count || 0) >= 20)
      throw new HttpError(
        400,
        "Puedes mantener hasta 20 sueños. Elimina uno que ya no necesites.",
      );
    const goal = requireData(
      await db.from("gift_goals").insert(data).select("*").single(),
    );
    return Response.json({ goal }, { status: 201, headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
