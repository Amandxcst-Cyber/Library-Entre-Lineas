"use client";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import type { Book } from "@/lib/types";
import PriceComparison from "./price-comparison";
import {
  editionFeatures,
  editionReasons,
  type Edition,
  type EditionOption,
  type Comparison,
} from "@/lib/book-discovery/shared";

export function compactEdition(edition: Edition): Edition {
  return {
    ...edition,
    description: edition.description.slice(0, 500),
    ...(edition.sources ? { sources: edition.sources.slice(0, 2) } : {}),
  };
}
export function bookEdition(
  book: Pick<
    Book,
    | "title"
    | "author"
    | "isbn"
    | "publisher"
    | "publication_year"
    | "language"
    | "edition_format"
    | "translator"
    | "page_count"
    | "cover_url"
  >,
): Edition {
  return {
    id: "preferred:" + book.isbn,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    publisher: book.publisher,
    year: book.publication_year,
    language: book.language,
    format: book.edition_format,
    translator: book.translator,
    pages: book.page_count,
    cover: book.cover_url,
    description: "",
    source: "Amanda",
    sourceUrl: "",
  };
}
function EditionSummary({
  edition,
  extras,
}: {
  edition: Edition;
  extras: string;
}) {
  const features = editionFeatures(edition);
  return (
    <>
      <dl className="edition-specs">
        <div>
          <dt>Editorial</dt>
          <dd>{edition.publisher || "Por confirmar"}</dd>
        </div>
        <div>
          <dt>Formato</dt>
          <dd>{edition.format || "Por confirmar"}</dd>
        </div>
        <div>
          <dt>Idioma</dt>
          <dd>{edition.language || "Por confirmar"}</dd>
        </div>
        <div>
          <dt>Traducción</dt>
          <dd>{edition.translator || "Sin identificar"}</dd>
        </div>
        <div>
          <dt>Páginas / año</dt>
          <dd>
            {[edition.pages, edition.year].filter(Boolean).join(" / ") ||
              "Por confirmar"}
          </dd>
        </div>
        <div>
          <dt>ISBN</dt>
          <dd>{edition.isbn || "Por confirmar"}</dd>
        </div>
        <div>
          <dt>Ilustraciones y extras</dt>
          <dd>
            {[...features, extras].filter(Boolean).join(" · ") ||
              "Sin detalles confirmados"}
          </dd>
        </div>
      </dl>
      <details>
        <summary>Qué aporta esta versión</summary>
        <ul>
          {editionReasons(edition, extras).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </details>
    </>
  );
}
export default function BookEditionComparison({ book }: { book: Book }) {
  const options = book.edition_options || [];
  const preferred = options.find((o) => o.edition.isbn === book.isbn);
  const alternatives = options.filter((o) => o.edition.isbn !== book.isbn);
  return (
    <section
      className="edition-comparison"
      aria-label="Ediciones y compras en Chile"
    >
      <h3 className="serif">La edición que me hace ilusión</h3>
      <article
        className="public-edition preferred-edition"
        data-preferred="true"
      >
        <p className="edition-badge">Mi edición elegida · primera opción</p>
        <h4>{book.title}</h4>
        {book.edition_note && (
          <blockquote>
            <p>“{book.edition_note}”</p>
            <cite>— Amanda · mi motivo personal</cite>
          </blockquote>
        )}
        <EditionSummary
          edition={bookEdition(book)}
          extras={book.edition_extras || ""}
        />
        <PriceComparison
          comparison={preferred?.comparison || null}
          isbn={book.isbn}
        />
      </article>
      {alternatives.length > 0 && (
        <>
          <h3 className="serif">Otras versiones para comparar</h3>
          <p>
            Prefiero la de arriba. Estas también son opciones; un precio menor
            no cambia mi elección.
          </p>
        </>
      )}
      {alternatives.map((option) => (
        <article
          key={option.edition.isbn}
          className="public-edition"
          data-alternative="true"
        >
          <div className="edition-alternative-heading">
            {option.edition.cover ? (
              <img
                src={option.edition.cover}
                width={48}
                height={70}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            ) : (
              <BookOpen size={28} aria-hidden="true" />
            )}
            <div>
              <h4>{option.edition.title}</h4>
              <p>{option.edition.publisher || "Editorial por confirmar"}</p>
            </div>
          </div>
          {option.note && (
            <blockquote>
              <p>{option.note}</p>
              <cite>Amanda · mi opinión</cite>
            </blockquote>
          )}
          <EditionSummary edition={option.edition} extras={option.extras} />
          <PriceComparison
            comparison={option.comparison}
            isbn={option.edition.isbn}
          />
          {option.edition.sourceUrl && (
            <a
              href={option.edition.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Fuente de los datos: {option.edition.source}
            </a>
          )}
        </article>
      ))}
      <p className="edition-footnote">
        La editorial por sí sola no demuestra calidad. Compara traducción,
        encuadernación y extras identificados. La reserva corresponde al libro
        completo, incluyendo sus versiones.
      </p>
    </section>
  );
}
export function EditionOptionsEditor({
  options,
  preferredIsbn,
  onChange,
}: {
  options: EditionOption[];
  preferredIsbn: string;
  onChange: (isbn: string, patch: Partial<EditionOption> | null) => void;
}) {
  return (
    <section
      className="edition-options-editor"
      aria-label="Alternativas que verán las visitas"
    >
      <h3>Versiones que verán las visitas</h3>
      <p>
        Elige primero tu favorita. Agrega hasta cuatro alternativas del mismo
        libro desde los resultados; comprueba autor y tomo antes de publicarlas.
      </p>
      {options
        .filter((o) => o.edition.isbn !== preferredIsbn)
        .map((option) => (
          <EditableOption
            key={option.edition.isbn}
            option={option}
            onChange={(patch) => onChange(option.edition.isbn, patch)}
          />
        ))}
      {!options.some((o) => o.edition.isbn !== preferredIsbn) && (
        <p>Aún no agregaste alternativas.</p>
      )}
    </section>
  );
}
function EditableOption({
  option,
  onChange,
}: {
  option: EditionOption;
  onChange: (patch: Partial<EditionOption> | null) => void;
}) {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (option.comparison && !retry) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetch("/api/book-prices?isbn=" + option.edition.isbn, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok)
          throw new Error(result.error || "No pudimos consultar los precios.");
        if (!controller.signal.aborted) onChange({ comparison: result });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // The row survives note changes; fetching is keyed to its ISBN and an explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option.edition.isbn, retry]);
  return (
    <article className="public-edition">
      <h4>
        {option.edition.title} · {option.edition.publisher}
      </h4>
      <EditionSummary edition={option.edition} extras={option.extras} />
      <label htmlFor={"extras-" + option.edition.isbn}>
        Extras de esta alternativa (anotados por ti)
      </label>
      <textarea
        id={"extras-" + option.edition.isbn}
        maxLength={1000}
        value={option.extras}
        onChange={(e) => onChange({ extras: e.target.value })}
      />
      <label htmlFor={"note-" + option.edition.isbn}>
        Mi opinión sobre esta alternativa
      </label>
      <textarea
        id={"note-" + option.edition.isbn}
        maxLength={1000}
        value={option.note}
        onChange={(e) => onChange({ note: e.target.value })}
      />
      {loading ? (
        <p role="status">Consultando precios en Chile…</p>
      ) : (
        <PriceComparison
          comparison={option.comparison}
          isbn={option.edition.isbn}
        />
      )}{" "}
      {error && <p role="alert">{error}</p>}
      <div className="edition-row-actions">
        <button
          type="button"
          className="btn outline"
          disabled={loading}
          onClick={() => setRetry((n) => n + 1)}
        >
          Actualizar precios
        </button>
        <button
          type="button"
          className="btn outline"
          onClick={() => onChange(null)}
        >
          Quitar alternativa
        </button>
      </div>
    </article>
  );
}
