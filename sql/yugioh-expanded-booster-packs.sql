-- Expansion of the fictional Yu-Gi-Oh! Card Shop. 37 additional themed boosters.
-- Eight complete Archive volumes partition ALL 14,681 current English cards, including
-- collectible-only Tokens and Skill Cards; deck builder and Arena rules remain unchanged.
-- Re-run after importing new catalog rows to make newly imported cards shop-eligible.
alter table public.yugioh_shop_packs
 add column if not exists category text not null default 'Featured',
 add column if not exists sort_order integer not null default 999,
 add column if not exists pool_size integer not null default 0;

update public.yugioh_shop_packs set category='Featured',sort_order=0
 where id='duelist-essentials';
update public.yugioh_shop_packs set category='Monster Realms',sort_order=200
 where id='dragon-legends';
update public.yugioh_shop_packs set category='Monster Realms',sort_order=201
 where id='spellcaster-vault';
update public.yugioh_shop_packs set category='Legendary Series',sort_order=100
 where id='toon-theater';

-- Temporary catalog of new pack definitions; existing four packs are preserved.
create temporary table tmp_ygo_pack_defs(
 id text primary key,name text not null,description text not null,
 category text not null,theme text not null,price_coins integer not null,
 sort_order integer not null,hero_hint text not null
) on commit drop;
insert into tmp_ygo_pack_defs(id,name,description,category,theme,price_coins,sort_order,hero_hint)
values
 ('archive-vol-1', 'Card Archive • Vol. I', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'violet',300,500,''),
 ('archive-vol-2', 'Card Archive • Vol. II', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'azure',300,501,''),
 ('archive-vol-3', 'Card Archive • Vol. III', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'plum',300,502,''),
 ('archive-vol-4', 'Card Archive • Vol. IV', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'gold',300,503,''),
 ('archive-vol-5', 'Card Archive • Vol. V', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'violet',300,504,''),
 ('archive-vol-6', 'Card Archive • Vol. VI', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'azure',300,505,''),
 ('archive-vol-7', 'Card Archive • Vol. VII', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'plum',300,506,''),
 ('archive-vol-8', 'Card Archive • Vol. VIII', 'One of eight complete-catalog collections. Includes playable cards, Tokens and Skill Cards; five random cards per pack.', 'Card Archives', 'gold',300,507,''),
 ('warrior-legion', 'Warrior Legion', 'Warriors from across the Yu-Gi-Oh! universe.', 'Monster Realms', 'gold',375,202,'Marauding Captain'),
 ('mechanical-uprising', 'Mechanical Uprising', 'Machine monsters and their mechanical mayhem.', 'Monster Realms', 'azure',375,203,'Cyber Dragon'),
 ('fiendish-abyss', 'Fiendish Abyss', 'Demons and Fiend monsters from the shadows.', 'Monster Realms', 'plum',375,204,'Dark Necrofear'),
 ('graveyard-rising', 'Graveyard Rising', 'Zombie monsters and graveyard legends.', 'Monster Realms', 'plum',375,205,'Red-Eyes Zombie Dragon'),
 ('wild-kingdom', 'Wild Kingdom', 'Beasts, Beast-Warriors and Winged Beasts.', 'Monster Realms', 'gold',400,206,'Rescue Cat'),
 ('ocean-depths', 'Ocean Depths', 'Aqua, Fish and Sea Serpent monsters.', 'Monster Realms', 'azure',375,207,'Levia-Dragon - Daedalus'),
 ('prehistoric-clash', 'Prehistoric Clash', 'Dinosaur, Reptile and Wyrm monsters.', 'Monster Realms', 'gold',400,208,'Ultimate Conductor Tyranno'),
 ('insect-and-flora', 'Insect & Flora', 'Insect and Plant monsters in one wild booster.', 'Monster Realms', 'gold',375,209,'Insect Queen'),
 ('digital-circuit', 'Digital Circuit', 'Cyberse monsters straight from the network.', 'Monster Realms', 'azure',425,210,'Decode Talker'),
 ('celestial-wonders', 'Celestial Wonders', 'Fairy and Psychic monsters of other realms.', 'Monster Realms', 'violet',400,211,'The Agent of Creation - Venus'),
 ('darkness-unleashed', 'Darkness Unleashed', 'DARK-attribute monsters from the shadow realm.', 'Elemental Forces', 'plum',350,300,'Dark Armed Dragon'),
 ('radiant-dawn', 'Radiant Dawn', 'LIGHT-attribute monsters and celestial champions.', 'Elemental Forces', 'gold',350,301,'Honest'),
 ('earthbound-power', 'Earthbound Power', 'EARTH-attribute monsters from across the world.', 'Elemental Forces', 'gold',350,302,'Giant Soldier of Stone'),
 ('tidal-surge', 'Tidal Surge', 'WATER-attribute monsters from ocean and ice.', 'Elemental Forces', 'azure',350,303,'Abyss Dweller'),
 ('inferno-blaze', 'Inferno Blaze', 'FIRE-attribute monsters ready to ignite.', 'Elemental Forces', 'plum',350,304,'Blaster, Dragon Ruler of Infernos'),
 ('tempest-winds', 'Tempest Winds', 'WIND-attribute monsters from the skies.', 'Elemental Forces', 'azure',350,305,'Harpie Lady'),
 ('spellbound-secrets', 'Spellbound Secrets', 'All kinds of Spell Cards for your collection.', 'Duel Mechanics', 'violet',275,400,'Monster Reborn'),
 ('trapmasters-gambit', 'Trapmaster''s Gambit', 'Surprise foes with Trap Cards and counters.', 'Duel Mechanics', 'plum',275,401,'Mirror Force'),
 ('fusion-forge', 'Fusion Forge', 'Fusion monsters from every generation.', 'Duel Mechanics', 'gold',450,402,'Blue-Eyes Ultimate Dragon'),
 ('synchro-stars', 'Synchro Stars', 'Synchro monsters ready for stardust duels.', 'Duel Mechanics', 'azure',450,403,'Stardust Dragon'),
 ('xyz-dimension', 'Xyz Dimension', 'Xyz monsters and number-hunting legends.', 'Duel Mechanics', 'plum',450,404,'Number 39: Utopia'),
 ('link-frontier', 'Link Frontier', 'Link monsters from the digital duel age.', 'Duel Mechanics', 'azure',450,405,'Decode Talker'),
 ('pendulum-and-ritual', 'Pendulum & Ritual', 'Pendulum monsters and Ritual summons together.', 'Duel Mechanics', 'violet',425,406,'Odd-Eyes Pendulum Dragon'),
 ('blue-eyes-legacy', 'Blue-Eyes Legacy', 'Blue-Eyes dragons and their supporting cards', 'Legendary Series', 'azure',550,101,'Blue-Eyes White Dragon'),
 ('red-eyes-flames', 'Red-Eyes Flames', 'Red-Eyes dragons, warriors and support', 'Legendary Series', 'plum',550,102,'Red-Eyes Black Dragon'),
 ('dark-magician-chronicles', 'Dark Magician Chronicles', 'Magician''s circle: Dark Magician and friends', 'Legendary Series', 'violet',550,103,'Dark Magician'),
 ('heroes-unite', 'HEROes Unite', 'HERO monsters and related heroes of all eras', 'Legendary Series', 'gold',500,104,'Elemental HERO Neos'),
 ('galaxy-crusade', 'Galaxy Crusade', 'Galaxy and Photon-themed card legends', 'Legendary Series', 'azure',500,105,'Galaxy-Eyes Photon Dragon'),
 ('blackwing-squadron', 'Blackwing Squadron', 'Blackwing monsters and support cards', 'Legendary Series', 'plum',500,106,'Blackwing - Gale the Whirlwind');

