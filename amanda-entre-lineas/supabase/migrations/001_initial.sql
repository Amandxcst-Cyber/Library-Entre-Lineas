begin;

create table public.app_owner (
  id integer primary key default 1 check (id=1),
  user_id uuid not null unique references auth.users(id) on delete restrict
);
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(btrim(title)) between 1 and 240),
  author text not null check(length(btrim(author)) between 1 and 240),
  cover_url text not null default '', description text not null default '',
  personal_note text not null default '', genre text not null default '',
  priority text not null default 'interested',
  status text not null default 'wishlist' check(status in ('wishlist','owned','archived')),
  price integer check(price between 0 and 10000000),
  special_gift integer not null default 0 check(special_gift in (0,1)),
  purchase_url text not null default '',publisher text not null default '',saga text not null default '',
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index idx_books_status_created on public.books(status,created_at desc);
create table public.wishlist_settings (
  id integer primary key default 1 check(id=1),data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.gift_goals (
  id uuid primary key default gen_random_uuid(),title text not null check(length(btrim(title)) between 1 and 160),
  personal_note text not null default '',image_url text not null default '',
  target_amount integer not null check(target_amount between 1 and 10000000),
  collected_amount integer not null default 0 check(collected_amount between 0 and 10000000),
  contribution_url text not null default '',
  status text not null default 'draft' check(status in ('draft','active','completed','archived')),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index idx_gift_goals_status_created on public.gift_goals(status,created_at desc);
create table public.gift_reservations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.books(id) on delete cascade,
  token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
  visitor_hash text not null check(visitor_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'active' check(status in ('active','cancelled')),
  created_at timestamptz not null default now(),expires_at timestamptz not null
);
create index idx_gift_reservations_visitor_status_expiry on public.gift_reservations(visitor_hash,status,expires_at);

create function public.is_owner() returns boolean language sql stable security definer
set search_path=pg_catalog,public as $$
  select exists(select 1 from public.app_owner where id=1 and user_id=auth.uid());
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon,authenticated;

alter table public.app_owner enable row level security;
alter table public.books enable row level security;
alter table public.wishlist_settings enable row level security;
alter table public.gift_goals enable row level security;
alter table public.gift_reservations enable row level security;
revoke all on public.app_owner,public.books,public.wishlist_settings,public.gift_goals,public.gift_reservations from anon,authenticated;
grant select on public.app_owner to authenticated;
grant select on public.books,public.wishlist_settings,public.gift_goals to anon,authenticated;
grant insert,update,delete on public.books,public.wishlist_settings,public.gift_goals to authenticated;
create policy owner_identity on public.app_owner for select to authenticated using(user_id=auth.uid());
create policy books_read on public.books for select to anon,authenticated using(status='wishlist' or (select public.is_owner()));
create policy books_write on public.books for all to authenticated using((select public.is_owner())) with check((select public.is_owner()));
create policy settings_read on public.wishlist_settings for select to anon,authenticated using(true);
create policy settings_write on public.wishlist_settings for all to authenticated using((select public.is_owner())) with check((select public.is_owner()));
create policy goals_read on public.gift_goals for select to anon,authenticated using(status in ('active','completed') or (select public.is_owner()));
create policy goals_write on public.gift_goals for all to authenticated using((select public.is_owner())) with check((select public.is_owner()));
-- No direct API policy or grants for reservation secrets, including owner sessions.

create function public.touch_updated_at() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin new.updated_at=now();return new;end;
$$;
create trigger books_updated before update on public.books for each row execute function public.touch_updated_at();
create trigger settings_updated before update on public.wishlist_settings for each row execute function public.touch_updated_at();
create function public.complete_goal() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if new.status='active' and new.collected_amount>=new.target_amount then new.status='completed';end if;
  if new.status='active' and btrim(new.contribution_url)='' then raise exception 'An active goal needs a contribution link';end if;
  new.updated_at=now();return new;
end;
$$;
create trigger goals_complete before insert or update on public.gift_goals for each row execute function public.complete_goal();
create function public.invalidate_book_reservation() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.status<>'wishlist' then update public.gift_reservations set status='cancelled' where book_id=new.id;end if;
  return new;
end;
$$;
create trigger books_invalidate_reservation after update of status on public.books for each row execute function public.invalidate_book_reservation();

create function public.get_wishlist_books() returns setof jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select to_jsonb(b)||jsonb_build_object('reservation_expires_at',g.expires_at)
  from public.books b left join public.gift_reservations g on g.book_id=b.id and g.status='active' and g.expires_at>now()
  where b.status='wishlist' order by b.created_at desc,b.id;
$$;
create function public.gift_state(p_book_id uuid,p_token_hash text default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.gift_reservations%rowtype; active boolean;
begin
  if not exists(select 1 from public.books where id=p_book_id and status='wishlist') then raise exception using errcode='P0002',message='Este libro ya no está en la wishlist.';end if;
  select * into r from public.gift_reservations where book_id=p_book_id;
  active=coalesce(r.status='active' and r.expires_at>now(),false);
  return jsonb_build_object('reserved',active,'is_mine',active and coalesce(r.token_hash=p_token_hash,false),'expires_at',case when active then r.expires_at else null end,'hours',case when active then extract(epoch from r.expires_at-r.created_at)/3600 else null end);
end;
$$;
create function public.reserve_gift(p_book_id uuid,p_token_hash text,p_visitor_hash text,p_days integer default 7) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.gift_reservations%rowtype;
begin
  if p_days is null or p_days not in (7,14) or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_visitor_hash is null or p_visitor_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode='P4000',message='Elige una reserva de 1 o 2 semanas.';end if;
  -- Serializes the same visitor's claims across different books, then the book.
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_hash,0));
  perform id from public.books where id=p_book_id and status='wishlist' for update;
  if not found then raise exception using errcode='P0002',message='Este libro ya no está en la wishlist.';end if;
  select * into r from public.gift_reservations where book_id=p_book_id;
  if r.status='active' and r.expires_at>now() then raise exception using errcode='P4090',message='Alguien ya está preparando este regalo. Puedes elegir otra historia o volver cuando venza la reserva.';end if;
  if (select count(*) from public.gift_reservations g join public.books b on b.id=g.book_id where g.visitor_hash=p_visitor_hash and g.status='active' and g.expires_at>now() and b.status='wishlist')>=3 then raise exception using errcode='P4290',message='Puedes mantener hasta tres reservas al mismo tiempo. Cancela una o espera a que venza.';end if;
  insert into public.gift_reservations(book_id,token_hash,visitor_hash,created_at,expires_at)
  values(p_book_id,p_token_hash,p_visitor_hash,now(),now()+make_interval(days=>p_days))
  on conflict(book_id) do update set id=gen_random_uuid(),token_hash=excluded.token_hash,visitor_hash=excluded.visitor_hash,status='active',created_at=excluded.created_at,expires_at=excluded.expires_at;
  return public.gift_state(p_book_id,p_token_hash);
end;
$$;
create function public.cancel_gift(p_book_id uuid,p_token_hash text) returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode='P4030',message='Solo puedes cancelar tu propia reserva.';end if;
  -- Same book-first locking order as claims once the visitor lock is held.
  perform id from public.books where id=p_book_id and status='wishlist' for update;
  if not found then raise exception using errcode='P0002',message='Este libro ya no está en la wishlist.';end if;
  update public.gift_reservations set status='cancelled' where book_id=p_book_id and token_hash=p_token_hash and status='active' and expires_at>now();
  if not found then raise exception using errcode='P4090',message='La reserva ya cambió o venció. Actualiza la wishlist.';end if;
  return true;
end;
$$;
revoke all on function public.get_wishlist_books(),public.gift_state(uuid,text),public.reserve_gift(uuid,text,text,integer),public.cancel_gift(uuid,text) from public;
grant execute on function public.get_wishlist_books(),public.gift_state(uuid,text),public.reserve_gift(uuid,text,text,integer),public.cancel_gift(uuid,text) to anon,authenticated;
revoke all on function public.touch_updated_at(),public.complete_goal(),public.invalidate_book_reservation() from public;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('book-covers','book-covers',false,4194304,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy book_images_read on storage.objects for select to anon,authenticated using(
  bucket_id='book-covers' and (
    (select public.is_owner()) or
    exists(select 1 from public.books where cover_url='/media/'||name and status='wishlist') or
    exists(select 1 from public.gift_goals where image_url='/media/'||name and status in ('active','completed'))
  )
);
create policy book_images_insert on storage.objects for insert to authenticated with check(bucket_id='book-covers' and (select public.is_owner()));
create policy book_images_update on storage.objects for update to authenticated using(bucket_id='book-covers' and (select public.is_owner())) with check(bucket_id='book-covers' and (select public.is_owner()));
create policy book_images_delete on storage.objects for delete to authenticated using(bucket_id='book-covers' and (select public.is_owner()));
commit;
