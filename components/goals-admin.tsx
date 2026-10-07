"use client";
import { useState } from "react";
import {
  Heart,
  Plus,
  Pencil,
  Archive,
  Trash2,
  LoaderCircle,
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
  GiftGoal,
  GoalInput,
  GOAL_STATUS_LABELS,
  GOAL_SUGGESTIONS,
} from "@/lib/types";
import GoalForm from "./goal-form";
import { GoalImage, GoalProgress } from "./gift-goals";
import { api } from "./book-form";

export default function GoalsAdmin({
  initialGoals,
}: {
  initialGoals: GiftGoal[];
}) {
  const [goals, setGoals] = useState(initialGoals),
    [suggestion, setSuggestion] = useState<
      Pick<GoalInput, "title" | "personal_note"> | undefined
    >(),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<GiftGoal | null>(null),
    [deleting, setDeleting] = useState<GiftGoal | null>(null),
    [busy, setBusy] = useState(false);
  async function save(data: GoalInput) {
    setBusy(true);
    try {
      const result = await api<{ goal: GiftGoal }>(
        editing ? `/api/goals/${editing.id}` : "/api/goals",
        editing ? "PATCH" : "POST",
        data,
      );
      setGoals((current) =>
        editing
          ? current.map((goal) =>
              goal.id === result.goal.id ? result.goal : goal,
            )
          : [result.goal, ...current],
      );
      setOpen(false);
      toast.success(
        result.goal.status === "completed"
          ? "Meta cumplida. El botón para aportar quedó cerrado."
          : "Tu sueño quedó guardado.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function archive(goal: GiftGoal) {
    setBusy(true);
    try {
      const result = await api<{ goal: GiftGoal }>(
        `/api/goals/${goal.id}`,
        "PATCH",
        { status: "archived" },
      );
      setGoals((current) =>
        current.map((g) => (g.id === goal.id ? result.goal : g)),
      );
      toast.success("Sueño archivado. Puedes volver a activarlo al editar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos archivar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/goals/${deleting.id}`, "DELETE");
      setGoals((current) => current.filter((goal) => goal.id !== deleting.id));
      setDeleting(null);
      toast.success("Sueño eliminado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos eliminar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="goals-admin"
      id="mis-suenos"
      aria-labelledby="my-dreams-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Heart size={14} /> TUS VAQUITAS LITERARIAS
          </p>
          <h2 id="my-dreams-title">Mis vaquitas</h2>
        </div>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => {
            setEditing(null);
            setSuggestion(undefined);
            setOpen(true);
          }}
        >
          <Plus size={17} /> Crear una vaquita
        </button>
      </div>
      <p className="dream-section-intro">
        Para una Kindle, una Kobo, algo de Harry Potter o el sueño que tú
        quieras. Tú eliges la meta, el link de aportes y cuándo actualizar lo
        recaudado.
      </p>
      <div
        className="goal-suggestions"
        aria-label="Ideas para crear una vaquita"
      >
        {GOAL_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            className="btn outline"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setSuggestion(s);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Vaquita para {s.label}
          </button>
        ))}
      </div>
      {goals.length ? (
        <div className="admin-goal-list">
          {goals.map((goal) => (
            <article className="admin-goal" key={goal.id}>
              <div className="goal-admin-image">
                <GoalImage goal={goal} />
              </div>
              <div className="admin-goal-copy">
                <p className="goal-admin-status">
                  {GOAL_STATUS_LABELS[goal.status]}
                </p>
                <h3>{goal.title}</h3>
                <GoalProgress goal={goal} />
              </div>
              <div className="admin-goal-actions">
                <button
                  className="btn outline"
                  disabled={busy}
                  onClick={() => {
                    setEditing(goal);
                    setOpen(true);
                  }}
                >
                  <Pencil size={16} /> Editar / actualizar total
                </button>
                <div className="secondary-book-actions">
                  {goal.status !== "archived" && (
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => void archive(goal)}
                    >
                      <Archive size={15} /> Archivar
                    </button>
                  )}
                  <button
                    className="text-link delete-link"
                    disabled={busy}
                    onClick={() => setDeleting(goal)}
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
          <Heart size={31} strokeWidth={1.2} />
          <h3>Una vaquita, muchas historias</h3>
          <p>
            Crea un deseo para tu próximo lector digital, un detalle de Harry
            Potter o una edición especial. Puedes guardarlo en borrador mientras
            preparas tu link de aportes.
          </p>
          <button
            className="btn outline"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setSuggestion(undefined);
              setOpen(true);
            }}
          >
            <Plus size={17} /> Mi primera vaquita
          </button>
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="editor-modal">
          <DialogTitle className="serif">
            {editing ? "Un poquito más cerca" : "Un sueño entre líneas"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualiza lo recaudado o los detalles de tu vaquita."
              : "Algo que te haría ilusión recibir, entre varias personas."}
          </DialogDescription>
          <GoalForm
            key={editing?.id || suggestion?.title || "new"}
            goal={editing}
            suggestion={suggestion}
            onSave={save}
            onCancel={() => setOpen(false)}
            onBusyChange={setBusy}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará el deseo y su avance de esta web. Esto no modifica ni
              devuelve aportes recibidos en tu plataforma externa. Puedes
              archivarlo para conservarlo en privado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="danger-button"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {busy ? <LoaderCircle size={16} className="spin" /> : null}{" "}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
