import { readJson } from "@/lib/http";
import { database, getGoal, requireData } from "@/lib/repository";
import {
  authorizeOwner,
  checkOrigin,
  apiError,
  HttpError,
  noStore,
} from "@/lib/auth";
import { goalFields, goalSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const { id } = await context.params;
    const current = await getGoal(id);
    if (!current) throw new HttpError(404, "Ese sueño ya no está en tu lista.");
    const patch = goalFields.partial().parse(await readJson(request));
    const data = goalSchema.parse({
      ...Object.fromEntries(
        Object.keys(goalFields.shape).map((key) => [
          key,
          current[key as keyof typeof current],
        ]),
      ),
      ...patch,
    });
    const goal = requireData(
      await (await database())
        .from("gift_goals")
        .update(data)
        .eq("id", id)
        .select("*")
        .single(),
    );
    return Response.json({ goal }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const { id } = await context.params;
    if (!(await getGoal(id)))
      throw new HttpError(404, "Ese sueño ya fue eliminado.");
    const { error } = await (await database())
      .from("gift_goals")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
