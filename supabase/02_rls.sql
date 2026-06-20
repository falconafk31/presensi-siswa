-- =====================================================================
-- Row Level Security (RLS) - STRICT MODE (PRODUCTION SECURE)
-- =====================================================================
-- Menggunakan Supabase Auth (JWT) dengan pengecekan Metadata Role.
-- Hanya yang login yang bisa mengakses. Hak spesifik dipecah berdasarkan Role.
-- =====================================================================

-- Aktifkan RLS di semua tabel
alter table public.users             enable row level security;
alter table public.students          enable row level security;
alter table public.attendance_logs   enable row level security;
alter table public.academic_calendar enable row level security;
alter table public.academic_periods  enable row level security;
alter table public.class_history     enable row level security;
alter table public.app_settings      enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.books             enable row level security;
alter table public.book_loans        enable row level security;
alter table public.library_visits    enable row level security;

-- Fungsi khusus untuk membaca role tanpa memicu Infinite Recursion (Bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$;


-- Hapus policy lama (jika ada)
do $$
declare
  t text;
  tbls text[] := array[
    'users', 'students', 'attendance_logs', 'academic_calendar',
    'academic_periods', 'class_history', 'app_settings', 'activity_logs',
    'books', 'book_loans', 'library_visits'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "allow_all_%1$s" on public.%1$I;', t);
    execute format('drop policy if exists "Select_All" on public.%1$I;', t);
    execute format('drop policy if exists "Admin_All" on public.%1$I;', t);
    execute format('drop policy if exists "Admin_All_%1$s" on public.%1$I;', t);
    execute format('drop policy if exists "Guru_Read" on public.%1$I;', t);
    execute format('drop policy if exists "Authenticated_Select" on public.%1$I;', t);
  end loop;
end $$;

-- 1. KEBIJAKAN BACA (READ/SELECT) UMUM
-- Semua user yang login boleh membaca tabel master (siswa, kalender, setting, buku)
CREATE POLICY "Authenticated_Select" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated_Select" ON public.academic_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated_Select" ON public.academic_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated_Select" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated_Select" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated_Select" ON public.users FOR SELECT TO authenticated USING (true);

-- 2. KEBIJAKAN ADMIN (AKSES PENUH)
-- Admin boleh Insert, Update, Delete di semua tabel
do $$
declare
  t text;
  tbls text[] := array[
    'users', 'students', 'attendance_logs', 'academic_calendar',
    'academic_periods', 'class_history', 'app_settings', 'activity_logs',
    'books', 'book_loans', 'library_visits'
  ];
begin
  foreach t in array tbls loop
    execute format($f$
      create policy "Admin_All_%1$s" on public.%1$I
        for all
        to authenticated
        using ( public.get_my_role() = 'Admin' )
        with check ( public.get_my_role() = 'Admin' );
    $f$, t);
  end loop;
end $$;

-- 3. KEBIJAKAN GURU (Hanya boleh kelola Absensi)
DROP POLICY IF EXISTS "Guru_Manage_Absensi" ON public.attendance_logs;
CREATE POLICY "Guru_Manage_Absensi" ON public.attendance_logs
  FOR ALL
  TO authenticated
  USING ( public.get_my_role() IN ('Guru', 'Guru & Pustakawan') );

-- 4. KEBIJAKAN PUSTAKAWAN (Kelola Perpustakaan)
DROP POLICY IF EXISTS "Perpus_Manage_Buku" ON public.books;
CREATE POLICY "Perpus_Manage_Buku" ON public.books
  FOR ALL
  TO authenticated
  USING ( public.get_my_role() IN ('Pustakawan', 'Guru & Pustakawan') );

DROP POLICY IF EXISTS "Perpus_Manage_Loans" ON public.book_loans;
CREATE POLICY "Perpus_Manage_Loans" ON public.book_loans
  FOR ALL
  TO authenticated
  USING ( public.get_my_role() IN ('Pustakawan', 'Guru & Pustakawan') );

DROP POLICY IF EXISTS "Perpus_Manage_Visits" ON public.library_visits;
CREATE POLICY "Perpus_Manage_Visits" ON public.library_visits
  FOR ALL
  TO authenticated
  USING ( public.get_my_role() IN ('Pustakawan', 'Guru & Pustakawan') );

-- Semua akses lainnya tertutup otomatis oleh RLS.
