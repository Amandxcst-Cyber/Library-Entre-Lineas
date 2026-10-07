"use client";
import { useState } from "react";
import { Plus, X, LoaderCircle } from "lucide-react";
import { Settings } from "@/lib/types";
import { settingsSchema } from "@/lib/validation";
export default function SettingsForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Settings;
  onSave: (data: Settings) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState(structuredClone(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function text(
    key: "title" | "name" | "handle" | "intro" | "description",
    label: string,
    multiline = false,
  ) {
    return (
      <div className="field">
        <label htmlFor={`settings-${key}`}>{label}</label>
        {multiline ? (
          <textarea
            id={`settings-${key}`}
            value={data[key]}
            onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
            rows={2}
            maxLength={key === "intro" ? 240 : 500}
          />
        ) : (
          <input
            id={`settings-${key}`}
            value={data[key]}
            onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
            required
            maxLength={key === "title" ? 100 : 60}
          />
        )}
      </div>
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = settingsSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="settings-form" onSubmit={submit}>
      <div className="form-scroll">
        <div className="form-grid">
          {text("title", "Nombre de la wishlist")}
          {text("name", "Cómo quieres que te llamen")}
        </div>
        {text("handle", "Tu firma o nombre de Instagram")}
        {text("intro", "Frase de bienvenida", true)}
        {text("description", "Introducción de la wishlist", true)}
        <div className="settings-section">
          <h3>Mis prioridades</h3>
          <p className="form-help">
            De mayor a menor ilusión. Puedes cambiar el texto y el emoji.
          </p>
          {data.priorities.map((p, i) => (
            <div className="priority-edit-row" key={p.id}>
              <input
                aria-label={`Emoji de prioridad ${i + 1}`}
                value={p.symbol}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    priorities: d.priorities.map((x) =>
                      x.id === p.id ? { ...x, symbol: e.target.value } : x,
                    ),
                  }))
                }
                maxLength={12}
              />
              <input
                aria-label={`Nombre de prioridad ${i + 1}`}
                value={p.label}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    priorities: d.priorities.map((x) =>
                      x.id === p.id ? { ...x, label: e.target.value } : x,
                    ),
                  }))
                }
                required
                maxLength={80}
              />
            </div>
          ))}
        </div>
        <div className="settings-section">
          <h3>Géneros</h3>
          <div className="genre-editor">
            {data.genres.map((g) => (
              <div className="genre-edit" key={g.id}>
                <input
                  aria-label={`Género ${g.label}`}
                  value={g.label}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      genres: d.genres.map((x) =>
                        x.id === g.id ? { ...x, label: e.target.value } : x,
                      ),
                    }))
                  }
                  required
                  maxLength={80}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Quitar ${g.label}`}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      genres: d.genres.filter((x) => x.id !== g.id),
                    }))
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              setData((d) => ({
                ...d,
                genres: [
                  ...d.genres,
                  { id: `g-${crypto.randomUUID()}`, label: "Nuevo género" },
                ],
              }))
            }
            disabled={data.genres.length >= 30}
          >
            <Plus size={16} /> Agregar género
          </button>
        </div>
        <div className="settings-section">
          <h3>Presupuestos a tu medida</h3>
          <p className="form-help">
            Montos en CLP. Deja el máximo vacío si no hay límite.
          </p>
          {data.priceBands.map((band, i) => (
            <div className="band-edit" key={band.id}>
              <div className="field">
                <label htmlFor={`band-label-${i}`}>Nombre</label>
                <input
                  id={`band-label-${i}`}
                  value={band.label}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      priceBands: d.priceBands.map((b) =>
                        b.id === band.id ? { ...b, label: e.target.value } : b,
                      ),
                    }))
                  }
                  required
                  maxLength={80}
                />
              </div>
              <div className="band-amounts">
                <div className="field">
                  <label htmlFor={`band-min-${i}`}>Desde</label>
                  <input
                    id={`band-min-${i}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    required
                    value={band.min}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        priceBands: d.priceBands.map((b) =>
                          b.id === band.id
                            ? { ...b, min: Number(e.target.value) }
                            : b,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`band-max-${i}`}>Hasta</label>
                  <input
                    id={`band-max-${i}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={band.max ?? ""}
                    placeholder="Sin límite"
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        priceBands: d.priceBands.map((b) =>
                          b.id === band.id
                            ? {
                                ...b,
                                max:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : b,
                        ),
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Eliminar rango ${band.label}`}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      priceBands: d.priceBands.filter((b) => b.id !== band.id),
                    }))
                  }
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-link"
            onClick={() =>
              setData((d) => ({
                ...d,
                priceBands: [
                  ...d.priceBands,
                  {
                    id: `p-${crypto.randomUUID()}`,
                    label: "Nuevo rango",
                    min: 0,
                    max: null,
                  },
                ],
              }))
            }
            disabled={data.priceBands.length >= 12}
          >
            <Plus size={16} /> Agregar rango
          </button>
        </div>
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
          disabled={busy}
        >
          Cancelar
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy && <LoaderCircle className="spin" size={17} />}Guardar mi
          wishlist
        </button>
      </div>
    </form>
  );
}
