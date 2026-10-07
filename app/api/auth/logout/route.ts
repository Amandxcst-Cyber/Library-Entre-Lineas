import { createClient } from "@/lib/supabase/server";
import { apiError, checkOrigin, noStore } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { error } = await (await createClient()).auth.signOut();
    if (error) throw new Error(error.message);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
