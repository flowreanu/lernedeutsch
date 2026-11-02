-- =============================================================
-- ACTUALIZAREA 4: Prieteni + mesaje private
-- Rulează o singură dată în Supabase > SQL Editor > New query > Run
-- =============================================================

-- 1) Prietenii (cerere → acceptată)
create table if not exists public.friendships (
  id bigserial primary key,
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
-- o singură relație pe pereche, indiferent cine a trimis cererea
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;
drop policy if exists "friends read" on public.friendships;
create policy "friends read" on public.friendships for select to authenticated
  using (auth.uid() in (requester, addressee));
drop policy if exists "friends request" on public.friendships;
create policy "friends request" on public.friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending' and not public.is_banned());
drop policy if exists "friends accept" on public.friendships;
create policy "friends accept" on public.friendships for update to authenticated
  using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "friends remove" on public.friendships;
create policy "friends remove" on public.friendships for delete to authenticated
  using (auth.uid() in (requester, addressee));
revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
     where status = 'accepted'
       and least(requester, addressee) = least(a, b)
       and greatest(requester, addressee) = greatest(a, b)
  )
$$;

-- 2) Mesaje private — doar între prieteni; cine are mute/ban nu poate trimite
create table if not exists public.private_messages (
  id bigserial primary key,
  sender uuid not null references public.profiles(id) on delete cascade,
  recipient uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists pm_pair_idx on public.private_messages (least(sender, recipient), greatest(sender, recipient), created_at desc);
create index if not exists pm_unread_idx on public.private_messages (recipient) where read_at is null;

alter table public.private_messages enable row level security;
drop policy if exists "pm read" on public.private_messages;
create policy "pm read" on public.private_messages for select to authenticated
  using (auth.uid() in (sender, recipient));
drop policy if exists "pm send" on public.private_messages;
create policy "pm send" on public.private_messages for insert to authenticated
  with check (sender = auth.uid() and public.are_friends(sender, recipient) and public.can_chat());
drop policy if exists "pm mark read" on public.private_messages;
create policy "pm mark read" on public.private_messages for update to authenticated
  using (recipient = auth.uid()) with check (recipient = auth.uid());
revoke update on public.private_messages from authenticated;
grant update (read_at) on public.private_messages to authenticated;

-- 3) Timp real
alter table public.friendships replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.friendships; exception when others then null; end;
  begin alter publication supabase_realtime add table public.private_messages; exception when others then null; end;
end $$;
