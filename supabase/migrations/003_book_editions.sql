begin;

-- Incremental: mantiene libros, reservas, UID de propietaria y políticas RLS.
alter table public.books
  add column isbn text not null default '' check (isbn = '' or isbn ~ '^97[89][0-9]{10}$'),
  add column edition_format text not null default '' check (length(edition_format) <= 80),
  add column publication_year integer check (publication_year between 1000 and 3000),
  add column language text not null default '' check (length(language) <= 40),
  add column translator text not null default '' check (length(translator) <= 240),
  add column page_count integer check (page_count between 1 and 100000);

notify pgrst, 'reload schema';
commit;
