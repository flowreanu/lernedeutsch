-- =============================================================
-- ACTUALIZAREA 2: Chat + Admin/Moderatori (mute, ban)
-- Rulează O SINGURĂ DATĂ în Supabase > SQL Editor > New query > Run
-- (schema.sql de la început rămâne; acesta doar adaugă)
-- =============================================================

-- 1) Roluri și stare pe profil
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists muted_until timestamptz;
alter table public.profiles add column if not exists banned boolean not null default false;
do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('user', 'moderator', 'admin'));
exception when duplicate_object then null; end $$;

-- Adminul principal
update public.profiles set role = 'admin'
 where id in (select id from auth.users where lower(email) = 'andreitufaru@proton.me');

-- La înregistrare: dacă e adresa adminului, primește automat rolul de admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    case when lower(new.email) = 'andreitufaru@proton.me' then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- 2) Utilizatorii NU își pot modifica singuri rolul, mute-ul sau ban-ul
revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name, xp, streak, last_active) on public.profiles to authenticated;

-- 3) Funcții ajutătoare
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'user')
$$;
create or replace function public.is_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned from profiles where id = auth.uid()), false)
$$;
create or replace function public.can_chat() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not banned and (muted_until is null or muted_until < now()) from profiles where id = auth.uid()), false)
$$;

-- 4) Chat
create table if not exists public.chat_messages (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
drop policy if exists "chat read" on public.chat_messages;
create policy "chat read" on public.chat_messages for select to authenticated using (true);
drop policy if exists "chat send" on public.chat_messages;
create policy "chat send" on public.chat_messages for insert to authenticated
  with check (user_id = auth.uid() and public.can_chat());
drop policy if exists "chat delete staff" on public.chat_messages;
create policy "chat delete staff" on public.chat_messages for delete to authenticated
  using (public.my_role() in ('admin', 'moderator'));
do $$ begin
  begin alter publication supabase_realtime add table public.chat_messages; exception when others then null; end;
end $$;

-- 5) Moderare (verificată pe server)
-- Mute 5 / 15 / 30 minute — admin sau moderator
create or replace function public.mod_mute(p_user uuid, p_minutes int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  me text := public.my_role();
  target text;
  until timestamptz;
begin
  if me not in ('admin', 'moderator') then raise exception 'Nu ai drepturi de moderare.'; end if;
  if p_minutes not in (5, 15, 30) then raise exception 'Durata poate fi 5, 15 sau 30 de minute.'; end if;
  if p_user = auth.uid() then raise exception 'Nu îți poți da mute singur.'; end if;
  select role into target from profiles where id = p_user;
  if target is null then raise exception 'Utilizator inexistent.'; end if;
  if target = 'admin' then raise exception 'Adminul nu poate primi mute.'; end if;
  if me = 'moderator' and target = 'moderator' then raise exception 'Un moderator nu poate da mute altui moderator.'; end if;
  until := now() + make_interval(mins => p_minutes);
  update profiles set muted_until = until where id = p_user;
  return until;
end $$;

create or replace function public.mod_unmute(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() not in ('admin', 'moderator') then raise exception 'Nu ai drepturi de moderare.'; end if;
  update profiles set muted_until = null where id = p_user;
end $$;

-- Ban / unban — doar admin
create or replace function public.admin_ban(p_user uuid, p_ban boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'Doar adminul poate bana.'; end if;
  if p_user = auth.uid() then raise exception 'Nu te poți bana singur.'; end if;
  if (select role from profiles where id = p_user) = 'admin' then raise exception 'Nu poți bana un admin.'; end if;
  update profiles set banned = p_ban, role = case when p_ban then 'user' else role end where id = p_user;
end $$;

-- Numire / revocare moderator — doar admin
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'Doar adminul poate numi moderatori.'; end if;
  if p_role not in ('user', 'moderator') then raise exception 'Rol invalid.'; end if;
  if p_user = auth.uid() then raise exception 'Nu îți poți schimba propriul rol.'; end if;
  if (select role from profiles where id = p_user) = 'admin' then raise exception 'Nu poți schimba rolul unui admin.'; end if;
  update profiles set role = p_role where id = p_user;
end $$;

grant execute on function public.mod_mute(uuid, int), public.mod_unmute(uuid), public.admin_ban(uuid, boolean), public.admin_set_role(uuid, text) to authenticated;

-- 6) Utilizatorii banați nu pot crea/intra în jocuri sau grupuri
drop policy if exists "games insert" on public.games;
create policy "games insert" on public.games for insert to authenticated with check (host = auth.uid() and not public.is_banned());
drop policy if exists "moves insert" on public.game_moves;
create policy "moves insert" on public.game_moves for insert to authenticated with check (user_id = auth.uid() and not public.is_banned());
drop policy if exists "groups insert" on public.groups;
create policy "groups insert" on public.groups for insert to authenticated with check (owner = auth.uid() and not public.is_banned());
drop policy if exists "members join" on public.group_members;
create policy "members join" on public.group_members for insert to authenticated with check (user_id = auth.uid() and not public.is_banned());

-- Verificare: cine e admin acum?
select p.display_name, u.email, p.role from public.profiles p join auth.users u on u.id = p.id where p.role <> 'user';
