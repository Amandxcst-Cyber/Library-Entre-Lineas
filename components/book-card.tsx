"use client";
import { useState } from "react";
import { BookOpen, ExternalLink, Heart } from "lucide-react";
import GiftReservation from "./gift-reservation";
import { Book, Settings, formatPrice } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
export function Cover({ book }: { book: Book }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="cover">
      {book.cover_url && !broken ? (
        <img
          src={book.cover_url}
          alt={`Portada de ${book.title}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="cover-fallback">
          <BookOpen size={40} strokeWidth={1} />
          <span>Portada pendiente</span>
        </div>
      )}
    </div>
  );
}
export default function BookCard({
  book,
  settings,
  onReservationChange,
}: {
  book: Book;
  settings: Settings;
  onReservationChange: (expires: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const priority = settings.priorities.find((p) => p.id === book.priority),
    genre = settings.genres.find((g) => g.id === book.genre)?.label;
  return (
    <>
      <article className="book-card">
        <button
          className="book-cover-button"
          onClick={() => setOpen(true)}
          aria-label={`Ver ${book.title}`}
        >
          <Cover book={book} />
          <span className={`priority-label priority-${book.priority}`}>
            {priority?.symbol} {priority?.label}
          </span>
        </button>
        <div className="book-copy">
          <p className="book-genre">
            {genre || "Por descubrir"}
            {book.saga ? " · Saga" : ""}
          </p>
          <button className="book-title" onClick={() => setOpen(true)}>
            <h3>{book.title}</h3>
          </button>
          <p className="book-author">{book.author}</p>
          {book.personal_note && (
            <p className="book-note">“{book.personal_note}”</p>
          )}
          <div className="book-bottom">
            <span className="book-price">
              {book.special_gift ? "Regalo especial" : formatPrice(book.price)}
              {book.price !== null && !book.special_gift && (
                <small>aprox. · CLP</small>
              )}
            </span>
            <button
              className="icon-btn"
              onClick={() => setOpen(true)}
              aria-label={`Detalles de ${book.title}`}
            >
              <BookOpen size={19} />
            </button>
          </div>
          <GiftReservation book={book} onChange={onReservationChange} />
        </div>
      </article>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="detail-sheet">
          <div className="detail-cover">
            <Cover book={book} />
          </div>
          <div className="detail-copy">
            <p className="eyebrow">{genre || "UN NUEVO MUNDO"}</p>
            <SheetTitle className="serif detail-title">{book.title}</SheetTitle>
            <SheetDescription className="detail-author">
              {book.author}
            </SheetDescription>
            <span className="priority-label inline-priority">
              {priority?.symbol} {priority?.label}
            </span>
            {book.personal_note && (
              <div className="personal-note">
                <Heart size={18} />
                <div>
                  <h3>Por qué me tinca</h3>
                  <p>{book.personal_note}</p>
                </div>
              </div>
            )}
            {book.description && (
              <p className="detail-description">{book.description}</p>
            )}
            <dl className="book-metadata">
              <div>
                <dt>Precio aproximado</dt>
                <dd>
                  {formatPrice(book.price)}
                  {book.price !== null ? " CLP" : ""}
                </dd>
              </div>
              {book.publisher && (
                <div>
                  <dt>Editorial</dt>
                  <dd>{book.publisher}</dd>
                </div>
              )}
              {book.isbn && (
                <div>
                  <dt>ISBN de esta edición</dt>
                  <dd>{book.isbn}</dd>
                </div>
              )}
              {book.edition_format && (
                <div>
                  <dt>Formato</dt>
                  <dd>{book.edition_format}</dd>
                </div>
              )}
              {book.language && (
                <div>
                  <dt>Idioma</dt>
                  <dd>{book.language}</dd>
                </div>
              )}
              {book.translator && (
                <div>
                  <dt>Traducción</dt>
                  <dd>{book.translator}</dd>
                </div>
              )}
              {book.publication_year && (
                <div>
                  <dt>Publicación</dt>
                  <dd>{book.publication_year}</dd>
                </div>
              )}
              {book.page_count && (
                <div>
                  <dt>Páginas</dt>
                  <dd>{book.page_count}</dd>
                </div>
              )}
              <div>
                <dt>Libro</dt>
                <dd>{book.saga || "Independiente"}</dd>
              </div>
              {!!book.special_gift && (
                <div>
                  <dt>Un detalle especial</dt>
                  <dd>Regalo especial</dd>
                </div>
              )}
            </dl>
            {book.purchase_url && (
              <a
                className="btn primary full-width"
                href={book.purchase_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver dónde encontrarlo <ExternalLink size={16} />
              </a>
            )}
            <GiftReservation book={book} onChange={onReservationChange} />
            <p className="detail-hint">
              El precio es una referencia. Puedes buscarlo en tu librería
              favorita.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
