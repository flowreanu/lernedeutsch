-- =============================================================
-- ACTUALIZAREA 3: Ștergerea mesajelor din chat, cu ierarhie
--   Admin      → poate șterge ORICE mesaj
--   Moderator  → poate șterge mesajele utilizatorilor obișnuiți și pe ale lui,
--                NU pe ale altor moderatori sau ale adminului
--   Utilizator → nu poate șterge
-- Rulează o singură dată în Supabase > SQL Editor > New query > Run
-- =============================================================

create or replace function public.can_delete_message(p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.my_role()
    when 'admin' then true
    when 'moderator' then p_author = auth.uid()
      or coalesce((select role from profiles where id = p_author), 'user') = 'user'
    else false
  end
$$;

drop policy if exists "chat delete staff" on public.chat_messages;
create policy "chat delete staff" on public.chat_messages for delete to authenticated
  using (public.can_delete_message(user_id));

-- (opțional) ștergerea tuturor mesajelor unui utilizator — doar admin
create or replace function public.admin_purge_messages(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.my_role() <> 'admin' then raise exception 'Doar adminul poate șterge toate mesajele cuiva.'; end if;
  delete from chat_messages where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.admin_purge_messages(uuid) to authenticated;
