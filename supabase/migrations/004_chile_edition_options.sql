begin;
-- Incremental: no cambia libros existentes, reservas, propietaria ni políticas RLS.
alter table public.books
  add column edition_note text not null default '' check (length(edition_note) <= 1000),
  add column edition_extras text not null default '' check (length(edition_extras) <= 1000),
  add column edition_options jsonb not null default '[]'::jsonb
    check (jsonb_typeof(edition_options) = 'array' and jsonb_array_length(edition_options) <= 5 and octet_length(edition_options::text) <= 90000);
notify pgrst, 'reload schema';
commit;
