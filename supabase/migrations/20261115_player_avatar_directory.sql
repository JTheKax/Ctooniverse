-- Avatar-aware public player directory: only public display name, owner flag,
-- and explicitly saved cartoon avatar are exposed. Never include email or auth UUID.
-- The player_avatars table has RLS and is created with its owner-only write policies
-- by the avatar setup; this routine reads no additional private fields.
create or replace function public.list_ctoon_players_with_avatars()
returns table(player_name text, is_owner boolean, avatar jsonb)
language sql security definer set search_path = ''
as $function$
  select btrim(u.raw_user_meta_data->>'display_name')::text as player_name,
         exists(select 1 from public.site_owners so where so.user_id = u.id) as is_owner,
         pa.avatar
  from auth.users u
  left join public.player_avatars pa on pa.user_id = u.id
  where nullif(btrim(u.raw_user_meta_data->>'display_name'),'') is not null
  order by is_owner desc, lower(btrim(u.raw_user_meta_data->>'display_name')), u.id;
$function$;
revoke all on function public.list_ctoon_players_with_avatars() from public;
grant execute on function public.list_ctoon_players_with_avatars() to anon, authenticated;