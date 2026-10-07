"use client";
import { useState } from "react";
import {
  Sparkles,
  Plus,
  Pencil,
  Check,
  Undo2,
  Archive,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  GiftItem,
  GiftItemInput,
  Settings,
  Status,
  GIFT_STATUS_LABELS,
  formatPrice,
} from "@/lib/types";
import GiftItemForm from "./gift-item-form";
import { GiftImage } from "./gift-items";
import { api } from "./book-form";
import SelectField from "./select-field";

export default function GiftItemsAdmin({
  initialItems,
  settings,
}: {
  initialItems: GiftItem[];
  settings: Settings;
}) {
  const [items, setItems] = useState(initialItems),
    [tab, setTab] = useState<Status>("wishlist"),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<GiftItem | null>(null),
    [deleting, setDeleting] = useState<GiftItem | null>(null),
    [busy, setBusy] = useState(false);
  async function save(data: GiftItemInput) {
    setBusy(true);
    try {
      const { item } = await api<{ item: GiftItem }>(
        editing ? `/api/gifts/${editing.id}` : "/api/gifts",
        editing ? "PATCH" : "POST",
        data,
      );
      setItems((current) =>
        editing
          ? current.map((i) => (i.id === item.id ? item : i))
          : [item, ...current],
      );
      setOpen(false);
      toast.success("Regalito guardado.");
    } finally {
      setBusy(false);
    }
  }
  async function status(item: GiftItem, next: Status, undo = true) {
    setBusy(true);
    try {
      const result = await api<{ item: GiftItem }>(
        `/api/gifts/${item.id}`,
        "PATCH",
        { status: next },
      );
      setItems((current) =>
        current.map((i) => (i.id === item.id ? result.item : i)),
      );
      toast.success(
        next === "owned"
          ? "Ya es tuyo. Dejó de aparecer en la wishlist."
          : next === "archived"
            ? "Regalito archivado."
            : "Volvió a la wishlist.",
        undo
          ? {
              action: {
                label: "Deshacer",
                onClick: () => void status(result.item, item.status, false),
              },
            }
          : undefined,
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos guardar el cambio.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/gifts/${deleting.id}`, "DELETE");
      setItems((current) => current.filter((i) => i.id !== deleting.id));
      setDeleting(null);
      toast.success("Regalito eliminado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos eliminar.");
    } finally {
      setBusy(false);
    }
  }
  const filtered = items.filter((i) => i.status === tab);
  return (
    <section
      id="mis-regalos"
      className="goals-admin"
      aria-labelledby="my-gifts-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Sparkles size={14} /> TUS OTRAS PEQUEÑAS ALEGRÍAS
          </p>
          <h2 id="my-gifts-title">Mis otros regalitos</h2>
        </div>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={17} /> Agregar regalito
        </button>
      </div>
      <p className="dream-section-intro">
        Juegos de mesa, Harry Potter, accesorios de lectura… Aquí también puedes
        marcar “Ya lo tengo” y devolver un detalle a la wishlist.
      </p>
      <div className="gift-admin-toolbar">
        <SelectField
          label="Ver regalos"
          value={tab}
          onChange={(v) => setTab(v as Status)}
          options={Object.entries(GIFT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label: `${label} (${items.filter((i) => i.status === value).length})`,
          }))}
        />
      </div>
      {filtered.length ? (
        <div className="admin-goal-list">
          {filtered.map((item) => (
            <article className="admin-goal" key={item.id}>
              <div className="goal-admin-image">
                <GiftImage item={item} />
              </div>
              <div className="admin-goal-copy">
                <p className="goal-admin-status">{item.category}</p>
                <h3>{item.title}</h3>
                <p>
                  {formatPrice(item.price)} ·{" "}
                  {
                    settings.priorities.find((p) => p.id === item.priority)
                      ?.label
                  }
                </p>
              </div>
              <div className="admin-goal-actions">
                <button
                  className="btn outline"
                  disabled={busy}
                  onClick={() => {
                    setEditing(item);
                    setOpen(true);
                  }}
                >
                  <Pencil size={16} /> Editar
                </button>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() =>
                    void status(
                      item,
                      item.status === "wishlist" ? "owned" : "wishlist",
                    )
                  }
                >
                  {item.status === "wishlist" ? (
                    <Check size={17} />
                  ) : (
                    <Undo2 size={17} />
                  )}{" "}
                  {item.status === "wishlist" ? "Ya lo tengo" : "A la wishlist"}
                </button>
                <div className="secondary-book-actions">
                  {item.status !== "archived" && (
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => void status(item, "archived")}
                    >
                      <Archive size={15} /> Archivar
                    </button>
                  )}
                  <button
                    className="text-link delete-link"
                    disabled={busy}
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state goals-empty">
          <Sparkles size={30} />
          <h3>
            {tab === "wishlist"
              ? "Ese detalle que te hace sonreír"
              : tab === "owned"
                ? "Tus pequeñas alegrías, a salvo"
                : "Los detalles en pausa"}
          </h3>
          <p>
            {tab === "wishlist"
              ? "Agrega una foto, el nombre y una nota. La categoría puede ser Harry Potter, juegos de mesa o cualquier otra que quieras."
              : "Los regalos en esta sección son privados. Puedes devolverlos a la wishlist cuando quieras."}
          </p>
          {tab === "wishlist" && (
            <button
              className="btn outline"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus size={17} /> Mi primer regalito
            </button>
          )}
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent className="editor-modal">
          <DialogTitle className="serif">
            {editing ? "Un detalle más tuyo" : "Una pequeña alegría"}
          </DialogTitle>
          <DialogDescription>
            Un juego, algo de Harry Potter o ese accesorio que llevas tiempo
            mirando.
          </DialogDescription>
          <GiftItemForm
            key={editing?.id || "new"}
            item={editing}
            settings={settings}
            onSave={save}
            onCancel={() => setOpen(false)}
            onBusyChange={setBusy}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              También se elimina su reserva. Si quieres guardarlo para después,
              puedes archivarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="danger-button"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              Eliminar regalito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
