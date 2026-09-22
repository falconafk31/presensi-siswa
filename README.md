# Sistem Presensi & Perpustakaan Madrasah

Aplikasi web terpadu untuk **presensi akademik harian** dan **manajemen perpustakaan sekolah** — presensi, rekap, kalender akademik, katalog buku, sirkulasi, kunjungan QR, dan laporan — dalam satu portal.

## Status

| Aspek | Kondisi |
|---|---|
| Status | Aktif dikembangkan, siap dipakai (production-ready SPA) |
| Versi dokumen terakhir | Lihat [CHANGELOG.md](CHANGELOG.md) — entri terbaru `0.2.19` (2026-09-22) |
| Versi `package.json` | `0.1.0` (belum disinkronkan dengan changelog — versi acuan adalah changelog) |
| Deployment | Siap deploy ke Vercel (`vercel.json` tersedia, SPA rewrite + immutable asset cache) |
| CI | GitHub Actions: guard binding template + build produksi di setiap push/PR |

## Overview

Aplikasi ini menggantikan sistem *legacy* (Google Apps Script) dengan arsitektur modern **Vue 3 SPA + Supabase**.

**Pengguna utama:**

- **Admin** — mengelola seluruh data, pengguna, identitas madrasah, dan pemeliharaan sistem.
- **Guru / wali kelas** — mengisi presensi kelas ampuan, melihat rekap dan statistik.
- **Pustakawan** — mengelola katalog, sirkulasi, kunjungan, dan laporan perpustakaan.

**Dua domain utama:**

1. **Presensi** — dashboard kehadiran, input presensi per kelas, rekap bulanan/semester, statistik, kalender akademik, ekspor PDF/Excel.
2. **Perpustakaan** — katalog buku, sirkulasi peminjaman/pengembalian, pencatatan kunjungan (manual + QR scanner), laporan, cetak kartu anggota.

## Core Features

### Presensi

- **Dashboard presensi** — KPI kehadiran, tren kehadiran (harian/bulanan/tahunan), komposisi H/I/S/A hari ini, strip monitoring kelas yang belum presensi, refresh otomatis via Supabase Realtime (`attendance_logs`).
- **Input presensi** — segmented control Hadir/Izin/Sakit/Alfa per siswa, validasi otomatis terhadap kalender akademik & hari libur mingguan (input dikunci saat libur), kunci kelas (guru hanya mengisi kelas ampuannya), pelacakan perubahan (*dirty tracking*) + konfirmasi sebelum meninggalkan halaman.
- **Rekap bulanan** — matriks kehadiran per siswa per tanggal, indikator Total Hari Efektif & Total Hari Libur, ekspor PDF (kop surat resmi + penanda libur) dan Excel.
- **Rekap semester** — agregat semester per siswa, ekspor PDF dan Excel.
- **Statistik kehadiran** — peringkat persentase kehadiran per siswa, ambang batas peringatan yang bisa diubah (tersimpan lokal), pagination 25 baris/halaman.
- **Kalender akademik** — penanda Masuk/Libur per tanggal; Guru bisa melihat, Admin yang mengelola.
- **Riwayat kelas** — snapshot kelas siswa per tahun ajaran (diisi otomatis saat kenaikan kelas).

### Perpustakaan

- **Beranda perpustakaan** — KPI koleksi/sirkulasi/kunjungan, tren aktivitas, daftar peminjaman terakhir.
- **Katalog buku** — CRUD data buku (judul, pengarang, penerbit, tahun, ISBN, kategori, stok), impor/ekspor Excel.
- **Sirkulasi** — peminjaman & pengembalian dengan status (`dipinjam`, `dikembalikan`, `terlambat`, `hilang`), perhitungan keterlambatan, riwayat per buku.
- **Kunjungan** — pencatatan manual per siswa per tanggal + halaman **Scan QR** (kamera via `html5-qrcode`, umpan balik suara berhasil/gagal via Web Audio).
- **Laporan & statistik** — tab kunjungan & sirkulasi dengan filter periode, ekspor PDF dan Excel, nama perpustakaan kustom dari Pengaturan.
- **Kartu anggota** — cetak kartu perpustakaan massal berisi QR Code NISN (via `qrcode.vue` + `jspdf`), ukuran kartu standar (±8,6 × 5,4 cm).

### Administration

