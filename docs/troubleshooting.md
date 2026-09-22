# Troubleshooting

Masalah **nyata** yang pernah ditemukan di repo ini (dari CHANGELOG, komentar kode, dan Panduan dalam aplikasi). Setiap entri: gejala → penyebab → diagnosis → solusi → pencegahan.

## 1. Login menggantung di "Memeriksa…"

**Symptoms**: Tombol login loading selamanya (± tidak pernah selesai), terutama Chrome mobile.

**Cause**: State sesi lokal Supabase yang stale + request auth tanpa timeout.

**Diagnosis**: Tunggu ±12 detik — bila masalah ini, muncul panel "Mengalami masalah?" di bawah form.

**Solution**: Klik **Pulihkan Sesi** — membersihkan cache profil + sesi lokal Supabase + service worker lama, lalu reload halaman login. Alternatif manual: menu profil → Refresh (bila sudah sempat masuk), atau hapus site data untuk origin aplikasi di pengaturan browser.

**Prevention**: Sudah tertangani di kode (`LoginView.vue`, CHANGELOG `0.2.19`). Jangan menambah request auth tanpa timeout di alur login.

## 2. Blank screen / layar putih

**Symptoms**: Aplikasi terbuka putih kosong, kadang setelah update/deploy.

**Cause**: (a) Service worker sisa PWA lama yang sudah dilepas; (b) chunk JS lama ter-cache; (c) error runtime saat boot.

**Diagnosis**: Buka console browser — error chunk (`Failed to fetch dynamically imported module` / `ChunkLoadError`) menandakan (b); tidak ada error + SW terdaftar menandakan (a).

**Solution**: `main.js` sudah unregister semua SW saat boot dan `router.onError` me-reload saat chunk gagal dimuat — jadi **cukup reload halaman** (2× bila perlu). Bila persisten: hapus site data origin aplikasi, lalu buka ulang. Panduan yang sama ada di menu **Panduan Penggunaan**.

**Prevention**: Jangan mendaftarkan service worker baru tanpa strategi update yang jelas.

## 3. Konten tertutup bottom navigation (mobile/tablet)

**Symptoms**: Baris/konten terakhir (mis. tabel Rekap) tertutup nav bawah, terutama rentang 640–1023px atau perangkat ber-inset (iPhone).

**Cause**: Padding bawah konten tertimpa breakpoint (`sm:p-5`) sementara bottom-nav baru hilang di ≥1024px.

**Diagnosis**: Zoom/scroll — bila konten "ada tapi di bawah nav", ini masalahnya.

**Solution**: Sudah diperbaiki global — padding bawah = `calc(61px + safe-area-inset-bottom + 16px)` di satu titik (`AppLayout`), sticky save bar mengikuti offset sama (CHANGELOG `0.2.8`).

**Prevention**: Jangan mengatur padding bawah konten per-view; andalkan padding global `AppLayout`. View baru dengan elemen sticky bawah wajib memakai offset safe-area yang sama.

## 4. Filter tren dashboard terdorong keluar viewport (mobile)

**Symptoms**: Kontrol tren (mode + tanggal/bulan/tahun) terpotong; halaman bisa di-swipe horizontal.

**Cause**: Wrapper aksi `AppCard` yang `shrink-0` memaksa lebar max-content.

**Diagnosis**: Periksa di lebar ±360px — bila ada overflow-x, ini regresinya.

**Solution**: Sudah diperbaiki global (`min-w-0 flex-wrap` di `AppCard`) + layout mobile khusus per dashboard (CHANGELOG `0.2.9`).

**Prevention**: Setiap header kartu dengan kontrol > ~300px wajib menyediakan layout mobile (wrap/grid), dan diverifikasi di 360px.

## 5. Error binding template ("x is not a function")

**Symptoms**: Error runtime seperti `historyMeta is not a function` / `formatDateID is not a function` saat membuka halaman.

**Cause**: Template memanggil helper yang tidak dideklarasikan di `<script setup>` (pernah terjadi karena edit script gagal tertulis sementara edit template selamat).

**Diagnosis/Solution**: Jalankan `node scripts/check-template-bindings.mjs` — menunjuk file + nama binding yang hilang. Kelas error ini **tidak bisa lolos** karena guard otomatis di `npm run build` dan CI (CHANGELOG `0.2.5`).

