# Roadmap

Status fitur berdasarkan kondisi aktual repository (source + CHANGELOG). Tanpa estimasi tanggal — prioritas teknis didahulukan.

Legenda: ✅ Completed · 🔄 In Progress · 📋 Planned · 💡 Exploratory

## Phase 1 — Foundation ✅

Fondasi yang sudah selesai dan stabil:

- ✅ SPA Vue 3 + Vite + Tailwind + Pinia + Vue Router (lazy routes, guard role)
- ✅ Supabase Auth (email virtual) + profil `public.users` + trigger sinkronisasi
- ✅ Skema 11 tabel + RLS strict + bucket Storage `assets`
- ✅ Boot anti-kedip (splash inline, mount setelah rute siap, profil cache, timeout 5 dtk)
- ✅ Font self-host Inter Variable (tanpa CDN)
- ✅ Lazy loading: chart, jsPDF, xlsx, realtime-js (shim), route-level splitting
- ✅ Guard binding template + CI (guard + build) di setiap push/PR
- ✅ Design system institusional + token warna status exact + layout budget dashboard
- ✅ Login self-recovery "Pulihkan Sesi" (timeout 12 dtk, anti-race)
- ✅ PWA dilepas + cleanup service worker

## Phase 2 — Current Product ✅

Modul produk yang sudah tersedia dan dipakai:

**Presensi**

- ✅ Dashboard presensi (KPI, tren, komposisi, strip monitoring, realtime refresh)
- ✅ Input presensi (segmented H/I/S/A, kunci libur, kunci kelas, dirty guard)
- ✅ Rekap bulanan + semester (matriks, Hari Efektif/Libur, PDF kop resmi, Excel)
- ✅ Statistik kehadiran (ambang batas, pagination)
- ✅ Kalender akademik (lihat: Admin+Guru; kelola: Admin)
- ✅ Riwayat kelas (snapshot otomatis saat kenaikan)

**Perpustakaan**

- ✅ Beranda perpustakaan (KPI, tren, peminjaman terakhir)
- ✅ Katalog buku (CRUD, impor/ekspor Excel, riwayat peminjam)
- ✅ Sirkulasi (pinjam/kembali, status, keterlambatan)
- ✅ Kunjungan manual + Scan QR kamera (feedback suara)
- ✅ Laporan kunjungan & sirkulasi (filter periode, PDF, Excel)
- ✅ Kartu anggota (QR NISN, cetak massal)

**Administrasi**

- ✅ Data siswa (CRUD, impor Excel + template/pratinjau, status)
- ✅ Guru & akun (CRUD, 4 role, wali kelas, impor Excel, secondary client)
- ✅ Pengaturan (identitas, kop surat, logo, daftar kelas, hari libur, periode)
- ✅ Kenaikan kelas otomatis + kelulusan tingkat akhir
- ✅ Zona pemeliharaan (reset absensi/log/kunjungan/pinjaman, backup JSON)
- ✅ Log aktivitas (audit trail + filter)
- ✅ Panduan built-in per peran

## Phase 3 — Planned Improvements 📋

Pekerjaan berikutnya yang masuk akal untuk repo ini, berurutan prioritas:

1. 📋 **Sinkronkan versi `package.json`** — `0.1.0` tertinggal dari CHANGELOG (`0.2.19`); tetapkan satu sumber versi + proses bump saat rilis.
2. 📋 **Automated testing untuk alur kritis** — Vitest + Vue Test Utils: kalkulasi rekap, guard rute, helper tanggal; lalu E2E (Playwright) untuk login → input presensi → rekap.
3. 📋 **Hapus dependensi tak terpakai** — `radix-vue` dideklarasikan tapi tak pernah di-import; audit + hapus bila terbukti tidak dibutuhkan.
4. 📋 **Ketatkan Storage policy bucket `assets`** — tulis saat ini terbuka untuk anon ("OPSI A"); batasi ke authenticated/Admin bila operasional memungkinkan.
5. 📋 **Rapikan artefak SQL historis** — pastikan policy `allow_all_*` tidak tersisa; selaraskan komentar domain email di `06_final_snapshot.sql` (`@minblora.id` yang berlaku); tandai `04_seed.sql`/`05_library_visits.sql` sebagai historis vs aktif.
6. 📋 **Kompresi logo saat unggah** — resize/kompres klien (mis. maks 256×256 WebP) sebelum masuk Storage.
7. 📋 **Monitoring error runtime** — Sentry/GlitchTip untuk menangkap error di perangkat sekolah.
8. 📋 **Linter/formatter** — ESLint + Prettier + integrasi CI agar gaya kode konsisten.

## Future / Exploratory 💡

Belum diputuskan; dikerjakan hanya bila ada kebutuhan nyata:

- 💡 Migrasi `html5-qrcode` → `BarcodeDetector` native (fallback untuk browser lama)
- 💡 Lepas shim `lazyRealtime.js` bila supabase-js mendukung lazy realtime bawaan
- 💡 Virtualisasi tabel (`@tanstack/vue-virtual`) bila data siswa tumbuh sangat besar
- 💡 Reset password mandiri (butuh alur di luar email Supabase karena email virtual)
- 💡 Multi-madrasah dalam satu database (saat ini satu project Supabase = satu madrasah)
- 💡 Mode offline/optimistic input (butuh desain sync + konflik yang matang)

## Riwayat backlog yang sudah selesai

(Dipindahkan dari "Backlog Optimasi" README lama → Completed, agar tidak dibaca sebagai pekerjaan terbuka.)

- ✅ Font self-host, boot splash netral multi-sekolah, branding netral (0.2.2)
- ✅ Lazy realtime-js + immutable asset cache (0.2.2)
- ✅ Layout budget + CI otomatis (0.2.7)
- ✅ Konsistensi warna status + perbaikan bottom-nav/mobile (0.2.8–0.2.11)
- ✅ Login recovery (0.2.19)
