# Project Structure

Struktur **aktual** repository. Hanya folder/file yang benar-benar ada yang dijelaskan.

```text
.
├── src/                        # Kode aplikasi Vue 3
│   ├── components/ui/          # 19 komponen UI reusable + index.js barrel
│   ├── config/                 # constants.js, designSystem.js, navigation.js
│   ├── layouts/AppLayout.vue   # Shell terautentikasi (sidebar/header/bottom-nav)
│   ├── lib/                    # Client Supabase + helper ekspor + shim realtime
│   ├── router/index.js         # Rute, guard, judul halaman, chunk-error reload
│   ├── stores/                 # auth.js, settings.js, period.js (Pinia)
│   ├── views/                  # 20 halaman route-level
│   ├── App.vue                 # RouterView + Toaster + favicon dinamis
│   ├── main.js                 # Boot anti-kedip + error handler + SW cleanup
│   └── style.css               # Design system CSS (Tailwind @layer)
├── supabase/                   # 01_schema … 06_final_snapshot + README arsitektur DB
├── scripts/                    # check-template-bindings.mjs (guard build/CI)
├── docs/                       # Dokumentasi engineering (file ini)
├── .github/workflows/ci.yml    # CI: install → guard → build
├── index.html                  # Entry + boot splash inline + injeksi logo
├── vite.config.js              # Alias @, lazy realtime-js, allowedHosts preview
├── tailwind.config.js          # Token warna, tipografi, radius, shadow
├── postcss.config.js           # tailwindcss + autoprefixer
├── vercel.json                 # SPA rewrite + immutable asset cache
├── package.json / lock         # Script: dev, build, preview
├── .env.example                # Template VITE_SUPABASE_URL + ANON_KEY
└── README/CHANGELOG/ROADMAP/CONTRIBUTING/SECURITY/LICENSE
```

## `src/components/ui/` — Komponen UI reusable

19 komponen presentasional berbasis Tailwind, tanpa akses Supabase langsung:

| Komponen | Fungsi |
|---|---|
| `AppAlert` | Banner/pesan info·success·warning·danger |
| `AppBadge` | Label status (ikon + warna semantik, tidak color-only) |
| `AppButton` | Tombol (varian primary/secondary/ghost/danger/warning/library, loading) |
| `AppCard` | Kartu + header/aksi opsional |
| `AppConfirmDialog` | Dialog konfirmasi (mis. tinggalkan halaman presensi) |
| `AppDropdown` | Menu dropdown (mis. menu profil) |
| `AppEmptyState` / `AppErrorState` | Status kosong / gagal |
| `AppFilterBar` | Bar filter + pencarian |
| `AppInput` / `AppSelect` / `AppTextarea` | Field form (leading/trailing slot, error text) |
| `AppModal` | Modal kustom ringan |
| `AppPageHeader` | Judul halaman (mode normal + inline compact) |
| `AppPagination` | Pagination client-side |
| `AppSegmentedControl` | Segmented control (status presensi, mode tren) |
| `AppSkeleton` | Skeleton loading |
| `AppStatCard` | Kartu statistik/KPI |
| `AppTable` | Tabel responsif |
| `AppTabs` | Tab underline/chip |

## `src/config/` — Konfigurasi frontend

| File | Fungsi |
|---|---|
| `constants.js` | `STATUS_PRESENSI` (H/I/S/A + warna), `STATUS_SISWA`, `DEFAULT_THRESHOLD` (75) |
| `designSystem.js` | Token JS: `COLORS`, `CHART_COLORS`, `ATTENDANCE_COLORS` (exact), `ATTENDANCE_STATUS`, `STATUS_TONE_CLASSES`, `ICON_CHIP`, `RADIUS`, `TOUCH_TARGET` |
| `navigation.js` | `navItems` (sidebar per role), `bottomTabsPresensi/Perpus/Admin` (bottom-nav mobile) |

## `src/layouts/` — Shell aplikasi

- `AppLayout.vue` — layout seluruh rute terautentikasi: sidebar responsif (+ mode collapse desktop, drawer mobile), sticky header, bottom navigation mobile dengan safe-area, menu profil (refresh cache, logout), sapaan waktu, sinkronisasi settings+period.

