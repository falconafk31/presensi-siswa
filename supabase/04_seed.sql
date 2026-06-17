-- =====================================================================
-- Seed Data — data awal untuk mulai mencoba aplikasi
-- GANTI password default setelah login pertama!
-- =====================================================================

-- 1. Akun login
insert into public.users (username, password, nama, role, kelas) values
  ('admin', 'admin123', 'Administrator', 'Admin', null),
  ('guru1', 'guru123',  'Siti Aminah, S.Pd', 'Guru', '1'),
  ('guru2', 'guru123',  'Ahmad Fauzi, S.Pd', 'Guru', '2')
on conflict (username) do nothing;

-- 2. Identitas madrasah
insert into public.app_settings (id, nama_sekolah, alamat, kepala_sekolah, nip_kepala_sekolah, logo_url)
values (
  1,
  'MIN Blora',
  'Jl. Pendidikan No. 1, Blora, Jawa Tengah',
  'Drs. H. Muhammad Yusuf, M.Pd',
  '19650101 199003 1 001',
  null
)
on conflict (id) do nothing;

-- 3. Periode akademik aktif
insert into public.academic_periods (tahun_ajaran, semester, is_active) values
  ('2025/2026', 'Genap', true),
  ('2025/2026', 'Ganjil', false)
on conflict (tahun_ajaran, semester) do nothing;

-- 4. Contoh siswa
insert into public.students (nisn, nama, jk, kelas, status, tanggal_masuk) values
  ('0123456701', 'Aisyah Putri',      'P', '1', 'aktif', '2025-07-15'),
  ('0123456702', 'Budi Santoso',      'L', '1', 'aktif', '2025-07-15'),
  ('0123456703', 'Citra Lestari',     'P', '1', 'aktif', '2025-07-15'),
  ('0123456704', 'Dimas Pratama',     'L', '2', 'aktif', '2024-07-15'),
  ('0123456705', 'Eka Wahyuni',       'P', '2', 'aktif', '2024-07-15')
on conflict (nisn) do nothing;

-- 5. Contoh kalender akademik (tandai satu hari Minggu sebagai Libur)
insert into public.academic_calendar (date, status) values
  ('2026-06-14', 'Libur'),
  ('2026-06-15', 'Masuk'),
  ('2026-06-16', 'Masuk')
on conflict (date) do nothing;
