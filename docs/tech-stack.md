# Tech Stack

Seluruh entri diverifikasi dari `package.json`, `package-lock.json`, dan konfigurasi (`vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `vercel.json`, `.github/workflows/ci.yml`).

> Rentang versi = `package.json`; versi pasti = `package-lock.json` (terkunci, dipakai CI via `npm ci`).

## Frontend

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `vue` | `^3.5.0` → 3.5.38 | Framework UI, Composition API + `<script setup>` |
| `vue-router` | `^4.4.0` → 4.6.4 | Routing SPA, lazy routes, navigation guard |
| `pinia` | `^2.2.0` → 2.3.1 | State global: auth, settings, period |

## Build & Styling

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `vite` | `^5.4.0` → 5.4.21 | Dev server + build produksi |
| `@vitejs/plugin-vue` | `^5.1.0` | Kompilasi SFC |
| `tailwindcss` | `^3.4.0` → 3.4.19 | Utility CSS, design tokens di `tailwind.config.js` |
| `postcss` + `autoprefixer` | `^8.4.0` / `^10.4.20` | Pipeline CSS Tailwind |
| `@fontsource-variable/inter` | `^5.3.0` | Font Inter self-host (tanpa CDN Google Fonts) |
| `cross-env` | `^10.1.0` | `NODE_OPTIONS=--max-old-space-size=4096` di script dev/build |

## Backend (Supabase — layanan, bukan kode repo)

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2.45.0` → 2.108.2 | Client PostgreSQL + Auth + Storage |
| `@supabase/realtime-js` | transitif via supabase-js | Realtime dashboard; di-lazy-load via shim `src/lib/lazyRealtime.js` |

## Charts

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `chart.js` | `^4.4.0` → 4.5.1 | Grafik tren & donat |
| `vue-chartjs` | `^5.3.0` | Wrapper Vue untuk Chart.js |

## PDF

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `jspdf` | `^2.5.2` → 2.5.2 | Generate PDF rekap/laporan/kartu |
| `jspdf-autotable` | `^3.8.4` | Tabel otomatis di PDF |

## Excel

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `xlsx` | `^0.18.5` → 0.18.5 | Ekspor rekap/laporan + impor data (siswa, guru, buku) |

## QR

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `html5-qrcode` | `^2.3.8` → 2.3.8 | Scan QR kunjungan via kamera (`ScanQRView`) |
| `qrcode.vue` | `^3.10.0` → 3.10.0 | Render QR NISN di kartu anggota (`CetakKartuView`) |

## Icons / Font / UX utilities

| Technology | Versi (range → terkunci) | Purpose |
|---|---|---|
| `lucide-vue-next` | `^0.441.0` → 0.441.0 | Ikon seluruh aplikasi (tree-shakeable) |
| `vue-sonner` | `^1.2.0` → 1.3.2 | Toast notifikasi (`Toaster` di `App.vue`) |
| `@vueuse/core` | `^11.0.0` → 11.3.0 | `useStorage`, `useDebounceFn`, `watchDebounced` |

## Deployment

| Technology | Konfigurasi | Purpose |
|---|---|---|
| Vercel (static) | `vercel.json` | SPA rewrite `/index.html`, immutable cache `/assets/*` |
| Node.js | 18+ (dev), 20 (CI) | Runtime build |

## Testing & CI

| Technology | Konfigurasi | Purpose |
|---|---|---|
| Guard binding template | `scripts/check-template-bindings.mjs` | Compile SFC, gagalkan build bila binding template tak terdefinisi |
| GitHub Actions | `.github/workflows/ci.yml` | `npm ci` → guard → `npm run build` (dengan `.env` dari `.env.example`) |
| Unit/integration test | — | **Tidak ada** (Vitest dkk. belum dipakai; lihat [testing.md](testing.md)) |

## Catatan

- **`radix-vue` (`^1.9.0` → 1.9.17) dideklarasikan di `package.json` tetapi tidak pernah di-import di `src/`** (terverifikasi via pencarian source). Kandidat untuk dihapus pada bersih-bersih dependensi berikutnya — komponen UI memakai implementasi Tailwind kustom (`AppModal`, `AppDropdown`, …), bukan Radix.
- Tidak ada library PWA, i18n, form validation, atau HTTP client tambahan — fetch data sepenuhnya via `supabase-js`.
- Tidak ada linter/formatter terkonfigurasi (tidak ada ESLint/Prettier config di repo).
