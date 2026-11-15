-- Fusion Machine: owner-controlled image storage, fusion recipe metadata and catalog entry creation.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ctoon-fusions','ctoon-fusions',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp'];

drop policy if exists "Owner uploads CToon fusion artwork" on storage.objects;
create policy "Owner uploads CToon fusion artwork" on storage.objects for insert to authenticated
with check(bucket_id='ctoon-fusions'
 and name ~ '^fusions/[a-f0-9-]{36}\.(png|webp|jpg|jpeg)$'
 and exists(select 1 from public.site_owners where user_id=(select auth.uid())));
drop policy if exists "Owner deletes CToon fusion artwork" on storage.objects;
create policy "Owner deletes CToon fusion artwork" on storage.objects for delete to authenticated
using(bucket_id='ctoon-fusions' and exists(select 1 from public.site_owners where user_id=(select auth.uid())));

create table if not exists public.ctoon_fusion_recipes(
 ctoon_id uuid primary key references public.ctoon_catalog(id) on delete cascade,
 left_ctoon_id uuid references public.ctoon_catalog(id) on delete set null,
 right_ctoon_id uuid references public.ctoon_catalog(id) on delete set null,
 left_ctoon_name text not null,
 right_ctoon_name text not null,
 creator_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists ctoon_fusion_left_idx on public.ctoon_fusion_recipes(left_ctoon_id);
create index if not exists ctoon_fusion_right_idx on public.ctoon_fusion_recipes(right_ctoon_id);
alter table public.ctoon_fusion_recipes enable row level security;
revoke all on public.ctoon_fusion_recipes from public,anon,authenticated;
grant select on public.ctoon_fusion_recipes to anon,authenticated;
drop policy if exists "Public can see fusion recipes" on public.ctoon_fusion_recipes;
create policy "Public can see fusion recipes" on public.ctoon_fusion_recipes
for select to anon,authenticated using(true);

CREATE OR REPLACE FUNCTION public.owner_create_ctoon_fusion(p_left_ctoon uuid, p_right_ctoon uuid, p_name text, p_image_path text, p_rarity text, p_price_coins integer, p_series text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_me uuid:=auth.uid();
 v_left public.ctoon_catalog%rowtype;
 v_right public.ctoon_catalog%rowtype;
 v_category text;
 v_new uuid;
 v_object_name text;
 v_prefix constant text:='https://hsxdyxdazsdmpucyhqly.supabase.co/storage/v1/object/public/ctoon-fusions/';
begin
 if v_me is null or not exists(select 1 from public.site_owners where user_id=v_me) then
  raise exception 'Only the verified CTooniverse owner can use the Fusion Machine'; end if;
 if p_left_ctoon is null or p_right_ctoon is null or p_left_ctoon=p_right_ctoon then
  raise exception 'Choose two different CToons to fuse'; end if;
 select * into v_left from public.ctoon_catalog where id=p_left_ctoon;
 if not found then raise exception 'First fusion source no longer exists'; end if;
 select * into v_right from public.ctoon_catalog where id=p_right_ctoon;
 if not found then raise exception 'Second fusion source no longer exists'; end if;
 if char_length(btrim(coalesce(p_name,''))) not between 1 and 90 then
  raise exception 'Fusion name must contain 1–90 characters'; end if;
 if p_rarity is null or p_rarity not in ('Common','Uncommon','Rare','Epic','Legendary') then
  raise exception 'Choose a valid rarity'; end if;
 if p_price_coins is null or p_price_coins not between 0 and 1000000 then
  raise exception 'Coin price must be between 0 and 1,000,000'; end if;
 select category into v_category from public.ctoon_series where name=p_series limit 1;
 if v_category is null then raise exception 'Choose a registered CToon subseries'; end if;
 if exists(select 1 from public.ctoon_catalog
   where lower(btrim(name))=lower(btrim(p_name)) and lower(btrim(series))=lower(btrim(p_series))) then
  raise exception 'A CToon with that name already exists in the selected subseries'; end if;

 -- Require a real fusion artwork object already uploaded to the owner-restricted bucket.
 if p_image_path is null or left(p_image_path,char_length(v_prefix))<>v_prefix then
  raise exception 'Upload fusion artwork through the Fusion Machine first'; end if;
 v_object_name:=substr(p_image_path,char_length(v_prefix)+1);
 if v_object_name !~ '^fusions/[a-f0-9-]{36}\.(png|webp|jpg|jpeg)$'
   or not exists(select 1 from storage.objects
     where bucket_id='ctoon-fusions' and name=v_object_name) then
   raise exception 'Fusion artwork upload not found'; end if;

 insert into public.ctoon_catalog(name,parent_series,series,image_path,rarity,price_coins,is_for_sale)
 values(btrim(p_name),v_category,p_series,p_image_path,p_rarity,p_price_coins,false)
 returning id into v_new;
 insert into public.ctoon_fusion_recipes(ctoon_id,left_ctoon_id,right_ctoon_id,left_ctoon_name,right_ctoon_name,creator_id)
 values(v_new,v_left.id,v_right.id,v_left.name,v_right.name,v_me);
 return v_new;
end $function$

revoke all on function public.owner_create_ctoon_fusion(uuid,uuid,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.owner_create_ctoon_fusion(uuid,uuid,text,text,text,integer,text) to authenticated;
