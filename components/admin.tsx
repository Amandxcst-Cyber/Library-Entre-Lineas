"use client";
import { useState, useMemo } from "react";
import {
  BookOpen,
  Bookmark,
  Plus,
  Gift,
  Settings2,
  ExternalLink,
  Search,
  Pencil,
  Check,
  Archive,
  Trash2,
  Undo2,
  Share2,
  LockKeyhole,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Book,
  Settings,
  Status,
  GiftGoal,
  GiftItem,
  STATUS_LABELS,
  formatPrice,
} from "@/lib/types";
import BookForm, { BookInput, api } from "./book-form";
import SettingsForm from "./settings-form";
import GiftItemsAdmin from "./gift-items-admin";
import GoalsAdmin from "./goals-admin";
import SelectField from "./select-field";
import { Cover } from "./book-card";
export default function Admin({
  initialBooks,
  initialSettings,
  initialGoals,
  initialItems,
}: {
  initialBooks: Book[];
  initialSettings: Settings;
  initialGoals: GiftGoal[];
  initialItems: GiftItem[];
}) {
  const [books, setBooks] = useState(initialBooks),
    [settings, setSettings] = useState(initialSettings),
    [tab, setTab] = useState<Status>("wishlist"),
    [query, setQuery] = useState(""),
    [formOpen, setFormOpen] = useState(false),
    [editing, setEditing] = useState<Book | null>(null),
    [settingsOpen, setSettingsOpen] = useState(false),
    [deleting, setDeleting] = useState<Book | null>(null),
    [busy, setBusy] = useState(false);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(STATUS_LABELS).map((s) => [
          s,
          books.filter((b) => b.status === s).length,
        ]),
      ),
    [books],
  );
  const filtered = books.filter(
    (b) =>
      b.status === tab &&
      `${b.title} ${b.author} ${b.saga}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function saveBook(data: BookInput) {
    const result = await api<{ book: Book }>(
      editing ? `/api/books/${editing.id}` : "/api/books",
      editing ? "PATCH" : "POST",
      data,
    );
    setBooks((b) =>
      editing
        ? b.map((x) => (x.id === result.book.id ? result.book : x))
        : [result.book, ...b],
    );
    setFormOpen(false);
    toast.success(
      editing ? "Historia actualizada." : "Una nueva historia en tu estante.",
    );
  }
  async function change(book: Book, patch: Partial<Book>, undo = true) {
    setBusy(true);
    try {
      const result = await api<{ book: Book }>(
        `/api/books/${book.id}`,
        "PATCH",
        patch,
      );
      setBooks((books) =>
        books.map((b) => (b.id === book.id ? result.book : b)),
      );
      if (patch.status) {
        toast.success(
          patch.status === "owned"
            ? "Ya es tuyo. Se fue de la wishlist a tu biblioteca."
            : patch.status === "archived"
              ? "Libro archivado."
              : "Volvió a la wishlist.",
          undo
            ? {
                action: {
                  label: "Deshacer",
                  onClick: () =>
                    void change(result.book, { status: book.status }, false),
                },
              }
            : undefined,
        );
      } else toast.success("Prioridad actualizada.");
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
      await api(`/api/books/${deleting.id}`, "DELETE");
      setBooks((b) => b.filter((x) => x.id !== deleting.id));
      setDeleting(null);
      toast.success("Libro eliminado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos eliminar.");
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(data: Settings) {
    const r = await api<{ settings: Settings }>("/api/settings", "PUT", data);
    setSettings(r.settings);
    setSettingsOpen(false);
    toast.success("Tu wishlist, un poquito más tuya.");
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/logout", "POST");
      location.assign("/login");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No pudimos cerrar la sesión.",
      );
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(location.origin + "/");
      toast.success("Link público copiado. Listo para tu bio.");
    } catch {
      toast.error("Puedes copiar el link desde Ver wishlist.");
    }
  }
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/">
            <Bookmark size={24} strokeWidth={1.5} />
            <span>
              {settings.title}
              <small>@{settings.handle} · MI ESPACIO</small>
            </span>
          </a>
          <div className="admin-header-actions">
            <a
              href="/"
              className="btn outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} /> <span>Ver wishlist</span>
            </a>
            <button
              className="icon-btn"
              onClick={() => void logout()}
              disabled={busy}
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="admin-main" id="main">
        <div className="admin-intro">
          <div>
            <p className="eyebrow">
              <LockKeyhole size={13} /> SOLO PARA TI
            </p>
            <h1>
              Tu pequeño universo,
              <br />
              <em>{settings.name}.</em>
            </h1>
            <p>Historias por llegar. Historias que ya son tuyas.</p>
          </div>
          <div className="admin-actions">
            <a className="btn outline" href="#mis-regalos">
              <Gift size={17} /> Otros regalitos
            </a>
            <a className="btn outline" href="#mis-suenos">
              <Gift size={17} /> Mis vaquitas
            </a>
            <button
              className="btn outline"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={17} /> Personalizar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={18} /> Agregar libro
            </button>
          </div>
        </div>
        <div className="admin-summary">
          <div>
            <Bookmark size={20} />
            <strong>{counts.wishlist}</strong>
            <span>Libros en mi wishlist</span>
          </div>
          <div>
            <BookOpen size={20} />
            <strong>{counts.owned}</strong>
            <span>Ya son míos</span>
          </div>
          <div className="share-admin">
            <Share2 size={19} />
            <p>Una pista para el próximo regalo</p>
            <button className="text-link" onClick={copy}>
              Copiar mi link
            </button>
          </div>
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Status)}
          className="admin-tabs"
        >
          <div className="admin-toolbar">
            <TabsList className="admin-tab-list">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="admin-tab">
                  {label}
                  <span>{counts[value]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <label className="search-field admin-search">
              <Search size={18} />
              <input
                aria-label="Buscar en mis libros"
                placeholder="Buscar en mis libros…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={200}
              />
            </label>
          </div>
          {Object.keys(STATUS_LABELS).map((status) => (
            <TabsContent value={status} key={status}>
              {filtered.length ? (
                <div className="admin-book-list">
                  {filtered.map((book) => (
                    <article className="admin-book" key={book.id}>
                      <div className="admin-cover">
                        <Cover book={book} />
                      </div>
                      <div className="admin-book-copy">
                        <p className="eyebrow">
                          {settings.genres.find((g) => g.id === book.genre)
                            ?.label || "POR DESCUBRIR"}
                        </p>
                        <h2>{book.title}</h2>
                        <p>{book.author}</p>
                        <small>
                          {formatPrice(book.price)}
                          {book.publisher ? ` · ${book.publisher}` : ""}
                        </small>
                        <div className="admin-priority">
                          <SelectField
                            label="Prioridad"
                            value={book.priority}
                            onChange={(v) => void change(book, { priority: v })}
                            options={settings.priorities.map((p) => ({
                              value: p.id,
                              label: `${p.symbol} ${p.label}`,
                            }))}
                          />
                        </div>
                      </div>
                      <div className="admin-book-actions">
                        <button
                          className="btn outline"
                          onClick={() => {
                            setEditing(book);
                            setFormOpen(true);
                          }}
                          disabled={busy}
                        >
                          <Pencil size={16} /> Editar
                        </button>
                        {book.status === "wishlist" ? (
                          <button
                            className="btn primary"
                            onClick={() =>
                              void change(book, { status: "owned" })
                            }
                            disabled={busy}
                          >
                            <Check size={17} /> Ya lo tengo
                          </button>
                        ) : (
                          <button
                            className="btn primary"
                            onClick={() =>
                              void change(book, { status: "wishlist" })
                            }
                            disabled={busy}
                          >
                            <Undo2 size={16} /> A la wishlist
                          </button>
                        )}
                        <div className="secondary-book-actions">
                          {book.status !== "archived" && (
                            <button
                              className="text-link"
                              onClick={() =>
                                void change(book, { status: "archived" })
                              }
                              disabled={busy}
                            >
                              <Archive size={15} /> Archivar
                            </button>
                          )}
                          <button
                            className="text-link delete-link"
                            onClick={() => setDeleting(book)}
                            disabled={busy}
                          >
                            <Trash2 size={15} /> Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state admin-empty">
                  <span className="empty-icon">
                    {tab === "owned" ? (
                      <BookOpen size={30} />
                    ) : tab === "archived" ? (
                      <Archive size={30} />
                    ) : (
                      <Bookmark size={30} />
                    )}
                  </span>
                  <h2>
                    {query
                      ? "Ningún libro coincide"
                      : tab === "owned"
                        ? "Las historias que se quedan"
                        : tab === "archived"
                          ? "Por ahora, ningún libro archivado"
                          : "Toda biblioteca empieza con un libro"}
                  </h2>
                  <p>
                    {query
                      ? "Prueba buscando otro título o autor."
                      : tab === "owned"
                        ? "Cuando marques “Ya lo tengo”, el libro aparecerá aquí y dejará de mostrarse en tu wishlist pública."
                        : tab === "archived"
                          ? "Aquí puedes guardar los libros que quieres dejar en pausa. Siempre pueden volver a la wishlist."
                          : "Agrega esa historia que no te sacas de la cabeza. Solo necesitas el título y el autor para empezar."}
                  </p>
                  {tab === "wishlist" && !query && (
                    <button
                      className="btn primary"
                      onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                      }}
                    >
                      <Plus size={17} /> Mi primer libro
                    </button>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        <p className="admin-privacy">
          <LockKeyhole size={14} /> Tu biblioteca y tus libros archivados son
          privados. Solo la wishlist se comparte.
        </p>
        <GoalsAdmin initialGoals={initialGoals} />
        <GiftItemsAdmin initialItems={initialItems} settings={settings} />
      </main>
      <footer className="site-footer">
        <div>
          <Bookmark size={19} />
          <span>{settings.title}</span>
        </div>
        <a href="/" className="text-link">
          Volver a la wishlist
        </a>
      </footer>
      <Dialog
        open={formOpen}
        onOpenChange={(v) => {
          if (!busy) setFormOpen(v);
        }}
      >
        <DialogContent className="editor-modal">
          <DialogTitle className="serif">
            {editing ? "Editar esta historia" : "Una nueva historia"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Ajusta los detalles de tu libro."
              : "Título y autor bastan para empezar. El resto lo agregas cuando quieras."}
          </DialogDescription>
          <BookForm
            key={editing?.id || "new"}
            book={editing}
            settings={settings}
            onSave={saveBook}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="editor-modal">
          <DialogTitle className="serif">Dale tu toque</DialogTitle>
          <DialogDescription>
            El nombre, tus palabras y las categorías de tu estante.
          </DialogDescription>
          <SettingsForm
            initial={settings}
            onSave={saveSettings}
            onCancel={() => setSettingsOpen(false)}
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
              Se borrará de tu biblioteca. Si solo quieres dejarlo en pausa,
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
              {busy ? "Eliminando…" : "Eliminar libro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
