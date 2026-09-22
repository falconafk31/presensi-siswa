# Architecture Decision Records

Catatan keputusan arsitektur penting yang **sudah diambil** di repo ini — diringkas agar tidak perlu dibaca ulang dari CHANGELOG/commit. Format ringkas (konteks → keputusan → konsekuensi). Tambahkan entri baru bila ada keputusan besar berikutnya.

## ADR-01 — Pure SPA, PWA dilepas

- **Konteks**: PWA lama menyebabkan konflik cache ganda dan blank screen (service worker basi).
- **Keputusan**: Aplikasi menjadi SPA standar tanpa service worker; `main.js` unregister semua SW saat boot; menu profil menyediakan pembersih cache manual.
- **Konsekuensi**: Tidak bisa install/offline; stabilitas cache jauh membaik. Jangan mendaftarkan SW baru tanpa strategi update.

## ADR-02 — Supabase Auth + email virtual, profil di `public.users`

- **Konteks**: Butuh login username/password sederhana untuk operator sekolah tanpa email asli.
- **Keputusan**: Email virtual `<username>@minblora.id` untuk Supabase Auth; otorisasi dari `public.users.role`; trigger DB menyinkronkan `auth.users` → `public.users`.
- **Konsekuensi**: Reset-password via email tidak tersedia; "Confirm email" wajib mati; bootstrap admin pertama manual. Lihat `docs/authentication.md` + `docs/database.md`.

## ADR-03 — RLS strict berbasis `get_my_role()`

- **Konteks**: Semua query dari browser dengan anon key — otorisasi UI saja tidak cukup.
- **Keputusan**: RLS aktif semua tabel; baca master untuk semua authenticated; tulis per domain (Guru→absensi, Pustakawan→perpus, Admin→semua); role dibaca via fungsi `SECURITY DEFINER` anti-rekursi.
- **Konsekuensi**: Perubahan peran/akses wajib menyentuh policy SQL, bukan hanya UI.

## ADR-04 — Realtime lazy via shim, bukan bawaan

- **Konteks**: `supabase-js` selalu menginstansiasi `RealtimeClient` di constructor → chunk realtime ikut jalur kritis boot padahal hanya dipakai satu dashboard.
- **Keputusan**: Alias Vite `@supabase/realtime-js` → shim `src/lib/lazyRealtime.js`; `whenRealtimeReady()` membangun instance asli via `new` dan menggantikan `supabase.realtime`.
- **Konsekuensi**: Jangan ubah shim/alias tanpa menguji subscribe dashboard; lepas shim bila versi supabase-js baru menyediakan lazy realtime bawaan (lihat roadmap).

## ADR-05 — Chunking default Rollup, tanpa `manualChunks`

- **Konteks**: `manualChunks` object-form lama meng-hoist runtime Vue ke chunk chart → Chart.js termuat di semua halaman (flicker boot).
- **Keputusan**: Serahkan chunking ke default Rollup; lazy-load eksplisit via `import()` per fitur.
- **Konsekuensi**: Jangan menambah `manualChunks` kustom tanpa mengukur ulang bundle.

## ADR-06 — Guard binding template sebagai pengganti test (sementara)

- **Konteks**: Insiden error runtime akibat helper tak terdeklarasikan; belum ada test runner.
- **Keputusan**: `scripts/check-template-bindings.mjs` wajib lolos di `npm run build` + CI.
- **Konsekuensi**: Menutup satu kelas bug penting dengan biaya murah; bukan pengganti unit/E2E test (lihat roadmap).

## ADR-07 — Desain "calm institutional", tanpa glassmorphism

- **Konteks**: Klaim desain lama (glassmorphism/gradient) tidak sesuai implementasi dan kebutuhan operator.
- **Keputusan**: Bahasa desain = clean institusional, warna semantik exact untuk status, densitas tinggi, motion minimal.
- **Konsekuensi**: `backdrop-blur` hanya untuk keterbacaan permukaan sticky; jangan menambah dekorasi kaca/gradient.
