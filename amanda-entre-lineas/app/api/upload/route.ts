import { MAX_IMAGE_BYTES } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import {
  authorizeOwner,
  checkOrigin,
  apiError,
  HttpError,
  noStore,
} from "@/lib/auth";
export const dynamic = "force-dynamic";
const MAX = MAX_IMAGE_BYTES;
export async function POST(request: Request) {
  try {
    await authorizeOwner();
    checkOrigin(request);
    if (Number(request.headers.get("content-length")) > MAX + 8192)
      throw new HttpError(413, "La imagen debe pesar menos de 4 MB.");
    const form = await request.formData(),
      file = form.get("file");
    if (!(file instanceof File) || file.size > MAX || file.size === 0)
      throw new HttpError(400, "Elige una imagen de hasta 4 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let ext = "",
      mime = "";
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
      ext = "jpg";
      mime = "image/jpeg";
    } else if (
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71
    ) {
      ext = "png";
      mime = "image/png";
    } else if (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    ) {
      ext = "webp";
      mime = "image/webp";
    } else if (/^GIF8[79]a$/.test(String.fromCharCode(...bytes.slice(0, 6)))) {
      ext = "gif";
      mime = "image/gif";
    } else throw new HttpError(400, "Usa una imagen JPG, PNG, WebP o GIF.");
    const key = `${crypto.randomUUID()}.${ext}`,
      client = await createClient();
    const result = await client.storage
      .from("book-covers")
      .upload(key, file, { contentType: mime, upsert: false });
    if (result.error) throw new Error(result.error.message);
    return Response.json({ url: `/media/${key}` }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
