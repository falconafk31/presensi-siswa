# Authentication

Seluruh autentikasi memakai **Supabase Auth** (JWT). Tidak ada sistem session buatan sendiri.

> Dokumen ini tidak memuat token, secret, key, maupun kredensial apa pun.

## Model identitas

- Login memakai **username + password**. Aplikasi mengubahnya menjadi email virtual `<username>@minblora.id` lalu memanggil `supabase.auth.signInWithPassword()` (`src/stores/auth.js`, `src/views/GuruView.vue`).
- Profil otorisasi tinggal di tabel `public.users` (kolom `auth_id` → `auth.users.id`, plus `username`, `nama`, `role`, `kelas`, `nip`).
- Sinkronisasi `auth.users` → `public.users` dilakukan trigger database (`supabase/06_final_snapshot.sql`): saat akun auth dibuat, baris profil dibuat/di-update dari metadata (`nama`, `role`, `kelas`, `nip`).
- Role yang ada: `Admin`, `Guru`, `Pustakawan`, `Guru & Pustakawan` (lihat matriks di [README](../README.md#roles--permissions)).

## Konfigurasi client

`src/lib/supabase.js`:

- `persistSession: true` — sesi disimpan di `localStorage` (key bawaan Supabase `auth.storageKey`).
- `autoRefreshToken: true` — token di-refresh otomatis oleh `supabase-js`.

## Login flow

```text
LoginView.handleLogin()
  → auth.login(username, password)
    → signInWithPassword("<username>@minblora.id", password)
    → fetchProfile(auth_id): SELECT * FROM users WHERE auth_id = ?
    → user.value = profil; cache ke localStorage['presensi.user']
  → toast "Selamat datang, <nama>"
  → router.replace(redirect || landing per role)
```

- Pesan kredensial salah diterjemahkan menjadi "Username atau password salah".
- Pembuatan akun oleh Admin memakai **secondary Supabase client** (`GuruView.vue`) supaya `signUp` tidak me-logout sesi Admin yang sedang aktif. Akun pertama (admin) dibuat manual via Supabase Dashboard — lihat [database.md](database.md#bootstrap-admin-pertama).

## Session & profile cache

- Key `presensi.user` di `localStorage` menyimpan snapshot profil terakhir (nama, role, kelas).
- Saat boot (`auth.initialize()`): profil dihidrasi **sinkron** dari cache → guard rute langsung punya role tanpa menunggu jaringan; refresh profil berjalan di background bila cache cocok dengan sesi, atau blocking bila cache kosong/user berbeda (perangkat baru).
- `supabase.auth.onAuthStateChange` didaftarkan sebelum `await` apa pun agar tidak ada event yang terlewat; fetch profil dilewati bila `auth_id` yang sama sudah termuat (mencegah fetch ganda saat `INITIAL_SESSION`/`TOKEN_REFRESHED`).

## Route guard

`src/router/index.js` (`beforeEach`) menegakkan, berurutan:

1. `requiresAuth` tanpa sesi → `/login?redirect=<tujuan>`.
2. Sudah login membuka `/login` → Pustakawan murni ke `dashboard-perpus`, lainnya ke `dashboard`.
3. `adminOnly` → butuh `isAdmin`, jika tidak kembali ke `dashboard`.
4. `perpusOnly` → butuh `canManagePerpus` (Admin/Pustakawan/Guru & Pustakawan).
5. `presensiOnly` → butuh `canManagePresensi` (Admin/Guru/Guru & Pustakawan), jika tidak ke `dashboard-perpus`.

Navigasi sidebar (`src/config/navigation.js` + filter di `AppLayout.vue`) menyembunyikan menu di luar hak role — tetapi **penegakan final ada di RLS database**, bukan di UI.

## Logout

`auth.logout()`: `supabase.auth.signOut()` → `user.value = null` → hapus `presensi.user` → redirect ke `/login`.

## Login recovery (sesi stale)

Masalah nyata yang pernah terjadi: di sebagian Chrome mobile, proses masuk bisa menggantung tanpa batas (loading "Memeriksa…" selamanya) akibat state sesi lokal yang stale.

Perilaku yang diimplementasikan (`LoginView.vue`, CHANGELOG `0.2.19`):

- `handleLogin` ber-timeout ±12 detik. Bila melewati batas, loading dihentikan dan muncul panel **"Mengalami masalah?"** dengan tombol **"Pulihkan Sesi"**.
- Alur login normal tidak berubah; panel hanya muncul setelah timeout, dan error nyata (mis. password salah) tidak memicu panel.
- "Pulihkan Sesi" melakukan, berurutan: hapus key `presensi.user` → `supabase.auth.signOut({ scope: 'local' })` (hanya sesi perangkat ini, dengan timeout per langkah ±3 detik) → unregister service worker lama bila ada → hapus blob sesi Supabase (`auth.storageKey`) sesaat sebelum reload → `window.location.reload()`.
- Token *attempt* memastikan hasil login yang datang terlambat setelah recovery ditekan akan diabaikan (anti race condition).

Secara konseptual: jika sesi lokal menjadi stale dan autentikasi tidak selesai dalam batas waktu wajar, UI menyediakan self-recovery yang membersihkan sesi lokal aplikasi secara terarah lalu me-reload halaman login.

## Batasan yang perlu diketahui

- **Email virtual bukan email asli** — fitur reset-password via email Supabase tidak dapat dipakai apa adanya; reset password dilakukan Admin (hapus + buat ulang akun, atau update via Supabase Dashboard).
- **Konfirmasi email harus dimatikan** di provider Email (karena alamat virtual tidak bisa menerima email) — lihat [database.md](database.md#bootstrap-admin-pertama).
- Otorisasi frontend (guard + filter menu) bersifat UX; keamanan data bergantung pada RLS — jangan pernah mengandalkan "menu disembunyikan" sebagai kontrol akses.
