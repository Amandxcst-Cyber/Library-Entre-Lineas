import { readJson } from "@/lib/http";
import { database, getSettings, getBook, requireData } from "@/lib/repository";
import {
  authorizeOwner,
  checkOrigin,
  apiError,
  HttpError,
  noStore,
} from "@/lib/auth";
import { bookSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const { id } = await context.params;
    const current = await getBook(id);
    if (!current)
      throw new HttpError(404, "Ese libro ya no está en la biblioteca.");
    const patch = bookSchema.partial().parse(await readJson(request, 100000));
    const data = bookSchema.parse({
      ...Object.fromEntries(
        Object.keys(bookSchema.shape).map((key) => [
          key,
          current[key as keyof typeof current],
        ]),
      ),
      ...patch,
    });
    const settings = await getSettings();
    if (
      !settings.priorities.some((p) => p.id === data.priority) ||
      (data.genre && !settings.genres.some((g) => g.id === data.genre))
    )
      throw new HttpError(400, "Elige un género y una prioridad de la lista.");
    // PostgreSQL cancela la reserva en la misma transacción al cambiar el estado.
    const book = requireData(
      await (await database())
        .from("books")
        .update(data)
        .eq("id", id)
        .select("*")
        .single(),
    );
    return Response.json({ book }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    const { id } = await context.params;
    if (!(await getBook(id)))
      throw new HttpError(404, "El libro ya fue eliminado.");
    const { error } = await (await database())
      .from("books")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
