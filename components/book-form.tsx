"use client";
import { MAX_IMAGE_BYTES } from "@/lib/media";
import { useState } from "react";
import { Upload, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import SelectField from "./select-field";
import { Book, Settings, STATUS_LABELS } from "@/lib/types";
import { bookSchema } from "@/lib/validation";
import BookDiscovery from "./book-discovery";
import {
  bookEdition,
  compactEdition,
  EditionOptionsEditor,
} from "./edition-options";
import {
  isbn13,
  type Edition,
  type Offer,
  type Comparison,
  type EditionOption,
  spanish,
  sameWork,
} from "@/lib/book-discovery/shared";
export type BookInput = Omit<Book, "id" | "created_at" | "updated_at">;
export async function api<T>(
  url: string,
  method: string,
  data?: unknown,
): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const result = (await r.json()) as T & { error?: string };
  if (!r.ok)
    throw new Error(result.error || "No pudimos guardar. Intenta de nuevo.");
  return result;
}
export default function BookForm({
  book,
  settings,
  onSave,
  onCancel,
}: {
  book: Book | null;
  settings: Settings;
  onSave: (data: BookInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState<BookInput>(
    book
      ? (bookSchema.parse(
          Object.fromEntries(
            Object.keys(bookSchema.shape).map((k) => [
              k,
              book[k as keyof Book],
            ]),
          ),
        ) as BookInput)
      : {
          title: "",
          author: "",
          cover_url: "",
          description: "",
          personal_note: "",
          genre: "",
          priority:
            settings.priorities.find((p) => p.id === "interested")?.id ||
            settings.priorities[0].id,
          status: "wishlist",
          price: null,
          special_gift: 0,
          purchase_url: "",
          publisher: "",
          saga: "",
          isbn: "",
          edition_format: "",
          publication_year: null,
          language: "",
          translator: "",
          page_count: null,
          edition_note: "",
          edition_extras: "",
          edition_options: [],
        },
  );
  const [price, setPrice] = useState(book?.price?.toString() || ""),
    [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const set = <K extends keyof BookInput>(key: K, value: BookInput[K]) =>
    setData((d) => ({ ...d, [key]: value }));
  function useEdition(edition: Edition) {
    setData((d) => ({
      ...d,
      title: edition.title,
      author: edition.author,
      cover_url: edition.cover,
      description: edition.description,
      publisher: edition.publisher,
      isbn: edition.isbn,
      edition_format: edition.format,
      publication_year: edition.year,
      language: edition.language,
      translator: edition.translator,
      page_count: edition.pages,
      edition_note: d.isbn === edition.isbn ? d.edition_note : "",
      edition_extras: d.isbn === edition.isbn ? d.edition_extras : "",
      edition_options: edition.isbn
        ? [
            {
              edition: compactEdition(edition),
              comparison:
                d.edition_options.find((o) => o.edition.isbn === edition.isbn)
                  ?.comparison || null,
              extras: "",
              note: "",
            },
            ...d.edition_options.filter(
              (o) =>
                o.edition.isbn !== edition.isbn && sameWork(o.edition, edition),
            ),
          ].slice(0, 5)
        : d.edition_options,
      price: null,
      purchase_url: "",
    }));
    setPrice("");
    toast.success("Datos completados. Revisa la edición antes de guardar.");
  }
  function useOffer(offer: Offer) {
    if (offer.isbn !== isbn13(data.isbn)) return;
    setPrice(String(offer.price));
    setData((d) => ({ ...d, price: offer.price, purchase_url: offer.url }));
    toast.success("Precio y enlace de esta edición seleccionados.");
  }
  function addAlternative(edition: Edition, confirmedSameWork = false) {
    if (!data.isbn || !spanish(data.language)) {
      toast.error("Elige primero tu edición favorita en español, con ISBN.");
      return;
    }
    if (!confirmedSameWork && !sameWork(bookEdition(data), edition)) {
      toast(
        "Las fichas tienen distinto título o autor. Confirma que es el mismo libro y tomo antes de agregarlas.",
        {
          duration: 12000,
          action: {
            label: "Es el mismo tomo",
            onClick: () => addAlternative(edition, true),
          },
        },
      );
      return;
    }
    if (data.edition_options.some((o) => o.edition.isbn === edition.isbn)) {
      toast.info("Esta edición ya está incluida.");
      return;
    }
    if (data.edition_options.length >= 5) {
      toast.error("Puedes mostrar tu favorita y hasta cuatro alternativas.");
      return;
    }
    setData((d) =>
      d.isbn !== data.isbn ||
      d.edition_options.some((o) => o.edition.isbn === edition.isbn) ||
      d.edition_options.length >= 5
        ? d
        : {
            ...d,
            edition_options: [
              ...d.edition_options,
              {
                edition: compactEdition(edition),
                comparison: null,
                extras: "",
                note: "",
              },
            ],
          },
    );
    toast.success("Alternativa agregada. Se consultarán sus precios en Chile.");
  }
  function changeOption(isbn: string, patch: Partial<EditionOption> | null) {
    setData((d) => ({
      ...d,
      edition_options: patch
        ? d.edition_options.map((o) =>
            o.edition.isbn === isbn ? { ...o, ...patch } : o,
          )
        : d.edition_options.filter((o) => o.edition.isbn !== isbn),
    }));
  }
  function saveComparison(comparison: Comparison) {
    setData((d) => {
      if (comparison.isbn !== isbn13(d.isbn)) return d;
      const edition = compactEdition(bookEdition(d));
      if (!spanish(edition.language)) return d;
      return {
        ...d,
        edition_options: [
          { edition, comparison, extras: "", note: "" },
          ...d.edition_options.filter(
            (o) => o.edition.isbn !== comparison.isbn,
          ),
        ].slice(0, 5),
      };
    });
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("La portada debe pesar menos de 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form }),
        response = (await r.json()) as { error?: string; url: string };
      if (!r.ok) throw new Error(response.error);
      set("cover_url", response.url);
      toast.success("Portada lista.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos subir la portada.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = bookSchema.safeParse({
      ...data,
      edition_options: data.edition_options.map((o) =>
        o.edition.isbn === data.isbn
          ? { ...o, note: data.edition_note, extras: data.edition_extras }
          : o,
      ),
      price: price.trim() === "" ? null : Number(price),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar.");
    } finally {
      setSaving(false);
    }
  }
  function text(
    key:
      | "title"
      | "author"
      | "cover_url"
      | "purchase_url"
      | "publisher"
      | "saga",
    label: string,
    placeholder = "",
    required = false,
  ) {
    return (
      <div className="field">
        <label htmlFor={`book-${key}`}>
          {label}
          {required ? " *" : ""}
        </label>
        <input
          id={`book-${key}`}
          value={data[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={key.includes("url") ? 2048 : 240}
          type={key === "purchase_url" ? "url" : "text"}
        />
      </div>
    );
  }
  return (
    <form className="book-form" onSubmit={submit}>
      <div className="form-scroll">
        {text(
          "title",
          "Título o ISBN",
          "Escribe el libro que estás buscando",
          true,
        )}
        <BookDiscovery
          query={data.title}
          initialIsbn={data.isbn}
          onEdition={useEdition}
          onOffer={useOffer}
          onAlternative={addAlternative}
          onComparison={saveComparison}
        />
        <div className="field">
          <label htmlFor="edition-preferred-note">
            Por qué elegí esta versión{" "}
            <span className="public-label">Mi recomendación pública</span>
          </label>
          <textarea
            id="edition-preferred-note"
            value={data.edition_note}
            onChange={(e) => set("edition_note", e.target.value)}
            maxLength={1000}
            placeholder="Ej.: prefiero la edición ilustrada porque sus imágenes me hacen ilusión."
          />
        </div>
        <div className="field">
          <label htmlFor="edition-preferred-extras">
            Ilustraciones y contenido adicional de mi edición
          </label>
          <textarea
            id="edition-preferred-extras"
            value={data.edition_extras}
            onChange={(e) => set("edition_extras", e.target.value)}
            maxLength={1000}
            placeholder="Anota los extras que comprobaste: ilustraciones, prólogo, capítulos adicionales…"
          />
        </div>
        <EditionOptionsEditor
          options={data.edition_options}
          preferredIsbn={data.isbn}
          onChange={changeOption}
        />
        <div className="cover-editor">
          <div className="small-cover">
            {data.cover_url ? (
              <img
                key={data.cover_url}
                src={data.cover_url}
                alt="Vista previa de portada"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            ) : (
              <ImagePlus size={28} strokeWidth={1.2} />
            )}
          </div>
          <div>
            <p className="field-heading">Una portada para esta historia</p>
            <label
              className={`btn outline upload-label ${uploading ? "disabled" : ""}`}
            >
              {uploading ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Upload size={17} />
              )}{" "}
              {uploading ? "Subiendo…" : "Subir imagen"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => void upload(e.target.files?.[0])}
                disabled={uploading}
                className="sr-only"
              />
            </label>
            <p className="form-help">JPG, PNG, WebP o GIF · hasta 4 MB</p>
            {data.cover_url && (
              <button
                type="button"
                className="text-link"
                onClick={() => set("cover_url", "")}
              >
                <Trash2 size={13} /> Quitar portada
              </button>
            )}
          </div>
        </div>
        <div className="form-grid">
          {text("author", "Autor", "¿Quién la escribió?", true)}
          <SelectField
            label="Género"
            value={data.genre || "none"}
            onChange={(v) => set("genre", v === "none" ? "" : v)}
            options={[
              { value: "none", label: "Sin especificar" },
              ...settings.genres.map((g) => ({ value: g.id, label: g.label })),
            ]}
          />
          <SelectField
            label="Prioridad"
            value={data.priority}
            onChange={(v) => set("priority", v)}
            options={settings.priorities.map((p) => ({
              value: p.id,
              label: `${p.symbol} ${p.label}`,
            }))}
          />
          <div className="field">
            <label htmlFor="book-price">Precio aproximado (CLP)</label>
            <input
              id="book-price"
              type="number"
              min="0"
              max="10000000"
              step="1"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ej. 18990"
            />
          </div>
          <SelectField
            label="Dónde va este libro"
            value={data.status}
            onChange={(v) => set("status", v as Book["status"])}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <label className="check-label">
          <Checkbox
            checked={!!data.special_gift}
            onCheckedChange={(v) => set("special_gift", v === true ? 1 : 0)}
          />{" "}
          Marcar como regalo especial
        </label>
        <div className="field">
          <label htmlFor="book-note">
            Por qué quiero leerlo{" "}
            <span className="public-label">Se verá en la wishlist</span>
          </label>
          <textarea
            id="book-note"
            value={data.personal_note}
            onChange={(e) => set("personal_note", e.target.value)}
            maxLength={1500}
            rows={3}
            placeholder="Un misterio para armar teorías, un romance para sufrir bonito…"
          />
        </div>
        <details className="extra-fields">
          <summary>Edición, saga y otros detalles</summary>
          <div className="form-grid">
            {text("publisher", "Editorial", "Opcional")}
            {text("saga", "Saga", "Vacío si es independiente")}
            {text("purchase_url", "Link de compra", "https://…")}
            {text("cover_url", "O pegar un link de portada", "https://…")}
            <div className="field">
              <label htmlFor="book-isbn">ISBN</label>
              <input
                id="book-isbn"
                value={data.isbn}
                maxLength={30}
                onChange={(e) => set("isbn", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="book-format">Formato</label>
              <input
                id="book-format"
                value={data.edition_format}
                maxLength={80}
                onChange={(e) => set("edition_format", e.target.value)}
                placeholder="Tapa dura, bolsillo…"
              />
            </div>
            <div className="field">
              <label htmlFor="book-language">Idioma</label>
              <input
                id="book-language"
                value={data.language}
                maxLength={40}
                onChange={(e) => set("language", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="book-translator">Traducción</label>
              <input
                id="book-translator"
                value={data.translator}
                maxLength={240}
                onChange={(e) => set("translator", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="book-year">Año de publicación</label>
              <input
                id="book-year"
                type="number"
                min={1000}
                max={3000}
                value={data.publication_year ?? ""}
                onChange={(e) =>
                  set(
                    "publication_year",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </div>
            <div className="field">
              <label htmlFor="book-pages">Páginas</label>
              <input
                id="book-pages"
                type="number"
                min={1}
                max={100000}
                value={data.page_count ?? ""}
                onChange={(e) =>
                  set(
                    "page_count",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="book-description">Descripción breve</label>
            <textarea
              id="book-description"
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={4000}
              rows={3}
            />
          </div>
        </details>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="btn outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          className="btn primary"
          type="submit"
          disabled={saving || uploading}
        >
          {saving ? <LoaderCircle size={17} className="spin" /> : null}
          {saving ? "Guardando…" : book ? "Guardar cambios" : "Agregar libro"}
        </button>
      </div>
    </form>
  );
}