insert into public.yugioh_shop_packs
 (id,name,description,category,theme,price_coins,sort_order,card_count,hero_image_id)
select d.id,d.name,d.description,d.category,d.theme,d.price_coins,d.sort_order,5,
 (select min(c.card_id) from public.yugioh_cards c)
from tmp_ygo_pack_defs d
on conflict(id) do update set
 name=excluded.name,description=excluded.description,
 category=excluded.category,theme=excluded.theme,price_coins=excluded.price_coins,
 sort_order=excluded.sort_order,card_count=5;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-1',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=0)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-2',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=1)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-3',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=2)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-4',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=3)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-5',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=4)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-6',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=5)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-7',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=6)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'archive-vol-8',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (mod(c.card_id,8)=7)
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'warrior-legion',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Warrior'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'mechanical-uprising',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Machine'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'fiendish-abyss',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Fiend'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'graveyard-rising',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Zombie'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'wild-kingdom',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Beast' or c.race = 'Beast-Warrior' or c.race = 'Winged Beast'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'ocean-depths',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Aqua' or c.race = 'Fish' or c.race = 'Sea Serpent'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'prehistoric-clash',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Dinosaur' or c.race = 'Reptile' or c.race = 'Wyrm'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'insect-and-flora',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Insect' or c.race = 'Plant'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'digital-circuit',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Cyberse'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'celestial-wonders',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.race = 'Fairy' or c.race = 'Psychic'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'darkness-unleashed',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.attribute='DARK')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'radiant-dawn',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.attribute='LIGHT')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'earthbound-power',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.attribute='EARTH')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'tidal-surge',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.attribute='WATER')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'inferno-blaze',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.attribute='FIRE')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'tempest-winds',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.attribute='WIND')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'spellbound-secrets',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type='Spell Card')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'trapmasters-gambit',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type='Trap Card')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'fusion-forge',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.card_type ilike '%Fusion%')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'synchro-stars',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.card_type ilike '%Synchro%')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'xyz-dimension',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.card_type ilike '%XYZ%')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'link-frontier',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and c.card_type ilike '%Link Monster%')
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'pendulum-and-ritual',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.card_type ilike '%Pendulum%' or c.card_type ilike '%Ritual%'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'blue-eyes-legacy',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.archetype ilike '%Blue-Eyes%' or c.name ilike '%Blue-Eyes%'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'red-eyes-flames',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.archetype ilike '%Red-Eyes%' or c.name ilike '%Red-Eyes%'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'dark-magician-chronicles',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.archetype ilike '%Dark Magician%' or c.name ilike '%Dark Magician%'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'heroes-unite',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.archetype ilike '%HERO%' or c.name ilike '%HERO%'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'galaxy-crusade',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.archetype ilike '%Galaxy%' or c.name ilike '%Galaxy%'))
on conflict do nothing;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'blackwing-squadron',c.card_id
from public.yugioh_cards c
where c.language_code='en' and (c.card_type not in ('Skill Card','Token') and (c.archetype ilike '%Blackwing%' or c.name ilike '%Blackwing%'))
on conflict do nothing;

