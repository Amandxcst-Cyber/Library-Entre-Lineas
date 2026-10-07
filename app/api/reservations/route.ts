import { readJson } from "@/lib/http";
import { checkOrigin, apiError, noStore } from "@/lib/auth";
import {
  reservationTargetSchema,
  reservationCreateSchema,
} from "@/lib/validation";
import {
  createReservation,
  reservationState,
  cancelReservation,
} from "@/lib/reservations";
export const dynamic = "force-dynamic";
const target = (input: { book_id?: string; gift_item_id?: string }) => ({
  id: (input.book_id || input.gift_item_id)!,
  kind: input.book_id ? ("book" as const) : ("item" as const),
});
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const value = reservationTargetSchema.parse({
      book_id: params.get("book_id") || undefined,
      gift_item_id: params.get("gift_item_id") || undefined,
    });
    const { id, kind } = target(value);
    return Response.json(await reservationState(request, id, kind), {
      headers: noStore,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const value = reservationCreateSchema.parse(await readJson(request)),
      { id, kind } = target(value);
    const result = await createReservation(request, id, value.days, kind),
      headers = new Headers(noStore);
    for (const cookie of result.cookies) headers.append("Set-Cookie", cookie);
    return Response.json(result.state, { status: 201, headers });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const { id, kind } = target(
      reservationTargetSchema.parse(await readJson(request)),
    );
    const cookie = await cancelReservation(request, id, kind);
    return Response.json(
      { reserved: false, is_mine: false, expires_at: null, hours: null },
      { headers: { ...noStore, "Set-Cookie": cookie } },
    );
  } catch (e) {
    return apiError(e);
  }
}
