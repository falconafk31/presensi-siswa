# Langkah 2 — Setup Database Supabase

Jalankan keempat file SQL ini **berurutan** di **Supabase Dashboard > SQL Editor**
(buka file, copy isinya, paste, Run).

| Urut | File | Isi |
|------|------|-----|
| 1 | `01_schema.sql`  | 8 tabel + relasi + index + trigger `updated_at` |
| 2 | `02_rls.sql`     | Aktifkan RLS + policy (OPSI A: permisif untuk anon) |
| 3 | `03_storage.sql` | Bucket `assets` (publik) untuk logo + policy |
| 4 | `04_seed.sql`    | Data awal: admin, guru, siswa contoh, periode aktif |

## Setelah selesai
1. Ambil **Project URL** dan **anon public key** dari
   `Project Settings > API`, isi ke file `.env` (lihat `../.env.example`).
2. Login default: `admin / admin123` (Admin) atau `guru1 / guru123` (Guru kelas 1).
   **Ganti password setelah login pertama.**

## ⚠️ Catatan Keamanan
- App login lewat tabel `users` (username/password) memakai **anon key**, bukan
  Supabase Auth. RLS di `02_rls.sql` memakai **OPSI A** (permisif untuk anon) —
  cocok untuk MVP / jaringan internal sekolah.
- Untuk **produksi**, disarankan migrasi ke Supabase Auth dan perketat policy
  berbasis `auth.uid()` / custom claims (OPSI B, dijelaskan di komentar `02_rls.sql`).
- Password di seed disimpan plaintext untuk kemudahan demo. Untuk produksi,
  gunakan hashing (mis. `pgcrypto crypt()`/bcrypt) dan sesuaikan logika login.

## Berikutnya (Langkah 3)
Bangun halaman Login + AppLayout (sidebar/header) yang nyambung ke `stores/auth.js`.
Bilang "lanjut langkah 3".