-- Resolve a real collectible from the pack pool for each thumbnail.
update public.yugioh_shop_packs p set hero_image_id=x.card_id
from (
 select d.id,
   (select c.card_id
    from public.yugioh_shop_pack_cards pc
    join public.yugioh_cards c on c.card_id=pc.card_id
    where pc.pack_id=d.id
    order by
      case when d.hero_hint<>'' and c.name=d.hero_hint then 0 else 1 end,
      case when c.card_type in ('Token','Skill Card') then 1 else 0 end,
      c.card_id asc
    limit 1) card_id
 from tmp_ygo_pack_defs d
) x where p.id=x.id and x.card_id is not null;

-- Pack size is a real, server-calculated value, never guessed by the client.
update public.yugioh_shop_packs p set pool_size=q.n
from (select pack_id,count(*)::integer n from public.yugioh_shop_pack_cards
 group by pack_id) q where p.id=q.pack_id;

do $check$
declare v_uncovered integer;
begin
 if exists(select 1 from public.yugioh_shop_packs where is_active and pool_size<card_count) then
  raise exception 'A published pack has insufficient cards';
 end if;
 select count(*) into v_uncovered
 from public.yugioh_cards c
 where c.language_code='en'
   and not exists(select 1 from public.yugioh_shop_pack_cards pc
                  where pc.card_id=c.card_id
                    and pc.pack_id in (select p.id from public.yugioh_shop_packs p where p.is_active));
 if v_uncovered<>0 then
  raise exception '% English card catalog entries cannot be pulled from any published booster', v_uncovered;
 end if;
end
$check$;
