"use client";
import { useEffect, useRef, useState } from "react";
import { Gift, Clock3, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Book } from "@/lib/types";
import { api } from "./book-form";
import SelectField from "./select-field";
type ReservationState = {
  reserved: boolean;
  is_mine: boolean;
  expires_at: string | null;
  hours: number | null;
};
function deadline(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}
export default function GiftReservation({
  book,
  kind = "book",
  onChange,
}: {
  book: Pick<Book, "id" | "title" | "reservation_expires_at"> & {
    author?: string;
  };
  kind?: "book" | "item";
  onChange: (expiry: string | null) => void;
}) {
  const [open, setOpen] = useState(false),
    [state, setState] = useState<ReservationState | null>(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const callback = useRef(onChange);
  callback.current = onChange;
  const expiry = book.reservation_expires_at;
  const targetKey = kind === "book" ? "book_id" : "gift_item_id";
  const reserved = !!expiry && Date.parse(expiry) > Date.now();
  useEffect(() => {
    if (!expiry) return;
    const timer = setTimeout(
      () => {
        callback.current(null);
        setState((current) =>
          current
            ? { ...current, reserved: false, is_mine: false, expires_at: null }
            : current,
        );
      },
      Math.max(0, Date.parse(expiry) - Date.now() + 100),
    );
    return () => clearTimeout(timer);
  }, [expiry]);
  async function refresh(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/reservations?${targetKey}=${encodeURIComponent(book.id)}`,
        { cache: "no-store", signal },
      );
      const result = (await response.json()) as ReservationState & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "No pudimos consultar esta reserva.");
      setState(result);
      callback.current(result.expires_at);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(
          e instanceof Error ? e.message : "No pudimos cargar la reserva.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [open, book.id, kind]);
  async function act(method: "POST" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const result = await api<ReservationState>(
        "/api/reservations",
        method,
        method === "POST"
          ? { [targetKey]: book.id, days }
          : { [targetKey]: book.id },
      );
      setState(result);
      callback.current(result.expires_at);
      toast.success(
        method === "POST"
          ? "Reserva lista. La sorpresa sigue contigo."
          : "Reserva cancelada. El regalo vuelve a estar disponible.",
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No pudimos guardar la reserva.";
      await refresh();
      setError(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={`btn gift-reserve-button ${reserved ? "reserved" : "outline"}`}
        onClick={() => setOpen(true)}
      >
        <Gift size={17} />
        {reserved ? "Ver reserva temporal" : "Quiero regalarlo"}
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="reservation-dialog">
          <span className="reservation-icon">
            <Gift size={31} strokeWidth={1.3} />
          </span>
          <DialogTitle className="serif">Un regalo entre líneas</DialogTitle>
          <DialogDescription>
            “{book.title}”{book.author ? ` · ${book.author}` : ""}
          </DialogDescription>
          {loading ? (
            <div className="reservation-loading" role="status">
              <LoaderCircle className="spin" size={22} /> Consultando
              disponibilidad…
            </div>
          ) : state ? (
            <>
              {state.reserved ? (
                <div
                  className={`reservation-status ${state.is_mine ? "mine" : ""}`}
                >
                  <span>
                    {state.is_mine ? <Check size={21} /> : <Clock3 size={21} />}
                  </span>
                  <div>
                    <h3>
                      {state.is_mine
                        ? "Este regalo está reservado por ti"
                        : "Alguien podría estar preparando este regalo"}
                    </h3>
                    <p>
                      La reserva vence el{" "}
                      <strong>{deadline(state.expires_at!)}</strong> (hora de
                      Chile).
                    </p>
                  </div>
                </div>
              ) : (
                <p className="reservation-intro">
                  Puedes reservar este regalo por <strong>1 o 2 semanas</strong>{" "}
                  mientras organizas tu regalo. Durante ese plazo nadie más
                  podrá reservarlo.
                </p>
              )}
              <div className="reservation-explanation">
                <p>
                  <Clock3 size={17} />
                  <span>
                    Al vencer el plazo, se libera sola, aunque hayas cerrado la
                    página.
                  </span>
                </p>
                <p>
                  <Gift size={17} />
                  <span>
                    No pedimos nombre, correo ni cuenta. Amanda no verá quién
                    reservó.
                  </span>
                </p>
                <p>
                  <RotateCcw size={17} />
                  <span>
                    Si cambias de idea, puedes cancelar desde este mismo
                    navegador y el regalo se libera altiro.
                  </span>
                </p>
              </div>
              {!state.reserved && (
                <SelectField
                  label="Tiempo para preparar tu regalo"
                  value={String(days)}
                  onChange={(value) => setDays(Number(value))}
                  options={[
                    { value: "7", label: "1 semana · 7 días" },
                    { value: "14", label: "2 semanas · 14 días" },
                  ]}
                />
              )}
              {state.is_mine ? (
                <button
                  className="btn outline full-width"
                  disabled={busy}
                  onClick={() => void act("DELETE")}
                >
                  {busy ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <RotateCcw size={17} />
                  )}{" "}
                  Cancelar mi reserva
                </button>
              ) : !state.reserved ? (
                <button
                  className="btn primary full-width"
                  disabled={busy}
                  onClick={() => void act("POST")}
                >
                  {busy ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <Gift size={17} />
                  )}{" "}
                  {busy
                    ? "Reservando…"
                    : `Reservar por ${days === 7 ? "1 semana" : "2 semanas"}`}
                </button>
              ) : (
                <button
                  className="btn outline full-width"
                  onClick={() => setOpen(false)}
                >
                  Elegir otro regalo
                </button>
              )}
              <p className="reservation-hint">
                La reserva es una intención de regalo. La compra se hace en la
                tienda que elijas.
              </p>
            </>
          ) : null}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!loading && !state && (
            <button
              className="btn outline full-width"
              onClick={() => void refresh()}
            >
              Volver a intentar
            </button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
