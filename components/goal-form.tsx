"use client";
import { MAX_IMAGE_BYTES } from "@/lib/media";
import { useEffect, useState } from "react";
import { Upload, LoaderCircle, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import {
  GiftGoal,
  GoalInput,
  GoalStatus,
  GOAL_STATUS_LABELS,
} from "@/lib/types";
import { goalFields, goalSchema } from "@/lib/validation";
import { GoalImage } from "./gift-goals";
import SelectField from "./select-field";

export default function GoalForm({
  goal,
  onSave,
  onCancel,
  onBusyChange,
  suggestion,
}: {
  goal: GiftGoal | null;
  onSave: (data: GoalInput) => Promise<void>;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
  suggestion?: Pick<GoalInput, "title" | "personal_note">;
}) {
  const [data, setData] = useState<GoalInput>(
    goal
      ? (Object.fromEntries(
          Object.keys(goalFields.shape).map((key) => [
            key,
            goal[key as keyof GiftGoal],
          ]),
        ) as GoalInput)
      : {
          title: suggestion?.title || "",
          personal_note: suggestion?.personal_note || "",
          image_url: "",
          target_amount: 0,
          collected_amount: 0,
          contribution_url: "",
          status: "draft",
        },
  );
  const [target, setTarget] = useState(goal?.target_amount.toString() || ""),
    [collected, setCollected] = useState(
      goal?.collected_amount.toString() || "0",
    ),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => onBusyChange(busy || uploading),
    [busy, uploading, onBusyChange],
  );
  const set = <K extends keyof GoalInput>(key: K, value: GoalInput[K]) =>
    setData((current) => ({ ...current, [key]: value }));
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
      const r = await fetch("/api/upload", { method: "POST", body: form }),
        result = (await r.json()) as { url: string; error?: string };
      if (!r.ok) throw new Error(result.error || "No pudimos subir la imagen.");
      set("image_url", result.url);
      toast.success("Imagen lista.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = goalSchema.safeParse({
      ...data,
      target_amount: target.trim() ? Number(target) : 0,
      collected_amount: collected.trim() ? Number(collected) : 0,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar tu sueño.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="book-form" onSubmit={submit}>
      <div className="form-scroll">
        <div className="cover-editor">
          <div className="goal-form-image">
            <GoalImage goal={data} />
          </div>
          <div>
            <p className="field-heading">Una imagen de tu próximo sueño</p>
            <label className="btn outline upload-label">
              {uploading ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Upload size={17} />
              )}{" "}
              {uploading ? "Subiendo…" : "Subir imagen"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={busy || uploading}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            <p className="form-help">JPG, PNG, WebP o GIF · hasta 4 MB</p>
            {data.image_url && (
              <button
                type="button"
                className="text-link"
                onClick={() => set("image_url", "")}
                disabled={busy}
              >
                <Trash2 size={14} /> Quitar imagen
              </button>
            )}
          </div>
        </div>
        <div className="field">
          <label htmlFor="goal-title">¿Qué te gustaría recibir? *</label>
          <input
            id="goal-title"
            required
            maxLength={160}
            value={data.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Un Kindle, un Kobo, una edición especial…"
          />
        </div>
        <div className="field">
          <label htmlFor="goal-note">Por qué es especial para ti</label>
          <textarea
            id="goal-note"
            rows={3}
            maxLength={1500}
            value={data.personal_note}
            onChange={(e) => set("personal_note", e.target.value)}
            placeholder="Para llevar mis próximas historias a todas partes…"
          />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="goal-target">Meta (CLP) *</label>
            <input
              id="goal-target"
              required
              type="number"
              min="1"
              max="10000000"
              step="1"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Monto que necesitas reunir"
            />
          </div>
          <div className="field">
            <label htmlFor="goal-collected">Total recaudado (CLP)</label>
            <input
              id="goal-collected"
              required
              type="number"
              min="0"
              max="10000000"
              step="1"
              inputMode="numeric"
              value={collected}
              onChange={(e) => setCollected(e.target.value)}
            />
          </div>
        </div>
        <p className="form-help goal-form-help">
          Actualiza el total después de revisar los aportes en tu plataforma. Al
          alcanzar la meta, se cierra automáticamente el botón para aportar.
        </p>
        <div className="field">
          <label htmlFor="goal-link">Link externo para aportar</label>
          <input
            id="goal-link"
            type="url"
            maxLength={2048}
            value={data.contribution_url}
            onChange={(e) => set("contribution_url", e.target.value)}
            required={
              data.status === "active" && Number(collected) < Number(target)
            }
            placeholder="https://…"
          />
          <p className="form-help">
            Pega el link que creaste en tu plataforma de aportes.
          </p>
        </div>
        <SelectField
          label="Dónde queda este sueño"
          value={data.status}
          onChange={(value) => set("status", value as GoalStatus)}
          options={Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <p className="goal-form-privacy">
          <Heart size={17} />
          {data.status === "draft" || data.status === "archived"
            ? "Este sueño queda privado. Solo tú podrás verlo."
            : "El título, la nota, la imagen, la meta y lo recaudado se verán en tu wishlist."}
        </p>
        <details className="extra-fields">
          <summary>O usar un link de imagen</summary>
          <div className="field">
            <label htmlFor="goal-image">Link de imagen</label>
            <input
              id="goal-image"
              maxLength={2048}
              value={data.image_url}
              onChange={(e) => set("image_url", e.target.value)}
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
          onClick={onCancel}
          disabled={busy || uploading}
        >
          Cancelar
        </button>
        <button
          className="btn primary"
          type="submit"
          disabled={busy || uploading}
        >
          {busy && <LoaderCircle className="spin" size={17} />}{" "}
          {busy ? "Guardando…" : goal ? "Guardar cambios" : "Crear mi sueño"}
        </button>
      </div>
    </form>
  );
}
