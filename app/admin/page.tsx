import { redirect } from "next/navigation";
import { authorizeOwner, HttpError } from "@/lib/auth";
import {
  getSettings,
  listBooks,
  listGoals,
  listGiftItems,
} from "@/lib/repository";
import Admin from "@/components/admin";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi espacio · Amanda entre líneas",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  try {
    await authorizeOwner();
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) redirect("/login");
    const denied = e instanceof HttpError && e.status === 403;
    return (
      <main className="access-page" id="main">
        <a href="/" className="brand">
          Amanda entre líneas<span>UN PEQUEÑO UNIVERSO LECTOR</span>
        </a>
        <div className="access-card">
          <h1>
            {denied
              ? "Este estante es privado"
              : "Tu biblioteca está tomando una pausa"}
          </h1>
          <p>
            {denied
              ? "Solo Amanda puede entrar a este espacio. La wishlist está abierta para ti."
              : "No pudimos conectar con tu biblioteca. Revisa la configuración de Supabase y vuelve a intentar."}
          </p>
          <a className="btn primary" href={denied ? "/login" : "/admin"}>
            {denied ? "Entrar con mi cuenta" : "Volver a intentar"}
          </a>
          <a className="text-link" href="/">
            Ver la wishlist
          </a>
        </div>
      </main>
    );
  }
  try {
    const [settings, books, goals, items] = await Promise.all([
      getSettings(),
      listBooks(true),
      listGoals(true),
      listGiftItems(true),
    ]);
    return (
      <Admin
        initialBooks={books}
        initialSettings={settings}
        initialGoals={goals}
        initialItems={items}
      />
    );
  } catch {
    return (
      <main className="access-page" id="main">
        <div className="access-card">
          <h1>No pudimos cargar tus libros</h1>
          <p>Tus cambios siguen guardados. Vuelve a intentar en un momento.</p>
          <a className="btn primary" href="/admin">
            Volver a intentar
          </a>
          <a className="text-link" href="/">
            Ver la wishlist
          </a>
        </div>
      </main>
    );
  }
}
