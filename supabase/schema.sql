-- =============================================================
-- Germana pentru incepatori absoluti — baza de date Supabase
-- Copiază tot fișierul în Supabase > SQL Editor > New query > Run
-- =============================================================

-- 1) Profil utilizator (creat automat la înregistrare)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Elev',
  xp integer not null default 0,
  streak integer not null default 0,
  last_active date,
  game_points integer not null default 0,
  games_played integer not null default 0,
  games_won integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Progres lecții
create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  score integer not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- 3) Carduri de recapitulare (repetiție spațiată)
create table if not exists public.srs_cards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id text not null,
  ease real not null default 2.3,
  interval_days integer not null default 0,
  reps integer not null default 0,
  due date not null default current_date,
  primary key (user_id, word_id)
);

-- 4) Grupuri (colegi)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  owner uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 5) Jocul pe hartă
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host uuid not null references public.profiles(id) on delete cascade,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.game_moves (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  move jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.game_results (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  won boolean not null,
  primary key (game_id, user_id)
);

-- Rezultatul unui joc se înregistrează o singură dată per jucător,
-- citit direct din starea jocului (nu din ce trimite telefonul).
create or replace function public.record_game_result(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  st jsonb;
  idx int;
  pts int;
  best int;
begin
  select state into st from games where id = p_game;
  if st is null or st->>'status' <> 'finished' then return; end if;
  select (i - 1) into idx
    from jsonb_array_elements(st->'players') with ordinality as p(v, i)
   where p.v->>'id' = auth.uid()::text;
  if idx is null then return; end if;
  pts := coalesce((st->'scores'->>idx)::int, 0);
  select max(v::int) into best from jsonb_array_elements_text(st->'scores') as s(v);
  insert into game_results (game_id, user_id, points, won)
    values (p_game, auth.uid(), pts, pts = best)
    on conflict do nothing;
  if found then
    update profiles set
      game_points = game_points + pts,
      games_played = games_played + 1,
      games_won = games_won + case when pts = best then 1 else 0 end
     where id = auth.uid();
  end if;
end $$;

-- ------------------- Securitate (RLS) -------------------
alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.srs_cards enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.games enable row level security;
alter table public.game_moves enable row level security;
alter table public.game_results enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

drop policy if exists "progress own" on public.lesson_progress;
create policy "progress own" on public.lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "srs own" on public.srs_cards;
create policy "srs own" on public.srs_cards for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "groups read" on public.groups;
create policy "groups read" on public.groups for select to authenticated using (true);
drop policy if exists "groups insert" on public.groups;
create policy "groups insert" on public.groups for insert to authenticated with check (owner = auth.uid());
drop policy if exists "groups delete" on public.groups;
create policy "groups delete" on public.groups for delete to authenticated using (owner = auth.uid());

drop policy if exists "members read" on public.group_members;
create policy "members read" on public.group_members for select to authenticated using (true);
drop policy if exists "members join" on public.group_members;
create policy "members join" on public.group_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "members leave" on public.group_members;
create policy "members leave" on public.group_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "games read" on public.games;
create policy "games read" on public.games for select to authenticated using (true);
drop policy if exists "games insert" on public.games;
create policy "games insert" on public.games for insert to authenticated with check (host = auth.uid());
drop policy if exists "games update host" on public.games;
create policy "games update host" on public.games for update to authenticated using (host = auth.uid());

drop policy if exists "moves read" on public.game_moves;
create policy "moves read" on public.game_moves for select to authenticated using (true);
drop policy if exists "moves insert" on public.game_moves;
create policy "moves insert" on public.game_moves for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "results read" on public.game_results;
create policy "results read" on public.game_results for select to authenticated using (true);

-- Actualizări în timp real pentru joc
alter table public.games replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.games; exception when others then null; end;
  begin alter publication supabase_realtime add table public.game_moves; exception when others then null; end;
end $$;
