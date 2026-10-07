import { siteOrigin } from "@/lib/auth";
export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /api/\nSitemap: ${siteOrigin()}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
