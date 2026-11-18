-- Retire fusion creation while preserving existing fusion characters, artwork,
-- recipe history, and the separate read-only CToon Fusions gallery.
revoke all on function public.owner_create_ctoon_fusion(uuid,uuid,text,text,text,integer,text)
  from public, anon, authenticated;
drop function if exists public.owner_create_ctoon_fusion(uuid,uuid,text,text,text,integer,text);

-- Prevent new Fusion Maker artwork uploads; retain existing objects and read access.
drop policy if exists "Owner uploads CToon fusion artwork" on storage.objects;
