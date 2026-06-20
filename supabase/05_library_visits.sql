-- =====================================================================
-- Eksekusi file ini di Supabase SQL Editor
-- Untuk menambahkan tabel library_visits
-- =====================================================================

create table if not exists public.library_visits (
  id            uuid primary key default gen_random_uuid(),
  student_nisn  text not null references public.students (nisn) on update cascade on delete cascade,
  tanggal       date not null default current_date,
  created_at    timestamptz not null default now()
);

create index if not exists idx_library_visits_tanggal on public.library_visits (tanggal);
create index if not exists idx_library_visits_student on public.library_visits (student_nisn);

alter table public.library_visits enable row level security;

drop policy if exists "allow_all_library_visits" on public.library_visits;
create policy "allow_all_library_visits" on public.library_visits
  for all to anon, authenticated
  using (true) with check (true);
