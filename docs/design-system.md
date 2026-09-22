# Design System

Dokumentasi gaya **aktual** dari `src/config/designSystem.js`, `tailwind.config.js`, dan `src/style.css`. Source of truth = source code.

> Koreksi atas README lama: aplikasi ini **tidak** memakai "Glassmorphism" sebagai bahasa desain dan tidak memakai gradient dekoratif. `backdrop-blur-sm` hanya dipakai fungsional pada 3 permukaan sticky/translusen (header, bottom-nav, save bar presensi) agar konten di bawahnya tetap terbaca — bukan estetika kaca. Arah desain resmi: *Professional, Clean & Official — Calm + High Information Density*.

## Prinsip

- **Institusional & tenang**: warna semantik saja (success/warning/danger/info/netral), emas hanya aksen kecil.
- **Densitas informasi tinggi**: dashboard dirancang muat satu layar desktop normal (lihat `layout-budget.md`).
- **Tidak color-only**: status selalu punya teks/ikon/badge, tidak mengandalkan warna saja.
- **Aksesibel**: fokus keyboard terlihat, target sentuh ≥ 44px, `prefers-reduced-motion` dihormati.

## Colors

### Brand (tailwind.config.js)

| Token | Hex | Pakai |
|---|---|---|
| `primary` (emerald) | `700 #047857` · `800 #065f46` · `900 #064e3b` · `50 #ecfdf5` | Aksi utama, presensi, sidebar aktif |
| `gold` | `#d97706` (bright `#fbbf24`, light `#fef3c7`) | Aksen kecil saja |
| `library` (blue) | `700 #1d4ed8` · `600 #2563eb` · `50 #eff6ff` | Identitas modul perpustakaan |
| `base` / `surface` | `#f8fafc` / `#ffffff` | Latar aplikasi / kartu |
| `ink` | `#0f172a` · soft `#334155` · muted `#64748b` · faint `#94a3b8` | Teks |

### Status kehadiran — EXACT (designSystem.js `ATTENDANCE_COLORS`)

Source of truth = header tabel Rekap. Wajib dipakai persis di chart, legend, segmented control, badge, dan tint kartu:

| Status | Hex | Tailwind padanan |
|---|---|---|
| Hadir | `#047857` | emerald-700 |
| Izin | `#0369a1` | sky-700 |
| Sakit | `#d97706` | amber-600 |
| Alfa | `#be123c` | rose-700 |

Metadata pendamping: `ATTENDANCE_STATUS` (kode + short H/I/S/A + tone), `STATUS_TONE_CLASSES` (badge), `CHART_COLORS` (donut/line + grid/tick), `ICON_CHIP` (kotak ikon `bg-50 + ring-200 + text-600` per tone).

## Typography

- Keluarga: **Inter Variable** (self-host `@fontsource-variable/inter`), fallback Inter → system sans.
- Skala (`tailwind.config.js` + class `.display/.page-title/.section-title/.card-title/.body/.secondary/.caption`):
  - display 30px · page-title 20px · section-title 16px · card-title 14px · body 14px · secondary 13px · caption 12px · tiny 11px.
- Fitur: `font-feature-settings 'cv02','cv03','cv04','cv11'`; angka/tabular via `.tnum` (statistik, tabel).
- Base: `body` = `bg-base text-slate-800 antialiased`.

## Spacing & layout

- Container: `.page` (`max-w-7xl`), tumpukan section `.page-stack` (`gap-3 sm:gap-4`).
- Kartu: `.card` (`rounded-xl border bg-white p-4 sm:p-5 shadow-card` ringan) — shadow hanya `xs/sm/card`, tanpa shadow dramatis.
- Radius: sm 8 · md 10 · lg 12 · xl 14 · 2xl 16.
- Tabel: header sticky opsional, sel `tnum`, baris hover halus, varian `.row-selected` / `.row-alert`.

## Components

- **Tombol**: `.btn` + varian `primary/secondary/ghost/danger/danger-soft/warning/library`, ukuran `sm/lg`, `btn-icon`; spinner `.spin` untuk loading.
- **Form**: `.input-field` (+ varian error), `.input-label/.input-hint/.input-error-text`, ikon leading/trailing, `.form-grid` responsif, `.checkbox`.
- **Segmented control**: `.segmented` — tombol aktif memakai warna solid status masing-masing + teks putih (H/I/S/A); inactive teks slate-700 semibold.
- **Badge**: `.badge-*` (success/info/warning/danger/neutral/primary/library) + `.badge-dot`.
- **Navigasi**: `.tabs` + `.tab-btn` (underline), `.chip-tabs/.chip-tab` (chip, aktif = primary solid).
- **Overlay**: `.dropdown-panel/.dropdown-item`, `AppModal`, `AppConfirmDialog`.
- **State**: `.state-box/.state-icon` (empty/error), `.skeleton` loading.
- **Alert**: `.alert-*` 5 tone.

Implementasi Vue ada di `src/components/ui/` (19 komponen `App*`).

## Attendance colors — pemakaian konsisten

`ATTENDANCE_COLORS` dipakai oleh: chart/legend dashboard, segmented control Input Presensi, ringkasan H/I/S/A, tint + border kartu siswa Input Presensi, dan header tabel Rekap. Jangan menambah pemetaan warna status baru — tambah ke token bila perlu.

## Responsive rules

- Breakpoint perilaku: mobile `<1024px` (drawer + bottom-nav), desktop `≥1024px` (sidebar, bisa collapse).
- Bottom-nav mobile: tinggi 61px + `safe-area-inset-bottom`; padding bawah konten global = `calc(61px + safe-area + 16px)` di `AppLayout` — satu titik untuk semua view.
- Sticky save bar Input Presensi mengikuti offset yang sama.
- Filter tren: desktop horizontal di header kartu; mobile = mode di bawah judul + tanggal/bulan/tahun grid 2 kolom full-width.
- Grafik: tinggi `clamp()` berbasis `vh` (tren presensi, donat, tren perpus) — adaptif layar pendek/tinggi.
- Tabel lebar: `.table-scroll` horizontal dalam kartu (bukan scroll halaman).

## Mobile navigation

Tiga set bottom tab (`src/config/navigation.js`), dipilih otomatis (`AppLayout.vue`):

- Rute admin (`siswa/guru/kalender/riwayat-kelas/aktivitas/pengaturan`) → `bottomTabsAdmin`.
- Rute perpus → `bottomTabsPerpus`; Pustakawan murni selalu perpus.
- Default → `bottomTabsPresensi`.
- Drawer mobile menutup otomatis tiap navigasi + mengunci scroll body; tidak ada tombol Refresh/Keluar duplikat di sidebar (hanya di menu profil).

## Accessibility behavior

- `:focus-visible` global: outline 2px `#047857` + offset.
- Status/ikon bermakna selalu punya teks atau `aria-label` (`aria-pressed` di segmented/chip, `aria-selected` di tab).
- `prefers-reduced-motion: reduce` mematikan animasi/transisi global (termasuk splash `index.html`).
- Target sentuh: `TOUCH_TARGET = 44`, `min-h/w touch 2.75rem`, rule `@media (pointer: coarse)`.
- `::selection` emerald-100; scrollbar tipis dan tenang.

## Motion

Sengaja minimal: transisi warna 150ms pada tombol/baris, `Transition fade` untuk overlay drawer. Tidak ada entrance animation per-section, tidak ada hover-scale pada kartu — sesuai prinsip "calm".
