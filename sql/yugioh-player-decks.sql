-- Yu-Gi-Oh! account deck storage for CTooniverse
-- Applied to production Supabase project on 2026-11-15.
-- Re-run only in a fresh environment or after reviewing existing policy/trigger names.
-- Every authenticated player may read, create, edit and delete ONLY their own decks.

create table if not exists public.yugioh_player_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_name text not null check (char_length(btrim(deck_name)) between 1 and 80),
  main_cards bigint[] not null default '{}'::bigint[] check (cardinality(main_cards) <= 60),
  extra_cards bigint[] not null default '{}'::bigint[] check (cardinality(extra_cards) <= 15),
  side_cards bigint[] not null default '{}'::bigint[] check (cardinality(side_cards) <= 15),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists yugioh_player_decks_user_updated_idx
on public.yugioh_player_decks(user_id, updated_at desc);

alter table public.yugioh_player_decks enable row level security;
revoke all on public.yugioh_player_decks from public, anon, authenticated;
grant select, insert, update, delete on public.yugioh_player_decks to authenticated;

drop policy if exists "Players can read their own Yu-Gi-Oh decks" on public.yugioh_player_decks;
create policy "Players can read their own Yu-Gi-Oh decks"
on public.yugioh_player_decks for select to authenticated
using ((select auth.uid())=user_id);

drop policy if exists "Players can create their own Yu-Gi-Oh decks" on public.yugioh_player_decks;
create policy "Players can create their own Yu-Gi-Oh decks"
on public.yugioh_player_decks for insert to authenticated
with check ((select auth.uid())=user_id);

drop policy if exists "Players can update their own Yu-Gi-Oh decks" on public.yugioh_player_decks;
create policy "Players can update their own Yu-Gi-Oh decks"
on public.yugioh_player_decks for update to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

drop policy if exists "Players can delete their own Yu-Gi-Oh decks" on public.yugioh_player_decks;
create policy "Players can delete their own Yu-Gi-Oh decks"
on public.yugioh_player_decks for delete to authenticated
using ((select auth.uid())=user_id);

-- Invoker-security validator. Single-row array updates are atomic and will
-- reject unknown card IDs, incorrect Extra Deck placement, tokens/Skill Cards,
-- and >3 total copies across all three decks. Incomplete drafts are allowed.
create or replace function public.yugioh_validate_deck()
returns trigger language plpgsql set search_path=''
as $$
declare all_ids bigint[];
begin
  all_ids := NEW.main_cards || NEW.extra_cards || NEW.side_cards;
  if exists (
    select 1 from unnest(all_ids) as ids(card_id)
    group by ids.card_id
    having ids.card_id is null or ids.card_id <= 0 or count(*) > 3
  ) then
    raise exception 'Only 3 copies of each card are permitted across Main, Extra, and Side.'
    using errcode='23514';
  end if;
  if exists (
    select 1 from unnest(all_ids) as ids(card_id)
    left join public.yugioh_cards c on c.card_id=ids.card_id
    where c.card_id is null
  ) then
    raise exception 'One or more cards are not in the English CTooniverse catalog.'
    using errcode='23514';
  end if;
  if exists (
    select 1 from unnest(all_ids) as ids(card_id)
    join public.yugioh_cards c on c.card_id=ids.card_id
    where c.card_type in ('Skill Card','Token')
  ) then
    raise exception 'Skill Cards and Tokens cannot be added to a regular Yu-Gi-Oh deck.'
    using errcode='23514';
  end if;
  if exists (
    select 1 from unnest(NEW.main_cards) as ids(card_id)
    join public.yugioh_cards c on c.card_id=ids.card_id
    where c.card_type ~* '(Fusion|Synchro|XYZ|Link)'
  ) then
    raise exception 'Extra Deck monsters must be in the Extra Deck or Side Deck.'
    using errcode='23514';
  end if;
  if exists (
    select 1 from unnest(NEW.extra_cards) as ids(card_id)
    join public.yugioh_cards c on c.card_id=ids.card_id
    where c.card_type !~* '(Fusion|Synchro|XYZ|Link)'
  ) then
    raise exception 'Only Fusion, Synchro, Xyz, or Link monsters belong in the Extra Deck.'
    using errcode='23514';
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;
revoke all on function public.yugioh_validate_deck() from public;

drop trigger if exists yugioh_validate_deck_trigger on public.yugioh_player_decks;
create trigger yugioh_validate_deck_trigger
before insert or update of deck_name,main_cards,extra_cards,side_cards
on public.yugioh_player_decks for each row
execute function public.yugioh_validate_deck();
