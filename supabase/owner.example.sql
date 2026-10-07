-- Crea primero tu única cuenta desde Authentication → Users en Supabase.
-- Reemplaza el UUID de ejemplo por el User UID de esa cuenta antes de ejecutar.
insert into public.app_owner(id,user_id)
values(1,'00000000-0000-0000-0000-000000000000');