- **Manajemen pengguna & role** — tambah/edit/hapus akun (Admin, Guru, Pustakawan, Guru & Pustakawan), impor Excel, penetapan wali kelas.
- **Data siswa** — CRUD, impor Excel (dengan template & pratinjau), status siswa (`aktif`, `lulus`, `pindah`, `keluar`).
- **Identitas madrasah** — nama sekolah, alamat, kepala sekolah & NIP, kop surat laporan (5 baris), unggah logo (tersimpan di Supabase Storage, dipakai splash/sidebar/PDF).
- **Periode akademik** — tahun ajaran + semester, satu periode aktif.
- **Kenaikan kelas otomatis** — menaikkan seluruh siswa satu tingkat sekaligus, meluluskan tingkat akhir, mencatat `class_history`.
- **Pemeliharaan (zona berbahaya)** — reset data absensi/log/kunjungan/peminjaman dengan konfirmasi ganda, unduh backup JSON.
- **Log aktivitas** — audit trail aksi penting (input presensi, data master, sirkulasi) dengan filter.
- **Panduan built-in** — manual per peran (Guru / Pustakawan / Admin) di dalam aplikasi, termasuk panduan pemulihan cache/blank screen.

## Roles & Permissions

| Kemampuan | Admin | Guru | Pustakawan | Guru & Pustakawan |
|---|---|---|---|---|
| Dashboard & input presensi, rekap, statistik | ✅ | ✅ (kelas ampuan) | ❌ | ✅ (kelas ampuan) |
| Lihat kalender akademik | ✅ | ✅ | ❌ | ✅ |
| Kelola kalender (tandai Masuk/Libur) | ✅ | ❌ | ❌ | ❌ |
| Modul perpustakaan (katalog, sirkulasi, kunjungan, QR, laporan, kartu) | ✅ | ❌ | ✅ | ✅ |
| Data siswa, guru/akun, riwayat kelas, log aktivitas, pengaturan | ✅ | ❌ | ❌ | ❌ |
| Panduan penggunaan | ✅ | ✅ | ✅ | ✅ |

Enforcement ganda: *route guard* + filter navigasi di frontend (Pinia: `isAdmin`, `canManagePresensi`, `canManagePerpus`), dan *Row Level Security* di Supabase berdasarkan role dari tabel `users`. Detail: [docs/authentication.md](docs/authentication.md), [docs/database.md](docs/database.md).

## Architecture

```text
Browser
  │
  ▼
Vue 3 SPA (Vite build, served as static files)
  ├── Vue Router ── lazy routes + navigation guards (role-based)
  ├── Pinia ── auth (session+profile cache), settings, period
  ├── UI components ── 19 komponen custom Tailwind (App*)
  └── Feature views ── 20 halaman (presensi / perpus / admin)
  │     ├── dynamic import() ── jspdf, xlsx, chart.js
  │     └── realtime on-demand ── Dashboard presensi subscribe
  │         postgres_changes(attendance_logs), debounce 1 dtk
  ▼
Supabase (anon key, RLS enforced)
  ├── Auth ── email virtual <username>@minblora.id
  ├── PostgreSQL ── 11 tabel (presensi, perpus, admin)
  └── Storage ── bucket publik `assets` (logo madrasah)
```

Detail: [docs/architecture.md](docs/architecture.md).

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vue 3.5 + Vite 5 | SPA, Composition API + `<script setup>` |
| Styling | Tailwind CSS 3.4 + PostCSS | Design system institusional, font Inter self-host |
| State | Pinia 2 | Auth, settings, periode akademik |
| Router | Vue Router 4 | Lazy routes, guard berbasis role |
| Backend | Supabase (PostgreSQL, Auth, Storage) | Database, autentikasi JWT, file logo |
| Realtime | `@supabase/realtime-js` (lazy) | Auto-refresh dashboard presensi |
| Charts | Chart.js 4 + vue-chartjs 5 (lazy) | Tren & komposisi kehadiran |
| PDF | jspdf + jspdf-autotable (lazy) | Rekap, laporan perpus, kartu anggota |
| Excel | xlsx (lazy) | Ekspor rekap/laporan, impor data |
| QR | html5-qrcode (route chunk), qrcode.vue | Scan kunjungan, QR kartu anggota |
| Icons / Toast / Utils | lucide-vue-next, vue-sonner, @vueuse/core | Ikon, notifikasi, composables |
| Deployment | Vercel (static) | SPA rewrite + immutable asset cache |
| CI | GitHub Actions | Guard binding template + `npm run build` |

Versi terkunci di `package-lock.json`. Detail + catatan dependensi tak terpakai (`radix-vue`): [docs/tech-stack.md](docs/tech-stack.md).

## Repository Structure

Struktur aktual (ringkas):

