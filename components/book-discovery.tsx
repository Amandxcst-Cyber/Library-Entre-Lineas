"use client";
import { useEffect, useState } from "react";
import { BookOpen, LoaderCircle } from "lucide-react";
import {
  cheapest,
  isbn13,
  recommend,
  spanish,
  editionFeatures,
  type Comparison,
  type Edition,
  type Offer,
  type Preference,
} from "@/lib/book-discovery/shared";
import { formatPrice } from "@/lib/types";

export default function BookDiscovery({
  query,
  initialIsbn,
  onEdition,
  onOffer,
  onAlternative,
  onComparison,
}: {
  query: string;
  initialIsbn: string;
  onEdition: (edition: Edition) => void;
  onOffer: (offer: Offer) => void;
  onAlternative: (edition: Edition) => void;
  onComparison: (comparison: Comparison) => void;
}) {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selected, setSelected] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [partial, setPartial] = useState(false);
  const [searched, setSearched] = useState(false);
  const [prices, setPrices] = useState<Record<string, Comparison>>({});
  const [priceLoading, setPriceLoading] = useState(false),
    [priceError, setPriceError] = useState("");
  const [preference, setPreference] = useState<Preference>("reading");
  const [retry, setRetry] = useState(0),
    [priceRetry, setPriceRetry] = useState(0);
  useEffect(() => {
    const term = query.trim();
    if (selected?.title === term) return;
    setSelected(null);
    setEditions([]);
    setError("");
    setPartial(false);
    setSearched(false);
    setLoading(false);
    if (term.length < 3 || term.length > 160) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          "/api/book-discovery?q=" + encodeURIComponent(term),
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await r.json();
        if (!r.ok)
          throw new Error(result.error || "No pudimos buscar el libro.");
        if (!controller.signal.aborted) {
          setEditions(
            result.editions.filter((e: Edition) => spanish(e.language)),
          );
          setPartial(result.partial);
          setSearched(true);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "No pudimos consultar el catálogo.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 650);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // Selection fills the title; it must not trigger another lookup of the same edition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, retry]);
  const selectedIsbn = isbn13(selected?.isbn || initialIsbn);
  useEffect(() => {
    setPriceError("");
    setPriceLoading(false);
    if (!selectedIsbn || (prices[selectedIsbn] && !priceRetry)) return;
    const controller = new AbortController();
    setPriceLoading(true);
    void (async () => {
      try {
        const r = await fetch(
          "/api/book-prices?isbn=" + encodeURIComponent(selectedIsbn),
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await r.json();
        if (!r.ok)
          throw new Error(result.error || "No pudimos comparar los precios.");
        if (!controller.signal.aborted)
          setPrices((p) => ({ ...p, [selectedIsbn]: result }));
      } catch (e) {
        if (!controller.signal.aborted)
          setPriceError(
            e instanceof Error
              ? e.message
              : "No pudimos consultar las librerías.",
          );
      } finally {
        if (!controller.signal.aborted) setPriceLoading(false);
      }
    })();
    return () => controller.abort();
    // Cache is consulted at selection time; updating it must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIsbn, priceRetry]);
  const advice = recommend(editions, preference, prices);
  const comparison = prices[selectedIsbn];
  useEffect(() => {
    if (comparison)
      onComparison(
        comparison,
      ); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [comparison]);
  const lowest = cheapest(comparison);
  const availableStores =
    comparison?.stores.filter((store) =>
      store.offers.some(
        (offer) => offer.available === true && offer.isbn === comparison.isbn,
      ),
    ).length || 0;
  return (
    <section className="book-discovery" aria-label="Buscar ediciones y precios">
      <p className="discovery-help">
        Escribe el nombre del libro: buscaremos versiones en español y compras
        en Chile. Elige tu edición favorita; completaremos autor, portada y
        datos disponibles. Puedes corregirlos antes de guardar.
      </p>
      {loading && (
        <p role="status">
          <LoaderCircle size={16} className="spin" /> Buscando ediciones…
        </p>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => setRetry((n) => n + 1)}
          >
            Reintentar
          </button>
        </p>
      )}
      {!loading &&
        !error &&
        searched &&
        query.trim().length >= 3 &&
        !selected &&
        !editions.length && (
          <p role="status">
            Sin ediciones en español identificadas. Puedes completar el libro
            manualmente; no mostramos versiones de otros idiomas ni presumimos
            el idioma cuando falta.
          </p>
        )}
      {partial && (
        <p role="status">
          Algunas fuentes no respondieron. Estos resultados pueden estar
          incompletos.
        </p>
      )}
      {!!editions.length && (
        <>
          <label className="discovery-preference" htmlFor="edition-preference">
            Para elegir una edición
            <select
              id="edition-preference"
              value={preference}
              onChange={(e) => setPreference(e.target.value as Preference)}
            >
              <option value="reading">
                Leer en español · precio y contenido
              </option>
              <option value="collecting">Una edición para coleccionar</option>
              <option value="translation">
                Conocer la traducción y sus detalles
              </option>
            </select>
          </label>
          <ul className="edition-results" aria-label="Ediciones encontradas">
            {editions.map((edition) => (
              <li key={edition.id}>
                <button
                  type="button"
                  className={
                    selected?.id === edition.id
                      ? "edition-choice selected"
                      : "edition-choice"
                  }
                  aria-pressed={selected?.id === edition.id}
                  onClick={() => {
                    setSelected(edition);
                    onEdition(edition);
                  }}
                >
                  {edition.cover ? (
                    <img
                      src={edition.cover}
                      alt=""
                      width={48}
                      height={70}
                      loading="lazy"
                    />
                  ) : (
                    <BookOpen size={28} aria-hidden="true" />
                  )}
                  <span>
                    <strong>{edition.title}</strong>
                    <span>{edition.author}</span>
                    <span>
                      {[
                        edition.publisher,
                        edition.year,
                        edition.language,
                        edition.format,
                        ...editionFeatures(edition),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Edición sin detalles confirmados"}
                    </span>
                    <span>
                      {edition.isbn
                        ? "ISBN " + edition.isbn
                        : "ISBN sin confirmar"}
                    </span>
                    <span>
                      {[
                        edition.pages ? edition.pages + " páginas" : "",
                        edition.translator
                          ? "Traducción: " + edition.translator
                          : "Traducción sin identificar",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span>
                      {selected?.id === edition.id
                        ? "Edición elegida"
                        : "Usar esta edición"}
                    </span>
                  </span>
                </button>
                <p className="edition-market">
                  {edition.source === "Contrapunto"
                    ? "Ficha de una librería en Chile; precio y stock al consultar."
                    : "Referencia bibliográfica; compra en Chile por confirmar."}
                </p>
                {edition.isbn && edition.isbn !== selectedIsbn && (
                  <button
                    type="button"
                    className="btn outline edition-add"
                    onClick={() => onAlternative(edition)}
                  >
                    Agregar como alternativa
                  </button>
                )}
                {(
                  edition.sources || [
                    { label: edition.source, url: edition.sourceUrl },
                  ]
                ).map((source) => (
                  <a
                    key={source.url}
                    className="edition-source"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ficha en {source.label}
                  </a>
                ))}
              </li>
            ))}
          </ul>
          {advice && (
            <div className="edition-advice">
              <strong>
                Una opción a considerar:{" "}
                {advice.edition.publisher || advice.edition.title}
              </strong>
              <ul>
                {advice.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <details>
                <summary>Qué falta por comprobar</summary>
                <p>{advice.limitations}</p>
              </details>
            </div>
          )}
        </>
      )}
      {priceLoading && (
        <p role="status">
          <LoaderCircle size={16} className="spin" /> Consultando librerías para
          este ISBN…
        </p>
      )}
      {priceError && (
        <p role="alert">
          {priceError}{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => setPriceRetry((n) => n + 1)}
          >
            Reintentar precios
          </button>
        </p>
      )}
      {selected && !selected.isbn && (
        <p>
          Esta ficha no tiene ISBN confirmado. No podemos asegurar que los
          precios correspondan a la misma edición.
        </p>
      )}
      {comparison && (
        <div className="edition-prices">
          <h3>Precios para ISBN {comparison.isbn}</h3>
          <p>
            Consulta por edición. Los montos son CLP y no incluyen envío. Se
            muestran ofertas solo si la fuente publica un ISBN y precio
            coincidentes; el stock debe confirmarse al comprar.
          </p>
          {comparison.stores.map((store) => (
            <div className="store-result" key={store.store}>
              <strong>{store.store}</strong>
              {store.offers.length ? (
                store.offers.map((offer) => (
                  <div key={offer.url + offer.price}>
                    <p>
                      {formatPrice(offer.price)} ·{" "}
                      {offer.available === true
                        ? "Stock indicado por la fuente"
                        : offer.available === false
                          ? "Sin stock"
                          : "Stock sin confirmar"}
                      {lowest?.url === offer.url &&
                      lowest?.price === offer.price
                        ? availableStores > 1
                          ? " · Menor precio entre las fuentes que respondieron"
                          : " · Única fuente con oferta disponible obtenida"
                        : ""}
                    </p>
                    <p className="offer-date">
                      Consultado:{" "}
                      {new Date(offer.checkedAt).toLocaleString("es-CL")}
                    </p>
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver oferta
                    </a>{" "}
                    <button
                      type="button"
                      className="text-link"
                      disabled={offer.available !== true}
                      onClick={() => onOffer(offer)}
                    >
                      Usar este precio y link
                    </button>
                  </div>
                ))
              ) : (
                <p>
                  {store.status === "blocked"
                    ? "La fuente no permitió la consulta automática."
                    : store.status === "unavailable"
                      ? "No pudimos consultar esta fuente."
                      : "No obtuvimos un precio verificable para este ISBN."}
                </p>
              )}
              <a
                href={store.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buscar en {store.store}
              </a>
            </div>
          ))}
          <button
            type="button"
            className="text-link"
            onClick={() => setPriceRetry((n) => n + 1)}
            disabled={priceLoading}
          >
            Consultar de nuevo
          </button>
        </div>
      )}
    </section>
  );
}
