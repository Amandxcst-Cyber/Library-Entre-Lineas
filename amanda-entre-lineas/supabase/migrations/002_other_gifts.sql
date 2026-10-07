begin;

create table public.gift_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(btrim(title)) between 1 and 240),
  category text not null default 'Otros detalles' check(length(btrim(category)) between 1 and 80),
  image_url text not null default '',personal_note text not null default '',
  priority text not null default 'interested',
  status text not null default 'wishlist' check(status in ('wishlist','owned','archived')),
  price integer check(price between 0 and 10000000),
  purchase_url text not null default '',
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index idx_gift_items_status_created on public.gift_items(status,created_at desc);
alter table public.gift_items enable row level security;
revoke all on public.gift_items from anon,authenticated;
grant select on public.gift_items to anon,authenticated;
grant insert,update,delete on public.gift_items to authenticated;
create policy gifts_read on public.gift_items for select to anon,authenticated using(status='wishlist' or (select public.is_owner()));
create policy gifts_write on public.gift_items for all to authenticated using((select public.is_owner())) with check((select public.is_owner()));
create trigger gift_items_updated before update on public.gift_items for each row execute function public.touch_updated_at();

-- Preserve book reservations and their receipts. Every reservation targets exactly one wish.
alter table public.gift_reservations alter column book_id drop not null;
alter table public.gift_reservations add column gift_item_id uuid unique references public.gift_items(id) on delete cascade;
alter table public.gift_reservations add constraint reservation_one_target check(num_nonnulls(book_id,gift_item_id)=1);

create function public.invalidate_item_reservation() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.status<>'wishlist' then update public.gift_reservations set status='cancelled' where gift_item_id=new.id;end if;
  return new;
end;
$$;
revoke all on function public.invalidate_item_reservation() from public;
create trigger gifts_invalidate_reservation after update of status on public.gift_items for each row execute function public.invalidate_item_reservation();

create function public.get_wishlist_gift_items() returns setof jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select to_jsonb(i)||jsonb_build_object('reservation_expires_at',g.expires_at)
  from public.gift_items i left join public.gift_reservations g on g.gift_item_id=i.id and g.status='active' and g.expires_at>now()
  where i.status='wishlist' order by i.created_at desc,i.id;
$$;

create function public.get_gift_state(p_kind text,p_item_id uuid,p_token_hash text default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.gift_reservations%rowtype; active boolean; visible boolean;
begin
  if p_kind is null or p_kind not in ('book','item') or p_item_id is null then raise exception using errcode='P4000',message='Elige un regalo válido.';end if;
  if p_kind='book' then
    select exists(select 1 from public.books where id=p_item_id and status='wishlist') into visible;
    select * into r from public.gift_reservations where book_id=p_item_id;
  else
    select exists(select 1 from public.gift_items where id=p_item_id and status='wishlist') into visible;
    select * into r from public.gift_reservations where gift_item_id=p_item_id;
  end if;
  if not visible then raise exception using errcode='P0002',message='Este regalo ya no está en la wishlist.';end if;
  active=coalesce(r.status='active' and r.expires_at>now(),false);
  return jsonb_build_object('reserved',active,'is_mine',active and coalesce(r.token_hash=p_token_hash,false),'expires_at',case when active then r.expires_at else null end,'hours',case when active then extract(epoch from r.expires_at-r.created_at)/3600 else null end);
end;
$$;

create function public.reserve_wishlist_gift(p_kind text,p_item_id uuid,p_token_hash text,p_visitor_hash text,p_days integer default 7) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.gift_reservations%rowtype;
begin
  if p_kind is null or p_kind not in ('book','item') or p_item_id is null or p_days is null or p_days not in (7,14) or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_visitor_hash is null or p_visitor_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode='P4000',message='Elige un regalo y una reserva de 1 o 2 semanas.';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_hash,0));
  if p_kind='book' then
    perform id from public.books where id=p_item_id and status='wishlist' for update;
    if not found then raise exception using errcode='P0002',message='Este libro ya no está en la wishlist.';end if;
    select * into r from public.gift_reservations where book_id=p_item_id;
  else
    perform id from public.gift_items where id=p_item_id and status='wishlist' for update;
    if not found then raise exception using errcode='P0002',message='Este regalo ya no está en la wishlist.';end if;
    select * into r from public.gift_reservations where gift_item_id=p_item_id;
  end if;
  if r.status='active' and r.expires_at>now() then raise exception using errcode='P4090',message='Alguien ya está preparando este regalo. Puedes elegir otro detalle o volver cuando venza la reserva.';end if;
  if (select count(*) from public.gift_reservations g
      left join public.books b on b.id=g.book_id left join public.gift_items i on i.id=g.gift_item_id
      where g.visitor_hash=p_visitor_hash and g.status='active' and g.expires_at>now() and (b.status='wishlist' or i.status='wishlist'))>=3
  then raise exception using errcode='P4290',message='Puedes mantener hasta tres reservas al mismo tiempo, entre libros y otros regalos. Cancela una o espera a que venza.';end if;
  if p_kind='book' then
    insert into public.gift_reservations(book_id,token_hash,visitor_hash,created_at,expires_at)
    values(p_item_id,p_token_hash,p_visitor_hash,now(),now()+make_interval(days=>p_days))
    on conflict(book_id) do update set id=gen_random_uuid(),token_hash=excluded.token_hash,visitor_hash=excluded.visitor_hash,status='active',created_at=excluded.created_at,expires_at=excluded.expires_at;
  else
    insert into public.gift_reservations(gift_item_id,token_hash,visitor_hash,created_at,expires_at)
    values(p_item_id,p_token_hash,p_visitor_hash,now(),now()+make_interval(days=>p_days))
    on conflict(gift_item_id) do update set id=gen_random_uuid(),token_hash=excluded.token_hash,visitor_hash=excluded.visitor_hash,status='active',created_at=excluded.created_at,expires_at=excluded.expires_at;
  end if;
  return public.get_gift_state(p_kind,p_item_id,p_token_hash);
