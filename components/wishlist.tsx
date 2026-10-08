"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Bookmark,
  Search,
  SlidersHorizontal,
  Share2,
  Heart,
  Gift,
  X,
  LockKeyhole,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Book, Settings, GiftGoal, GiftItem } from "@/lib/types";
import BookCard from "./book-card";
import { bookReferencePrice } from "@/lib/book-discovery/shared";
import GiftGoals from "./gift-goals";
import GiftItems from "./gift-items";
import SelectField from "./select-field";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
type Filters = {
  genre: string;
  priority: string;
  price: string;
  author: string;
  kind: string;
};
const clear: Filters = {
  genre: "all",
  priority: "all",
  price: "all",
  author: "all",
  kind: "all",
};
export default function Wishlist({
  settings,
  initialBooks,
  initialGoals,
  initialItems,
  goalsLoadError = false,
  itemsLoadError = false,
  loadError = false,
}: {
  settings: Settings;
  initialBooks: Book[];
  initialGoals: GiftGoal[];
  initialItems: GiftItem[];
  goalsLoadError?: boolean;
  itemsLoadError?: boolean;
  loadError?: boolean;
}) {
  const [books, setBooks] = useState(initialBooks),
    [filters, setFilters] = useState<Filters>(clear),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("priority"),
    [drawer, setDrawer] = useState(false),
    [info, setInfo] = useState(false),
    [error, setError] = useState(loadError);
  useEffect(() => {
    async function refresh() {
      try {
        const r = await fetch("/api/books", { cache: "no-store" });
        if (r.ok) {
          const data = (await r.json()) as { books: Book[] };
          setBooks(data.books);
          setError(false);
        }
      } catch {}
    }
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(visible, 60000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(timer);
    };
  }, []);
  const authors = useMemo(
    () =>
      [...new Set(books.map((b) => b.author))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [books],
  );
  const count = Object.values(filters).filter((v) => v !== "all").length;
  const filtered = useMemo(
    () =>
      books
        .filter((b) => {
          const band = settings.priceBands.find((p) => p.id === filters.price);
          return (
            `${b.title} ${b.author} ${b.saga}`
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase()) &&
            (filters.genre === "all" || b.genre === filters.genre) &&
            (filters.priority === "all" || b.priority === filters.priority) &&
            (filters.author === "all" || b.author === filters.author) &&
            (filters.kind === "all" ||
              (filters.kind === "saga" ? !!b.saga : !b.saga)) &&
            (filters.price === "all" ||
              (filters.price === "special"
                ? !!b.special_gift
                : filters.price === "unknown"
                  ? bookReferencePrice(b) === null
                  : band &&
                    bookReferencePrice(b) !== null &&
                    bookReferencePrice(b)! >= band.min &&
                    (band.max === null || bookReferencePrice(b)! <= band.max)))
          );
        })
        .sort((a, b) =>
          sort === "price"
            ? (bookReferencePrice(a) ?? Infinity) -
              (bookReferencePrice(b) ?? Infinity)
            : sort === "recent"
              ? b.created_at.localeCompare(a.created_at)
              : settings.priorities.findIndex((p) => p.id === a.priority) -
                settings.priorities.findIndex((p) => p.id === b.priority),
        ),
    [books, filters, search, sort, settings],
  );
  const set = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const fields = (
    <>
      <SelectField
        id="filter-genre"
        label="Género"
        value={filters.genre}
        onChange={(v) => set("genre", v)}
        options={[
          { value: "all", label: "Todos los géneros" },
          ...settings.genres.map((g) => ({ value: g.id, label: g.label })),
        ]}
      />
      <SelectField
        id="filter-priority"
        label="Prioridad"
        value={filters.priority}
        onChange={(v) => set("priority", v)}
        options={[
          { value: "all", label: "Todas las prioridades" },
          ...settings.priorities.map((p) => ({
            value: p.id,
            label: `${p.symbol} ${p.label}`,
          })),
        ]}
      />
      <SelectField
        id="filter-price"
        label="Presupuesto"
        value={filters.price}
        onChange={(v) => set("price", v)}
        options={[
          { value: "all", label: "Todos los precios" },
          ...settings.priceBands.map((p) => ({ value: p.id, label: p.label })),
          { value: "special", label: "Regalo especial" },
          { value: "unknown", label: "Precio por confirmar" },
        ]}
      />
      <SelectField
        id="filter-author"
        label="Autor"
        value={filters.author}
        onChange={(v) => set("author", v)}
        options={[
          { value: "all", label: "Todos los autores" },
          ...authors.map((a) => ({ value: a, label: a })),
        ]}
      />
      <SelectField
        id="filter-kind"
        label="Tipo de historia"
        value={filters.kind}
        onChange={(v) => set("kind", v)}
        options={[
          { value: "all", label: "Todos los libros" },
          { value: "standalone", label: "Independientes" },
          { value: "saga", label: "Parte de una saga" },
        ]}
      />
    </>
  );
  async function share() {
    const url = window.location.origin + "/";
    try {
      if (navigator.share)
        await navigator.share({ title: settings.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado. Una pista para el próximo regalo.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        toast.error(
          "No pudimos copiar el link. Puedes copiarlo desde tu navegador.",
        );
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    try {
      context.registerTool(
        {
          name: "search_wishlist",
          title: "Buscar en la wishlist",
          description:
            "Filtra los libros públicos por texto; devuelve títulos y autores de la wishlist visible.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 200 } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: unknown) {
            if (
              !input ||
              typeof input !== "object" ||
              !("query" in input) ||
              typeof input.query !== "string" ||
              input.query.length > 200
            )
              throw new Error(
                "Query must be a string of up to 200 characters.",
              );
            setFilters(clear);
            setSearch(input.query);
            const q = input.query.toLowerCase();
            return {
              books: books
                .filter((b) =>
                  `${b.title} ${b.author} ${b.saga}`.toLowerCase().includes(q),
                )
                .map((b) => ({ title: b.title, author: b.author })),
            };
          },
        },
        { signal: life.signal },
      );
    } catch {}
    return () => life.abort();
  }, [books]);
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="brand">
            <Bookmark size={24} strokeWidth={1.5} />
            <span>
              {settings.title}
              <small>@{settings.handle}</small>
            </span>
          </a>
          <nav aria-label="Navegación principal">
            <a href="#wishlist" className="nav-link">
              La wishlist
            </a>
            <a href="#suenos" className="nav-link">
              Vaquitas
            </a>
            <a href="#regalitos" className="nav-link">
              Otros regalitos
            </a>
            <button
              className="nav-link about-link"
              onClick={() => setInfo(true)}
            >
              Un regalo para {settings.name}
            </button>
            <button
              className="icon-btn"
              onClick={share}
              aria-label="Compartir wishlist"
            >
              <Share2 size={18} />
            </button>
          </nav>
        </div>
      </header>
      <main id="main" className="public-main">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-line" /> MI WISHLIST LITERARIA
            </span>
            <h1>
              Un libro.
              <br />
              Un próximo <em>capítulo.</em>
            </h1>
            <p className="hero-intro">{settings.intro}</p>
            <p className="hero-description">{settings.description}</p>
            <a href="#wishlist" className="btn primary">
              <BookOpen size={18} /> Explorar mi wishlist
            </a>
            <div className="hero-signature">
              Con cariño, <span>{settings.name}</span>
              <Heart size={16} strokeWidth={1.2} />
            </div>
          </div>
          <div className="hero-image">
            <img
              src="/reading-desk.webp"
              alt="Un rincón de lectura con libros, flores secas y una cinta borgoña"
              fetchPriority="high"
              width="900"
              height="1125"
            />
            <div className="image-caption">
              <span>PARA PERDERSE ENTRE PÁGINAS</span>
              <p>
                Una historia siempre
                <br />
                es un buen comienzo.
              </p>
            </div>
          </div>
        </section>
        <nav className="gift-section-nav" aria-label="Elegir tipo de regalo">
          <a href="#wishlist">
            <BookOpen size={19} />
            <span>
              Libros<small>Mi debilidad</small>
            </span>
          </a>
          <a href="#suenos">
            <Heart size={19} />
            <span>
              Vaquitas<small>Un sueño entre varias personas</small>
            </span>
          </a>
          <a href="#regalitos">
            <Sparkles size={19} />
            <span>
              Otros regalitos<small>Juegos y un poquito de magia</small>
            </span>
          </a>
        </nav>
        <section id="wishlist" className="wishlist-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HISTORIAS QUE ME ESPERAN</p>
              <h2>
                En mi radar <span className="count-badge">{books.length}</span>
              </h2>
            </div>
            <p className="section-aside">
              Un poquito de misterio.
              <br />
              Mucho por descubrir.
            </p>
          </div>
          <div className="wishlist-tools">
            <label className="search-field">
              <Search size={19} />
              <input
                aria-label="Buscar libro o autor"
                placeholder="Busca una historia, un autor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={200}
              />
              {search && (
                <button
                  className="icon-btn"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <button
              className={`btn outline filter-button ${count ? "active" : ""}`}
              onClick={() => setDrawer(true)}
            >
              <SlidersHorizontal size={18} />
              Filtros{count > 0 && <span>{count}</span>}
            </button>
            <div className="sort-field">
              <SelectField
                label="Ordenar por"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "priority", label: "Mis prioridades" },
                  { value: "price", label: "Menor precio" },
                  { value: "recent", label: "Recién agregados" },
                ]}
              />
            </div>
          </div>
          <div className="desktop-filters">{fields}</div>
          {(count > 0 || search) && (
            <div className="results-line">
              <p role="status">
                {filtered.length}{" "}
                {filtered.length === 1
                  ? "historia encontrada"
                  : "historias encontradas"}
              </p>
              <button
                className="text-link"
                onClick={() => {
                  setFilters(clear);
                  setSearch("");
                }}
              >
                Limpiar filtros <X size={14} />
              </button>
            </div>
          )}
          {error ? (
            <div className="empty-state">
              <RefreshCw size={30} />
              <h3>Esta página necesita un pequeño respiro</h3>
              <p>
                No pudimos cargar la wishlist. Vuelve a intentar en un momento.
              </p>
              <button
                className="btn outline"
                onClick={() => window.location.reload()}
              >
                Volver a intentar
              </button>
            </div>
          ) : filtered.length ? (
            <div className="books-grid">
              {filtered.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  settings={settings}
                  onReservationChange={(expires) =>
                    setBooks((current) =>
                      current.map((b) =>
                        b.id === book.id
                          ? { ...b, reservation_expires_at: expires }
                          : b,
                      ),
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <BookOpen size={34} strokeWidth={1.25} />
              </span>
              <p className="eyebrow">
                {books.length ? "SIGAMOS BUSCANDO" : "PRONTO, NUEVAS HISTORIAS"}
              </p>
              <h3>
                {books.length
                  ? "Ese capítulo aún no aparece"
                  : "El próximo capítulo se está escribiendo"}
              </h3>
              <p>
                {books.length
                  ? "Prueba otro género o un presupuesto distinto. Quizás tu regalo esté a una página de distancia."
                  : `${settings.name} está preparando su selección de libros. Vuelve por acá pronto; las buenas historias merecen su lugar.`}
              </p>
              {books.length > 0 && (
                <button
                  className="btn outline"
                  onClick={() => {
                    setFilters(clear);
                    setSearch("");
                  }}
                >
                  Ver todos los libros
                </button>
              )}
            </div>
          )}
          <div className="gift-note">
            <Gift size={23} strokeWidth={1.3} />
            <p>
              <strong>Un detalle antes de regalar</strong>Puedes reservar por 1
              o 2 semanas sin dar tus datos. Los precios son una referencia;
              fíjate en la edición indicada.
            </p>
            <button className="text-link" onClick={() => setInfo(true)}>
              Más detalles
            </button>
          </div>
        </section>
        <GiftGoals
          initialGoals={initialGoals}
          name={settings.name}
          loadError={goalsLoadError}
        />
        <GiftItems
          initialItems={initialItems}
          settings={settings}
          loadError={itemsLoadError}
        />
      </main>
      <footer className="site-footer">
        <div>
          <Bookmark size={19} />
          <span>{settings.title}</span>
        </div>
        <p>Para las historias que todavía nos faltan.</p>
        <a href="/admin" className="private-link">
          <LockKeyhole size={14} /> Mi espacio
        </a>
      </footer>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent className="filters-sheet">
          <SheetTitle className="serif">Encuentra una historia</SheetTitle>
          <SheetDescription>
            Elige según lo que te tinque o tu presupuesto.
          </SheetDescription>
          <div className="mobile-filter-fields">{fields}</div>
          <div className="filter-actions">
            <button className="btn outline" onClick={() => setFilters(clear)}>
              Limpiar
            </button>
            <SheetClose asChild>
              <button className="btn primary">
                Ver {filtered.length} libros
              </button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="gift-dialog">
          <Gift size={32} strokeWidth={1.2} />
          <DialogTitle className="serif">Un regalo que se queda</DialogTitle>
          <DialogDescription>
            Una pequeña guía para elegir un regalo para {settings.name}.
          </DialogDescription>
          <div className="gift-guide">
            <p>
              <strong>Elige la historia que te tinque.</strong> Las prioridades
              te dan una pista de cuáles me hacen más ilusión.
            </p>
            <p>
              <strong>Fíjate en la edición.</strong> Si indico una editorial o
              una saga, esa información ayuda a encontrar el libro correcto.
            </p>
            <p>
              <strong>La sorpresa sigue siendo sorpresa.</strong> No necesitas
              una cuenta ni dejar tus datos. Puedes reservar un libro o un
              regalito por 1 o 2 semanas. Si cambias de idea, cancela desde el
              mismo navegador y quedará disponible altiro; si el plazo se
              cumple, se libera solo.
            </p>
            <p>
              Si prefieres aportar a una vaquita, encontrarás la meta, lo
              reunido y su link en la sección de Vaquitas. Cada poquito suma; no
              hace falta regalar el sueño completo.
            </p>
            <p>
              Cuando un regalo llega a mis manos, sale de esta wishlist. Así
              dejamos espacio para el siguiente capítulo.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
