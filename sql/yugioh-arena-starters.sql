
-- CTooniverse Yu-Gi-Oh! Arena — fixed starter catalog and once-per-user starter choice.
-- Starter selection NEVER grants card inventory. Pack ownership is a separate future feature.
-- Requires the English public.yugioh_cards import (card IDs referenced by the templates).

create table if not exists public.yugioh_starter_decks (
  id text primary key check(id ~ '^[a-z][a-z0-9_-]{0,30}$'),
  deck_name text not null,
  description text not null default '',
  theme text not null default 'purple',
  hero_image_id bigint not null,
  main_cards bigint[] not null check(cardinality(main_cards)=40),
  extra_cards bigint[] not null default '{}'::bigint[] check(cardinality(extra_cards)<=15),
  side_cards bigint[] not null default '{}'::bigint[] check(cardinality(side_cards)<=15),
  published_at timestamptz not null default now()
);
alter table public.yugioh_starter_decks enable row level security;
revoke all on public.yugioh_starter_decks from PUBLIC, anon, authenticated;
grant select on public.yugioh_starter_decks to anon, authenticated;
drop policy if exists "Public can view fixed starter deck templates" on public.yugioh_starter_decks;
create policy "Public can view fixed starter deck templates"
on public.yugioh_starter_decks for select to anon, authenticated using(true);
comment on table public.yugioh_starter_decks is 'Fixed, character-inspired reference starter decks; NOT owned cards or collection entries.';

-- Each row is a published, unmodifiable reference template.
insert into public.yugioh_starter_decks(id,deck_name,description,theme,hero_image_id,main_cards,extra_cards,side_cards)
values
('joey','Joey''s Red-Eyes Starter','Red-Eyes dragons, Warriors and classic Fusion monsters.','ruby',74677422,ARRAY[74677422,74677422,30079770,58257569,53485634,53485634,67300516,66574418,66574418,93969023,93969023,88264978,85651167,423705,423705,71625222,71625222,88819587,88819587,64428736,64428736,77585513,30860696,48305365,42035044,2460565,92353449,92353449,6172122,6172122,52684508,32566831,83764719,24094653,73915051,69162969,44397496,37390589,68540059,44095762]::bigint[],ARRAY[21140872,44405066,45349196,11901678,3366982,41462083]::bigint[],ARRAY[]::bigint[]),
('kaiba','Kaiba''s Dragon Starter','Blue-Eyes White Dragon and powerful Dragon support.','azure',89631139,ARRAY[89631139,89631139,89631139,71039903,71039903,79814787,79814787,8240199,8240199,88241506,88241506,72855441,45644898,45467446,38517737,17444133,17444133,17985575,17985575,43096270,43096270,11091375,31553716,5053103,14898066,48800175,48800175,38120068,38120068,39701395,39701395,41620959,6853254,83764719,24094653,17655904,98045062,97077563,44095762,56920308]::bigint[],ARRAY[23995346,56532353,59822133,40908371,2129638]::bigint[],ARRAY[]::bigint[]),
('pegasus','Pegasus''s Toon Starter','Toon Kingdom, colorful Toon monsters and Relinquished.','gold',21296502,ARRAY[21296502,21296502,90960358,65458948,65458948,91842653,42386471,42386471,16392422,16392422,64116319,64116319,83629030,53183600,31733941,31733941,28711704,7171149,61190918,64631466,27125110,43175858,43175858,15259703,15259703,89997728,91500017,27699122,27699122,33453260,6958551,88032456,41426869,24094653,83764719,70560957,78063197,53094821,5832914,79447365]::bigint[],ARRAY[63519819,41578483,94259633]::bigint[],ARRAY[]::bigint[]),
('yugi','Yugi''s Spellcaster Starter','Dark Magician, classic Spellcasters and protective spells and traps.','violet',46986414,ARRAY[46986414,46986414,38033121,73752131,30603688,30603688,7084129,7084129,7084129,71696014,71413901,15025844,91152256,40640057,40640057,78193831,70781052,26202165,78010363,31560081,71625222,25652259,64788463,90876561,47222536,47222536,2314238,63391643,95477924,1784686,83764719,5318639,14087893,72302403,24094653,48680970,48680970,7922915,44095762,62279055]::bigint[],ARRAY[98502113,41721210,50237654,75380687]::bigint[],ARRAY[]::bigint[])
on conflict(id) do update set
  deck_name=excluded.deck_name,description=excluded.description,
  theme=excluded.theme,hero_image_id=excluded.hero_image_id,
  main_cards=excluded.main_cards,extra_cards=excluded.extra_cards,side_cards=excluded.side_cards;

-- Choice is its own entitlement row, not a collection/card row.
-- No UPDATE or DELETE grants: a logged-in player cannot change or un-choose.
create table if not exists public.yugioh_player_starter_choices (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  starter_id text not null references public.yugioh_starter_decks(id) on delete restrict,
  selected_at timestamptz not null default now()
);
alter table public.yugioh_player_starter_choices enable row level security;
revoke all on public.yugioh_player_starter_choices from PUBLIC, anon, authenticated;
grant select, insert on public.yugioh_player_starter_choices to authenticated;
drop policy if exists "Players can view their own single starter choice" on public.yugioh_player_starter_choices;
create policy "Players can view their own single starter choice"
on public.yugioh_player_starter_choices for select to authenticated
using ((select auth.uid())=user_id);
drop policy if exists "Players can claim just one starter for their account" on public.yugioh_player_starter_choices;
create policy "Players can claim just one starter for their account"
on public.yugioh_player_starter_choices for insert to authenticated
with check ((select auth.uid())=user_id);
create index if not exists yugioh_player_starter_choices_starter_idx
on public.yugioh_player_starter_choices(starter_id);
comment on table public.yugioh_player_starter_choices is
'One-time Arena choice. Never grants a card collection entry, a pack or a purchase.';