end;
$$;

create function public.cancel_wishlist_gift(p_kind text,p_item_id uuid,p_token_hash text) returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if p_kind is null or p_kind not in ('book','item') or p_item_id is null then raise exception using errcode='P4000',message='Elige un regalo válido.';end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode='P4030',message='Solo puedes cancelar tu propia reserva.';end if;
  if p_kind='book' then
    perform id from public.books where id=p_item_id and status='wishlist' for update;
    if not found then raise exception using errcode='P0002',message='Este libro ya no está en la wishlist.';end if;
    update public.gift_reservations set status='cancelled' where book_id=p_item_id and token_hash=p_token_hash and status='active' and expires_at>now();
  else
    perform id from public.gift_items where id=p_item_id and status='wishlist' for update;
    if not found then raise exception using errcode='P0002',message='Este regalo ya no está en la wishlist.';end if;
    update public.gift_reservations set status='cancelled' where gift_item_id=p_item_id and token_hash=p_token_hash and status='active' and expires_at>now();
  end if;
  if not found then raise exception using errcode='P4090',message='La reserva ya cambió o venció. Actualiza la wishlist.';end if;
  return true;
end;
$$;

-- Older book-only clients keep working; every claim uses the shared limit and locking.
create or replace function public.gift_state(p_book_id uuid,p_token_hash text default null) returns jsonb language sql security definer set search_path=pg_catalog,public as $$select public.get_gift_state('book',p_book_id,p_token_hash);$$;
create or replace function public.reserve_gift(p_book_id uuid,p_token_hash text,p_visitor_hash text,p_days integer default 7) returns jsonb language sql security definer set search_path=pg_catalog,public as $$select public.reserve_wishlist_gift('book',p_book_id,p_token_hash,p_visitor_hash,p_days);$$;
create or replace function public.cancel_gift(p_book_id uuid,p_token_hash text) returns boolean language sql security definer set search_path=pg_catalog,public as $$select public.cancel_wishlist_gift('book',p_book_id,p_token_hash);$$;

revoke all on function public.get_wishlist_gift_items(),public.get_gift_state(text,uuid,text),public.reserve_wishlist_gift(text,uuid,text,text,integer),public.cancel_wishlist_gift(text,uuid,text) from public;
grant execute on function public.get_wishlist_gift_items(),public.get_gift_state(text,uuid,text),public.reserve_wishlist_gift(text,uuid,text,text,integer),public.cancel_wishlist_gift(text,uuid,text) to anon,authenticated;
create policy gift_images_read on storage.objects for select to anon,authenticated using(
  bucket_id='book-covers' and exists(select 1 from public.gift_items where image_url='/media/'||name and status='wishlist')
);
notify pgrst,'reload schema';
commit;
