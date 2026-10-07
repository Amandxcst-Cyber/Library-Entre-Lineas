import { siteOrigin } from "@/lib/auth";
export function GET() {
  const safe = siteOrigin()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${safe}/</loc></url></urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