**Prevention**: Jangan bypass guard; selalu `npm run build` sebelum push.

## 6. Error realtime dashboard (`channels` undefined)

**Symptoms**: Dashboard presensi error `Cannot read properties of undefined (reading 'find')` saat subscribe realtime.

**Cause**: Shim lazy realtime versi awal memakai prototype-swap sehingga field internal `RealtimeClient` asli tak terinisialisasi.

**Diagnosis**: Error muncul tepat saat dashboard mount + subscribe channel.

**Solution**: Sudah diperbaiki — shim membangun instance asli via `new` biasa lalu menggantikan `supabase.realtime` (CHANGELOG `0.2.3`).

**Prevention**: Jangan mengubah `src/lib/lazyRealtime.js` / alias Vite tanpa menguji subscribe realtime dashboard.

## 7. Refresh di URL anak → 404

**Symptoms**: Reload `/siswa`, `/rekap`, dll. menghasilkan 404 di production (di dev aman).

**Cause**: History-mode router butuh SPA fallback di hosting.

**Solution**: `vercel.json` sudah menyediakan rewrite `/(.*)` → `/index.html`. Bila pindah hosting, wajib mengonfigurasi fallback yang sama — lihat [deployment.md](deployment.md#hosting-alternatif).

## 8. Supabase/network issue (splash lama / data kosong)

**Symptoms**: Splash lama lalu masuk login; atau halaman terbuka tapi data kosong + toast error.

**Cause**: `VITE_SUPABASE_URL/ANON_KEY` salah/belum diset; project Supabase paused/jaringan lambat; RLS menolak query (policy/role).

**Diagnosis**:
1. Cek `.env` (dev) / environment Vercel (prod) — dua variable wajib ada.
2. Cek console: error 401/403 → RLS/policy; timeout → jaringan/project paused.
3. Boot timeout 5 detik (`main.js`) menjamin aplikasi tetap mount — guard mengarahkan ke login bila sesi invalid.

**Solution**: Perbaiki env (rebuild bila di produksi), aktifkan project Supabase, periksa policy RLS (lihat [database.md](database.md#row-level-security)).

## 9. Warna status kehadiran tidak konsisten

**Symptoms**: Badge/chart/segmented menampilkan hijau untuk semua status atau nuansa berbeda antar halaman.

**Cause**: Nilai warna ditulis manual per komponen, atau rule CSS komponen menimpa utilitas warna.

**Solution**: Satu-satunya source of truth adalah `ATTENDANCE_COLORS` di `designSystem.js` (Hadir `#047857`, Izin `#0369a1`, Sakit `#d97706`, Alfa `#be123c`); utilitas warna aktif segmented memakai `!important` agar menang atas rule komponen (CHANGELOG `0.2.10`, `0.2.11`).

**Prevention**: Jangan hardcode warna status di komponen baru.

## 10. Kamera QR tidak terbuka

**Symptoms**: Halaman Scan QR error / tidak meminta izin kamera.

**Cause**: Browser memblokir kamera di origin non-HTTPS (kecuali localhost); atau izin kamera ditolak; atau perangkat tanpa kamera.

**Solution**: Akses via HTTPS (Vercel otomatis HTTPS) atau `localhost`; izinkan kamera saat diminta; fallback = pencatatan kunjungan manual di Data Pengunjung.

## 11. Logo tidak tampil di splash/sidebar/PDF

**Symptoms**: Logo default/placeholder tampil padahal logo sudah diunggah (atau sebaliknya, logo lama masih tampil).

**Cause**: `logo_url` kosong/gagal upload (bucket `assets`/policy); atau cache `localStorage['app.logo_url']` basi.

**Diagnosis**: Cek Pengaturan → Identitas (apakah URL logo tersimpan); buka URL langsung di tab baru (harus bisa diakses publik).

**Solution**: Unggah ulang logo; cache diperbarui otomatis tiap `fetchSettings()`; kunjungan pertama setelah unggah memakai logo baru. Bila URL tak bisa diakses publik → periksa bucket & policy storage ([database.md](database.md#storage)).
