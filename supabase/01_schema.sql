-- =====================================================================
-- Sistem Presensi MIN Blora — Skema Database (Supabase / PostgreSQL)
-- Jalankan di: Supabase Dashboard > SQL Editor
-- Urutan: 01_schema.sql -> 02_rls.sql -> 03_storage.sql -> 04_seed.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. users  (akun login: Admin / Guru, kelas = wali kelas assignment)
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,
  password    text not null,
  nama        text not null,
  role        text not null default 'Guru' check (role in ('Admin', 'Guru')),
  kelas       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. students
-- ---------------------------------------------------------------------
create table if not exists public.students (
  id              uuid primary key default gen_random_uuid(),
  nisn            text not null unique,
  nama            text not null,
  jk              text check (jk in ('L', 'P')),
  kelas           text,
  active          boolean not null default true,
  status          text not null default 'aktif'
                  check (status in ('aktif', 'lulus', 'pindah', 'keluar')),
  tanggal_masuk   date,
  tanggal_keluar  date,
  keterangan      text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_students_kelas  on public.students (kelas);
create index if not exists idx_students_status on public.students (status);

-- ---------------------------------------------------------------------
-- 3. attendance_logs  (upsert unik per siswa per tanggal)
-- ---------------------------------------------------------------------
create table if not exists public.attendance_logs (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  student_nisn  text not null references public.students (nisn) on update cascade on delete cascade,
  status        text not null check (status in ('Hadir', 'Izin', 'Sakit', 'Alfa')),
  kelas         text,
  guru_input    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (date, student_nisn)
);
create index if not exists idx_attendance_date  on public.attendance_logs (date);
create index if not exists idx_attendance_nisn  on public.attendance_logs (student_nisn);
create index if not exists idx_attendance_kelas on public.attendance_logs (kelas);

-- ---------------------------------------------------------------------
-- 4. academic_calendar  (Masuk / Libur per tanggal)
-- ---------------------------------------------------------------------
create table if not exists public.academic_calendar (
  date    date primary key,
  status  text not null default 'Masuk' check (status in ('Masuk', 'Libur'))
);

-- ---------------------------------------------------------------------
-- 5. academic_periods  (hanya satu is_active = true)
-- ---------------------------------------------------------------------
create table if not exists public.academic_periods (
  id            uuid primary key default gen_random_uuid(),
  tahun_ajaran  text not null,
  semester      text not null check (semester in ('Ganjil', 'Genap')),
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (tahun_ajaran, semester)
);

-- Jaga agar hanya satu periode aktif di seluruh sistem
create unique index if not exists idx_one_active_period
  on public.academic_periods (is_active)
  where is_active = true;

-- ---------------------------------------------------------------------
-- 6. class_history  (snapshot kelas siswa per tahun ajaran)
-- ---------------------------------------------------------------------
create table if not exists public.class_history (
  id            uuid primary key default gen_random_uuid(),
  student_nisn  text not null references public.students (nisn) on update cascade on delete cascade,
  tahun_ajaran  text not null,
  kelas         text,
  wali_kelas    text,
  status        text,
  created_at    timestamptz not null default now(),
  unique (student_nisn, tahun_ajaran)
);
create index if not exists idx_class_history_nisn on public.class_history (student_nisn);

-- ---------------------------------------------------------------------
-- 7. app_settings  (selalu satu baris, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  id                  int primary key default 1 check (id = 1),
  nama_sekolah        text,
  alamat              text,
  kepala_sekolah      text,
  nip_kepala_sekolah  text,
  logo_url            text,
  daftar_kelas        jsonb default '[]'::jsonb,
  kop_baris2          text,
  kop_baris3          text,
  kop_baris4          text,
  kop_baris5          text,
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. activity_logs  (audit trail)
-- ---------------------------------------------------------------------
create table if not exists public.activity_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.users (id) on delete set null,
  aksi           text not null,
  tabel_terkait  text,
  record_id      text,
  detail         jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists idx_activity_user on public.activity_logs (user_id);
create index if not exists idx_activity_date on public.activity_logs (created_at);

-- ---------------------------------------------------------------------
-- Trigger: auto-update updated_at pada attendance_logs
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_attendance_updated_at on public.attendance_logs;
create trigger trg_attendance_updated_at
  before update on public.attendance_logs
  for each row execute function public.set_updated_at();
