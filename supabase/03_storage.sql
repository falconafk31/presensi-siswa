-- =====================================================================
-- Supabase Storage — bucket publik untuk logo madrasah
-- =====================================================================
-- Bucket 'assets' menyimpan logo yang di-upload dari halaman Pengaturan.
-- Dibuat publik agar logo_url bisa langsung dipakai di Dashboard & Kop Surat PDF.

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Policy: izinkan baca publik + upload/update/hapus untuk anon (OPSI A).
drop policy if exists "assets_public_read" on storage.objects;
create policy "assets_public_read" on storage.objects
  for select to public
  using (bucket_id = 'assets');

drop policy if exists "assets_anon_write" on storage.objects;
create policy "assets_anon_write" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'assets');

drop policy if exists "assets_anon_update" on storage.objects;
create policy "assets_anon_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'assets')
  with check (bucket_id = 'assets');

drop policy if exists "assets_anon_delete" on storage.objects;
create policy "assets_anon_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'assets');
