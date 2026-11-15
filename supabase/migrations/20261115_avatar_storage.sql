-- Secure, persistent SVG avatar recipe storage. Each player may write only their own
-- row; the public directory reads only deliberately published player avatars.
-- Must run before 20261115_player_avatar_directory.sql.
create table if not exists public.player_avatars (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.player_avatars enable row level security;
-- New public tables can inherit broad default privileges; TRUNCATE/DELETE must
-- not be reachable by browser clients, since TRUNCATE bypasses row security.
revoke all on table public.player_avatars from public, anon, authenticated;
grant select on table public.player_avatars to anon;
grant select, insert, update on table public.player_avatars to authenticated;
do $policies$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='player_avatars' and policyname='avatar_public_read') then
  create policy avatar_public_read on public.player_avatars for select to anon,authenticated using (true);
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='player_avatars' and policyname='avatar_own_insert') then
  create policy avatar_own_insert on public.player_avatars for insert to authenticated with check ((select auth.uid())=user_id);
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='player_avatars' and policyname='avatar_own_update') then
  create policy avatar_own_update on public.player_avatars for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
 end if;
end
$policies$;