import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import LoginForm from "@/components/login-form";
export const metadata: Metadata = {
  title: "Mi espacio · Amanda entre líneas",
  robots: { index: false, follow: false },
};
export default function LoginPage() {
  return (
    <main className="access-page" id="main">
      <a href="/" className="brand">
        <Bookmark size={22} /> Amanda entre líneas
      </a>
      <div className="access-card login-card">
        <p className="eyebrow">TU RINCÓN PRIVADO</p>
        <h1>
          Bienvenida
          <br />
          <em>entre tus historias.</em>
        </h1>
        <p>Entra con el correo y la contraseña de tu cuenta administradora.</p>
        <LoginForm />
        <a href="/" className="text-link">
          Volver a la wishlist
        </a>
      </div>
    </main>
  );
}
