import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    if (!/^[a-f0-9-]+\.(jpg|png|webp|gif)$/.test(key))
      return new Response(null, { status: 404 });
    const client = await createClient(),
      bucket = "book-covers";
    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) return new Response(null, { status: 404 });
    return new Response(data, {
      headers: {
        "Content-Type": data.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