```text
.
├── src/
│   ├── components/ui/     # 19 komponen UI reusable (App*)
│   ├── config/            # constants, designSystem tokens, navigation
│   ├── layouts/           # AppLayout (sidebar, bottom-nav mobile, header)
│   ├── lib/               # supabase client, PDF/Excel export, dates, chart, realtime shim
│   ├── router/            # rute + guard + judul halaman
│   ├── stores/            # auth, settings, period (Pinia)
│   ├── views/             # 20 halaman route-level
│   ├── App.vue            # RouterView + Toaster + favicon dinamis
│   ├── main.js            # boot anti-kedip, error handler, SW cleanup
│   └── style.css          # design system CSS (Tailwind layers)
├── supabase/              # 01_schema … 06_final_snapshot + README arsitektur DB
├── scripts/               # check-template-bindings.mjs (guard CI/build)
├── docs/                  # dokumentasi engineering
├── .github/workflows/     # CI (guard + build)
├── index.html             # boot splash instan + injeksi logo
├── vercel.json            # SPA rewrite + cache header
└── vite.config.js         # alias @, lazy realtime-js, allowedHosts preview
```

Detail per folder: [docs/project-structure.md](docs/project-structure.md).

## Quick Start

Prasyarat: Node.js 18+, akun Supabase.

```bash
# 1. Install
npm install

# 2. Konfigurasi environment
cp .env.example .env
# Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY dari Supabase Dashboard > Project Settings > API

# 3. Siapkan database: jalankan supabase/01_schema.sql → 02_rls.sql → 03_storage.sql
#    secara berurutan di Supabase SQL Editor, lalu buat akun admin pertama
#    (lihat docs/database.md — bagian bootstrap admin)

# 4. Development server
npm run dev        # buka http://localhost:5173

# Build produksi (otomatis menjalankan guard binding template)
npm run build

# Pratinjau hasil build
npm run preview
```

Login memakai **username + password** (tanpa `@...` — aplikasi menambahkan domain virtual internal `@minblora.id` secara otomatis). Akun dibuat oleh Admin lewat menu **Guru & Wali Kelas**; tidak ada kredensial default di repository ini.

Detail: [docs/development.md](docs/development.md).

## Documentation

| Dokumen | Isi |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Arsitektur aplikasi, frontend, state, routing, data flow, realtime, recovery |
| [docs/tech-stack.md](docs/tech-stack.md) | Tabel dependensi terverifikasi + catatan |
| [docs/project-structure.md](docs/project-structure.md) | Fungsi tiap folder & modul penting |
| [docs/development.md](docs/development.md) | Prasyarat, instalasi, env, command, konvensi |
| [docs/deployment.md](docs/deployment.md) | Deploy Vercel, env produksi, verifikasi rilis |
| [docs/authentication.md](docs/authentication.md) | Login flow, session, role, guard, recovery |
| [docs/database.md](docs/database.md) | Tabel, relasi, RLS, storage, bootstrap admin |
| [docs/testing.md](docs/testing.md) | Guard template, CI, QA manual |
| [docs/performance.md](docs/performance.md) | Strategi loading, lazy chunks, layout budget |
| [docs/design-system.md](docs/design-system.md) | Token warna, tipografi, komponen, responsif, a11y |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Masalah nyata + diagnosis + solusi |
| [docs/layout-budget.md](docs/layout-budget.md) | Verifikasi aritmetika "dashboard muat 1 layar" |
| [docs/decisions/](docs/decisions/) | Catatan keputusan arsitektur penting |
| [ROADMAP.md](ROADMAP.md) | Status fitur: selesai, aktif, rencana, eksploratif |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat perubahan (Keep a Changelog) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Alur kontribusi, konvensi, aturan database |
| [SECURITY.md](SECURITY.md) | Kebijakan keamanan & pelaporan kerentanan |

## Testing

Tidak ada unit/integration test otomatis. Verifikasi dilakukan via guard binding template SFC (`scripts/check-template-bindings.mjs`, otomatis di `npm run build` + CI) dan QA manual per peran. Detail: [docs/testing.md](docs/testing.md).

## Deployment

Static hosting (Vercel). SPA rewrite untuk Vue Router history mode + header immutable cache untuk `/assets/*`. Detail: [docs/deployment.md](docs/deployment.md).

## Security

RLS aktif di semua tabel, anon key hanya untuk operasi yang diizinkan policy, tidak ada secret di repo. Jangan commit `.env`, jangan expose service-role key. Detail: [SECURITY.md](SECURITY.md).

## Roadmap & Changelog

- Rencana pengembangan: [ROADMAP.md](ROADMAP.md)
- Riwayat perubahan: [CHANGELOG.md](CHANGELOG.md)

## License

MIT — lihat [LICENSE](LICENSE). Bebas dipakai, dimodifikasi, dan didistribusikan untuk keperluan pendidikan/instansi.

## Support / Contribution

- Kontribusi: baca [CONTRIBUTING.md](CONTRIBUTING.md) dulu (terutama aturan **jangan ubah database/RLS/auth tanpa instruksi eksplisit**).
- Donasi pengembang: [Saweria](https://saweria.co/falconafk31).
- Panduan dalam aplikasi: menu **Panduan Penggunaan** (per peran).
