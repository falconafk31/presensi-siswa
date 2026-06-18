-- =====================================================================
-- Row Level Security (RLS)
-- =====================================================================
-- CATATAN PENTING soal autentikasi:
-- App ini login lewat tabel `users` (username/password) memakai anon key,
-- BUKAN Supabase Auth (auth.uid()). Artinya semua request memakai role
-- `anon`. Dua pilihan:
--
--   OPSI A (cepat untuk MVP / jaringan internal sekolah):
--     Aktifkan RLS lalu beri policy permisif untuk anon.
--     Keamanan bergantung pada kerahasiaan anon key + logika app.
--
--   OPSI B (disarankan untuk produksi):
--     Migrasikan login ke Supabase Auth, lalu ganti `true`
--     dengan cek peran berbasis auth.uid() / custom claims.
--
-- File ini mengimplementasikan OPSI A agar app langsung jalan.
-- Saat naik ke produksi, perketat policy di bawah.
-- =====================================================================

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

-- Helper: buat policy "allow all untuk anon+authenticated" pada satu tabel
do $$
declare
  t text;
  tbls text[] := array[
    'users', 'students', 'attendance_logs', 'academic_calendar',
    'academic_periods', 'class_history', 'app_settings', 'activity_logs',
    'books', 'book_loans'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "allow_all_%1$s" on public.%1$I;', t);
    execute format($f$
      create policy "allow_all_%1$s" on public.%1$I
        for all
        to anon, authenticated
        using (true)
        with check (true);
    $f$, t);
  end loop;
end $$;