## `src/lib/` — Lapisan integrasi & helper

| File | Fungsi |
|---|---|
| `supabase.js` | Client tunggal + `whenRealtimeReady()` (swap shim → client asli) |
| `lazyRealtime.js` | Shim `RealtimeClient` agar chunk realtime-js terpisah & on-demand |
| `chartSetup.js` | Registrasi Chart.js + defaults font; entry lazy chart presensi |
| `dates.js` | Helper tanggal Indonesia (ISO, nama bulan, weekend, format) |
| `activityLog.js` | `logActivity()` — tulis audit trail, gagal tidak memblokir |
| `excelExport.js` | `exportExcelBulanan/Semester/Kunjungan/Sirkulasi` (dynamic `xlsx`) |
| `pdfRekap.js` / `pdfRekapSemester.js` | PDF rekap + kop surat (dynamic `jspdf`) |
| `pdfPerpus.js` / `pdfKunjungan.js` / `pdfSirkulasi.js` | PDF laporan perpustakaan |

## `src/router/` — Routing

- `index.js` — 21 rute (semua lazy), guard role (`adminOnly/presensiOnly/perpusOnly`), redirect landing per role, `document.title` per halaman, reload otomatis saat chunk gagal dimuat.

## `src/stores/` — State global (Pinia)

| File | Fungsi |
|---|---|
| `auth.js` | Sesi + profil + getters role + `login/logout/initialize`, cache `localStorage['presensi.user']` |
| `settings.js` | Identitas madrasah + default, cache logo `localStorage['app.logo_url']` |
| `period.js` | Periode akademik aktif |

## `src/views/` — Halaman (20 file)

| Domain | Views |
|---|---|
| Presensi | `DashboardView`, `InputPresensiView`, `RekapView`, `RekapSemesterView`, `StatistikView`, `KalenderView` |
| Perpustakaan | `DashboardPerpusView`, `BukuView`, `PeminjamanView`, `KunjunganPerpusView`, `ScanQRView`, `CetakKartuView`, `RekapPerpusView` |
| Administrasi | `SiswaView`, `GuruView`, `RiwayatKelasView`, `AktivitasView`, `PengaturanView` |
| Umum | `LoginView`, `PanduanView` |

## `supabase/` — Database

| File | Fungsi |
|---|---|
| `01_schema.sql` | 11 tabel + indeks + trigger `updated_at` |
| `02_rls.sql` | RLS strict berbasis `get_my_role()` |
| `03_storage.sql` | Bucket publik `assets` + policy |
| `04_seed.sql` | Data contoh (siswa, periode, kalender, settings) — ⚠️ akun contoh di sini format lama, lihat [database.md](database.md) |
| `05_library_visits.sql` | Migrasi tambahan tabel kunjungan (subset dari 01; policy longgar — lihat catatan di database.md) |
| `06_final_snapshot.sql` | Trigger sinkronisasi `auth.users` → `public.users` + panduan bootstrap admin |
| `README.md` | Ringkasan arsitektur DB & auth |

## `scripts/`, `docs/`, `.github/`

- `scripts/check-template-bindings.mjs` — guard: compile seluruh SFC, gagal bila ada binding template tak terdefinisi. Dijalankan otomatis oleh `npm run build` dan CI.
- `docs/` — dokumentasi engineering (arsitektur → troubleshooting + layout-budget + decisions).
- `.github/workflows/ci.yml` — CI: `npm ci` → guard → build dengan `.env` dari `.env.example`.

## Root config

- `index.html` — entry Vite + **boot splash inline** (HTML/CSS murni, injeksi logo dari cache).
- `vite.config.js` — alias `@` → `src`, alias lazy `@supabase/realtime-js` → shim, `allowedHosts` untuk preview sandbox (dev only).
- `tailwind.config.js` — palet primary/gold/library, skala tipografi, radius, shadow, touch target.
- `vercel.json` — rewrite SPA + `Cache-Control: immutable` untuk `/assets/*`.
