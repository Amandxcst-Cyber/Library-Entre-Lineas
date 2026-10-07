import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, checkOrigin, HttpError, noStore } from "@/lib/auth";
import { readJson } from "@/lib/http";
const input = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(256),
  })
  .strict();
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const credentials = input.parse(await readJson(request));
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword(credentials);
    if (error)
      throw new HttpError(
        error.status === 429 ? 429 : 401,
        error.status === 429
          ? "Muchos intentos. Espera un momento y vuelve a intentar."
          : "Revisa tu correo y contraseña.",
      );
    const owner = await client.rpc("is_owner");
    if (owner.error || owner.data !== true) {
      await client.auth.signOut();
      throw new HttpError(
        403,
        "Esta cuenta no puede administrar la biblioteca.",
      );
    }
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
