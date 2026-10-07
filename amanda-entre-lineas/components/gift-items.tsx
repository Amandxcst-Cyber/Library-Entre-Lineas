"use client";
import { useEffect, useState } from "react";
import {
  Gift,
  Sparkles,
  Dices,
  Tablet,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { GiftItem, Settings, formatPrice } from "@/lib/types";
import GiftReservation from "./gift-reservation";

export function GiftImage({
  item,
}: {
  item: Pick<GiftItem, "image_url" | "title" | "category">;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.image_url]);
  const Icon =
    item.category === "Harry Potter"
      ? Sparkles
      : item.category === "Juegos de mesa"
        ? Dices
        : item.category === "Lectura y tecnología"
          ? Tablet
          : Gift;
  return item.image_url && !failed ? (
    <img
      src={item.image_url}
      alt={item.title}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="gift-item-placeholder">
      <Icon size={40} strokeWidth={1.2} />
      <span>{item.category}</span>
    </div>
  );
}
export default function GiftItems({
  initialItems,
  settings,
  loadError = false,
}: {
  initialItems: GiftItem[];
  settings: Settings;
  loadError?: boolean;
}) {
  const [items, setItems] = useState(initialItems),
    [category, setCategory] = useState<string | null>(null),
    [error, setError] = useState(loadError);
  useEffect(() => {
    async function refresh() {
      try {
        const r = await fetch("/api/gifts", { cache: "no-store" });
        if (r.ok) {
          setItems((await r.json()).items);
          setError(false);
        }
      } catch {}
    }
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(visible, 60000);
    return () => {
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(timer);
    };
  }, []);
  const categories = [...new Set(items.map((i) => i.category))];
  const selected =
    category !== null && categories.includes(category) ? category : null;
  const filtered = items
    .filter((i) => selected === null || i.category === selected)
    .sort(
      (a, b) =>
        settings.priorities.findIndex((p) => p.id === a.priority) -
        settings.priorities.findIndex((p) => p.id === b.priority),
    );
  return (
    <section
      id="regalitos"
      className="other-gifts-section"
      aria-labelledby="other-gifts-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Sparkles size={14} /> UN POQUITO DE MAGIA, FUERA DE LAS PÁGINAS
          </p>
          <h2 id="other-gifts-title">
            Otras pequeñas alegrías
            {items.length > 0 && (
              <span className="count-badge">{items.length}</span>
            )}
          </h2>
        </div>
      </div>
      <p className="dream-section-intro">
        Los libros van primero, pero también soy fan de Harry Potter, las tardes
        de juegos de mesa y los detalles que hacen más bonito mi rincón lector.
      </p>
      {categories.length > 1 && (
        <div
          className="gift-category-filters"
          aria-label="Filtrar otros regalos por categoría"
        >
          {[null, ...categories].map((c) => (
            <button
              key={c === null ? "all-categories" : `category:${c}`}
              className={`gift-category-button ${selected === c ? "selected" : ""}`}
              aria-pressed={selected === c}
              onClick={() => setCategory(c)}
            >
              {c === null ? "Todos los regalitos" : c}
            </button>
          ))}
        </div>
      )}
      {error ? (
        <div className="empty-state goals-empty">
          <RefreshCw size={28} />
          <h3>No pudimos abrir este estante</h3>
          <p>Vuelve a intentar para ver los regalitos disponibles.</p>
          <button className="btn outline" onClick={() => location.reload()}>
            Volver a intentar
          </button>
        </div>
      ) : filtered.length ? (
        <div className="gift-items-grid">
          {filtered.map((item) => {
            const priority = settings.priorities.find(
                (p) => p.id === item.priority,
              ),
              reserved =
                !!item.reservation_expires_at &&
                Date.parse(item.reservation_expires_at) > Date.now();
            return (
              <article className="gift-item-card" key={item.id}>
                <div className="gift-item-image">
                  <GiftImage item={item} />
                  {priority && (
                    <span className="priority-label">
                      {priority.symbol} {priority.label}
                    </span>
                  )}
                </div>
                <div className="gift-item-copy">
                  <p className="eyebrow">{item.category}</p>
                  <h3>{item.title}</h3>
                  {item.personal_note && (
                    <p className="gift-item-note">{item.personal_note}</p>
                  )}
                  <p className="gift-item-price">
                    {formatPrice(item.price)}
                    {item.price !== null && <small> · aproximado</small>}
                  </p>
                  {reserved && (
                    <p className="gift-item-reserved">
                      Alguien podría estar preparando este regalo.
                    </p>
                  )}
                  {item.purchase_url && (
                    <a
                      className="text-link"
                      href={item.purchase_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver dónde encontrarlo <ExternalLink size={15} />
                    </a>
                  )}
                  <GiftReservation
                    book={item}
                    kind="item"
                    onChange={(expiry) =>
                      setItems((current) =>
                        current.map((i) =>
                          i.id === item.id
                            ? { ...i, reservation_expires_at: expiry }
                            : i,
                        ),
                      )
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state goals-empty">
          <Sparkles size={31} strokeWidth={1.2} />
          <h3>La magia también tiene su estante</h3>
          <p>
            Por ahora no hay otros regalitos en mi wishlist. Las historias que
            quiero leer siempre son una buena pista.
          </p>
          <a href="#wishlist" className="btn outline">
            Mirar mis libros
          </a>
        </div>
      )}
    </section>
  );
}
