"use client";
import { useEffect, useState } from "react";
import { Upload, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  GiftItem,
  GiftItemInput,
  Settings,
  GIFT_CATEGORIES,
  GIFT_STATUS_LABELS,
} from "@/lib/types";
import { giftItemSchema } from "@/lib/validation";
import { MAX_IMAGE_BYTES } from "@/lib/media";
import { GiftImage } from "./gift-items";
import SelectField from "./select-field";

export default function GiftItemForm({
  item,
  settings,
  onSave,
  onCancel,
  onBusyChange,
}: {
  item: GiftItem | null;
  settings: Settings;
  onSave: (data: GiftItemInput) => Promise<void>;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [data, setData] = useState<GiftItemInput>(
    item
      ? (Object.fromEntries(
          Object.keys(giftItemSchema.shape).map((key) => [
            key,
            item[key as keyof GiftItem],
          ]),
        ) as GiftItemInput)
      : {
          title: "",
          category: "Harry Potter",
          image_url: "",
          personal_note: "",
          priority: settings.priorities[0].id,
          status: "wishlist",
          price: null,
          purchase_url: "",
        },
  );
  const [price, setPrice] = useState(item?.price?.toString() || ""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => onBusyChange(busy || uploading),
    [busy, uploading, onBusyChange],
  );
  const set = <K extends keyof GiftItemInput>(
    key: K,
    value: GiftItemInput[K],
  ) => setData((current) => ({ ...current, [key]: value }));
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("La imagen debe pesar menos de 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", {
          method: "POST",
          body: form,
        }),
        result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No pudimos subir la imagen.");
      set("image_url", result.url);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = giftItemSchema.safeParse({
      ...data,
      price: price.trim() ? Number(price) : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos guardar tu regalo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="book-form" onSubmit={submit}>
      <div className="form-scroll">
        <div className="cover-editor">
          <div className="goal-form-image">
            <GiftImage item={data} />
          </div>
          <div>
            <p className="field-heading">Ese detalle que te hace ilusión</p>
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
                disabled={uploading}
                className="sr-only"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            <p className="form-help">JPG, PNG, WebP o GIF · hasta 4 MB</p>
            {data.image_url && (
              <button
                className="text-link"
                type="button"
                onClick={() => set("image_url", "")}
              >
                <Trash2 size={14} /> Quitar imagen
              </button>
            )}
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="gift-title">Nombre del regalo</label>
            <input
              id="gift-title"
              value={data.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={240}
              required
              placeholder="Ej. Juego de mesa de Harry Potter"
            />
          </div>
          <div className="field">
            <label htmlFor="gift-category">Categoría</label>
            <input
              id="gift-category"
              list="gift-category-options"
              value={data.category}
              onChange={(e) => set("category", e.target.value)}
              maxLength={80}
              required
            />
            <datalist id="gift-category-options">
              {GIFT_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="form-help">
              Elige una sugerencia o escribe tu propia categoría.
            </p>
          </div>
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
            <label htmlFor="gift-price">Precio aproximado (CLP)</label>
            <input
              id="gift-price"
              type="number"
              inputMode="numeric"
              min="0"
              max="10000000"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="gift-note">Por qué me hace ilusión</label>
          <textarea
            id="gift-note"
            value={data.personal_note}
            onChange={(e) => set("personal_note", e.target.value)}
            maxLength={1500}
            rows={3}
            placeholder="Una pista para quien quiera sorprenderte…"
          />
        </div>
        <div className="field">
          <label htmlFor="gift-link">Link para encontrarlo</label>
          <input
            id="gift-link"
            type="url"
            value={data.purchase_url}
            onChange={(e) => set("purchase_url", e.target.value)}
            maxLength={2048}
            placeholder="https://…"
          />
        </div>
        <SelectField
          label="Dónde queda este regalito"
          value={data.status}
          onChange={(v) => set("status", v as GiftItem["status"])}
          options={Object.entries(GIFT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <details className="extra-fields">
          <summary>O usar un link de imagen</summary>
          <div className="field">
            <label htmlFor="gift-image">Link de imagen</label>
            <input
              id="gift-image"
              value={data.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              maxLength={2048}
              placeholder="https://…"
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
          className="btn outline"
          type="button"
          disabled={busy || uploading}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="btn primary"
          type="submit"
          disabled={busy || uploading}
        >
          {busy && <LoaderCircle size={17} className="spin" />}
          {busy ? "Guardando…" : "Guardar regalito"}
        </button>
      </div>
    </form>
  );
}
