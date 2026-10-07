import type { Metadata, Viewport } from "next";
import { siteOrigin } from "@/lib/auth";
import { getSettings } from "@/lib/repository";
import { defaults } from "@/lib/types";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
const origin = siteOrigin();
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => defaults);
  return {
    metadataBase: new URL(origin),
    title: settings.title,
    description: settings.description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title: settings.title,
      description: settings.description,
      type: "website",
      locale: "es_CL",
      url: origin,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Amanda entre líneas. Las historias que quiero vivir.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.title,
      description: settings.description,
      images: ["/og.png"],
    },
    robots: { index: true, follow: true },
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#60273c",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL">
      <body>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        {children}
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
