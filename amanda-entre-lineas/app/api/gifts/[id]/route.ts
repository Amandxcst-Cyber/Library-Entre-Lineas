import { z } from "zod";
import { readJson } from "@/lib/http";
import {
  database,
  getSettings,
  getGiftItem,
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
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const id = z
        .string()
        .uuid()
        .parse((await context.params).id),
      current = await getGiftItem(id);
    if (!current)
      throw new HttpError(404, "Ese regalo ya no está en tu lista.");
    const patch = giftItemSchema.partial().parse(await readJson(request));
    const data = giftItemSchema.parse({
      ...Object.fromEntries(
        Object.keys(giftItemSchema.shape).map((key) => [
          key,
          current[key as keyof typeof current],
        ]),
      ),
      ...patch,
    });
    if (!(await getSettings()).priorities.some((p) => p.id === data.priority))
      throw new HttpError(400, "Elige una prioridad de tu lista.");
    const item = requireData(
      await (await database())
        .from("gift_items")
        .update(data)
        .eq("id", id)
        .select("*")
        .single(),
    );
    return Response.json({ item }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    if (!(await getGiftItem(id)))
      throw new HttpError(404, "Ese regalo ya fue eliminado.");
    const { error } = await (await database())
      .from("gift_items")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
