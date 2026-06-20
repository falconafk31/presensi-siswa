-- =====================================================================
-- 06_FINAL_SNAPSHOT.sql
-- Arsitektur Supabase Resmi & Aman (Clean Reset)
-- =====================================================================

-- 1. BERSIHKAN SEMUA TRIGGER LAMA YANG BIKIN ERROR
DROP TRIGGER IF EXISTS trg_sync_user_to_auth ON public.users;
DROP FUNCTION IF EXISTS sync_user_to_auth();
DROP TRIGGER IF EXISTS trg_delete_user_from_auth ON public.users;
DROP FUNCTION IF EXISTS delete_user_from_auth();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS public.handle_delete_user();

-- 2. BERSIHKAN DATA (HARD RESET)
DELETE FROM auth.identities WHERE identity_data->>'email' LIKE '%@minblora.com';
DELETE FROM auth.users WHERE email LIKE '%@minblora.com';
DELETE FROM auth.identities WHERE identity_data->>'email' LIKE '%@minblora.local';
DELETE FROM auth.users WHERE email LIKE '%@minblora.local';
TRUNCATE TABLE public.users CASCADE;

-- 3. PERBAIKI TABEL PUBLIC.USERS
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);

-- 4. BUAT TRIGGER RESMI (DARI AUTH.USERS KE PUBLIC.USERS)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
  v_nama text;
  v_role text;
  v_kelas text;
BEGIN
  -- Ambil username dari email (contoh: guru1@minblora.com -> guru1)
  v_username := split_part(NEW.email, '@', 1);

  -- Ambil metadata yang dikirim dari Frontend (saat pendaftaran)
  v_nama := COALESCE(NEW.raw_user_meta_data->>'nama', 'Pengguna Baru');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Guru');
  v_kelas := NEW.raw_user_meta_data->>'kelas';
  IF v_kelas = '' THEN v_kelas := NULL; END IF;

  INSERT INTO public.users (auth_id, username, password, nama, role, kelas)
  VALUES (
    NEW.id,
    v_username,
    '***', -- Password kini 100% diurus Supabase Auth
    v_nama, 
    v_role,
    v_kelas
  )
  ON CONFLICT (username) DO UPDATE
  SET auth_id = EXCLUDED.auth_id, nama = EXCLUDED.nama, role = EXCLUDED.role, kelas = EXCLUDED.kelas;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. TRIGGER HAPUS USER (SINKRONISASI PENGHAPUSAN)
CREATE OR REPLACE FUNCTION public.handle_delete_user() 
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.users WHERE auth_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_user();

-- =====================================================================
-- PERHATIAN: 
-- Anda WAJIB membuat akun admin pertama secara MANUAL melalui Dashboard Supabase:
-- 1. Buka Authentication > Providers > Email, matikan "Confirm email".
-- 2. Buka Authentication > Users > Add User.
-- 3. Masukkan Email: admin@minblora.com, Password: admin123
-- 4. Klik Create User.
-- 
-- Otomatis, trigger ini akan mendaftarkan 'admin' ke public.users.
-- Lalu masuk ke aplikasi Frontend untuk mengedit namanya menjadi "Administrator".
-- =====================================================================
