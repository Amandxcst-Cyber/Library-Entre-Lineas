"use client";
import { useState } from "react";
import { formatPrice } from "@/lib/types";
import {
  cheapest,
  isbn13,
  type Comparison,
  type Offer,
} from "@/lib/book-discovery/shared";
import {
  comparisonRows,
  retailerWebSearch,
} from "@/lib/book-discovery/retailer-links";

export default function PriceComparison({
  comparison,
  isbn,
  onOffer,
  onRefresh,
  refreshing = false,
}: {
  comparison: Comparison | null;
  isbn: string;
  onOffer?: (offer: Offer) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [copyMessage, setCopyMessage] = useState("");
  const rows = comparisonRows(isbn, comparison);
  const normalized = {
    isbn: isbn13(isbn),
    stores: rows.map((r) => ({
      store: r.name,
      searchUrl: r.search(isbn13(isbn)),
      status: r.status,
      offers: r.offers,
    })),
  };
  const minimum = cheapest(normalized);
  const quotedCount = rows.filter((r) => r.offers.length).length;
  const available = rows
    .flatMap((r) => r.offers)
    .filter((o) => o.available === true);
  const spread =
    available.length > 1
      ? Math.max(...available.map((o) => o.price)) -
        Math.min(...available.map((o) => o.price))
      : null;
  async function copyIsbn() {
    try {
      await navigator.clipboard.writeText(isbn13(isbn));
      setCopyMessage("ISBN copiado");
    } catch {
      setCopyMessage("Puedes seleccionar y copiar el ISBN que aparece arriba.");
    }
  }
  return (
    <section
      className="price-comparison"
      aria-label="Comparador de precios en Chile"
    >
      <div className="price-comparison-heading">
        <h4>Comparar precios en Chile</h4>
        <span>{quotedCount} de 4 tiendas con precio obtenido</span>
      </div>
      {minimum && (
        <p className="price-comparison-best">
          <strong>
            {formatPrice(minimum.price)} CLP · {minimum.store}
          </strong>
          <span>
            {available.length > 1
              ? "Menor oferta disponible obtenida para esta edición, sin envío."
              : "Única oferta disponible obtenida. Faltan precios para comparar todas las tiendas."}
          </span>
        </p>
      )}
      {spread !== null && (
        <p>
          Diferencia entre las ofertas disponibles obtenidas:{" "}
          <strong>{formatPrice(spread)} CLP</strong>, sin envío.
        </p>
      )}
      {!quotedCount && (
        <p>
          No hay precios obtenidos para esta edición. Puedes revisar el ISBN en
          las tiendas de abajo.
        </p>
      )}
      <div className="price-comparison-isbn">
        <span>ISBN {isbn13(isbn) || "por confirmar"}</span>
        <button
          type="button"
          className="btn outline"
          disabled={!isbn13(isbn)}
          onClick={() => void copyIsbn()}
        >
          Copiar ISBN
        </button>
        {copyMessage && <span role="status">{copyMessage}</span>}
      </div>
      <div className="price-comparison-grid">
        {rows.map((store) => (
          <div
            key={store.name}
            className={
              "price-comparison-store" +
              (store.offers.length ? " has-price" : "")
            }
            data-store={store.name}
          >
            <h5>{store.name}</h5>
            {store.offers.length ? (
              store.offers.map((offer) => (
                <div key={offer.url + offer.price}>
                  <p className="price-comparison-amount">
                    {formatPrice(offer.price)} CLP
                  </p>
                  <p>
                    {offer.available === true
                      ? "Stock indicado al consultar"
                      : offer.available === false
                        ? "Sin stock al consultar"
                        : "Stock por confirmar"}
                  </p>
                  <small>
                    Consultado{" "}
                    {new Date(offer.checkedAt).toLocaleString("es-CL", {
                      timeZone: "America/Santiago",
                    })}
                  </small>
                  <a
                    className="price-store-link"
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver oferta en {store.name}
                  </a>
                  {onOffer && (
                    <button
                      type="button"
                      className="btn outline"
                      disabled={offer.available !== true}
                      onClick={() => onOffer(offer)}
                    >
                      Usar este precio y link
                    </button>
                  )}
                </div>
              ))
            ) : (
              <>
                <p className="price-comparison-missing">Precio no obtenido</p>
                <p>
                  {store.status === "blocked"
                    ? "Consulta automática bloqueada por la tienda."
                    : store.status === "no_match"
                      ? "No encontramos un precio para este ISBN."
                      : comparison
                        ? "No se pudo consultar esta tienda."
                        : "Esta edición aún no tiene una consulta guardada."}
                </p>
              </>
            )}
            {!store.offers.length && (
              <>
                <a
                  className="price-store-link"
                  href={store.home}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir sitio oficial
                </a>
                {retailerWebSearch(store.name, isbn) && (
                  <a
                    className="price-store-link"
                    href={retailerWebSearch(store.name, isbn)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buscar página de este ISBN
                  </a>
                )}
                <small>
                  La búsqueda web sirve para encontrar la ficha; no acredita
                  precio, stock ni disponibilidad en Chile.
                </small>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="edition-footnote">
        Precios de la última consulta guardada, en CLP y sin envío. Confirma
        precio final y stock en la tienda. Las fuentes bloqueadas no tienen un
        precio automático verificado.
      </p>
      {onRefresh && (
        <button
          type="button"
          className="btn outline"
          onClick={onRefresh}
          disabled={refreshing}
        >
          Consultar de nuevo
        </button>
      )}
    </section>
  );
}
