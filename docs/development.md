# Development

## Prerequisites

- **Node.js 18+** (CI memakai Node 20 — `.github/workflows/ci.yml`)
- **npm** (repo memakai `package-lock.json`; CI memakai `npm ci`)
- Akun **Supabase** (project dengan PostgreSQL + Auth + Storage)
- Git

## Installation

```bash
git clone https://github.com/falconafk31/presensi-siswa.git
cd presensi-siswa
npm install
```

## Environment variables

```bash
cp .env.example .env
```

| Variable | Wajib | Diperoleh dari |
|---|---|---|
| `VITE_SUPABASE_URL` | Ya | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Ya | Supabase Dashboard → Project Settings → API |

Hanya dua variable ini yang dibaca aplikasi (`src/lib/supabase.js`) — dan keduanya memang harus ada, jika tidak aplikasi melempar error yang jelas saat boot. `.env` diabaikan git (`.gitignore`); jangan pernah commit file ini.

## Database setup

Jalankan file SQL di `supabase/` secara berurutan di Supabase SQL Editor, lalu bootstrap admin pertama. Instruksi lengkap: [database.md](database.md) (bagian "Menjalankan skema" + "Bootstrap admin pertama").

## Commands

Hanya tiga script yang ada di `package.json` — semuanya terverifikasi:

| Command | Aksi |
|---|---|
| `npm run dev` | Dev server Vite (`NODE_OPTIONS=--max-old-space-size=4096`), buka `http://localhost:5173` |
| `npm run build` | `node scripts/check-template-bindings.mjs` (guard) + `vite build` → `dist/` |
| `npm run preview` | Pratinjau hasil `dist/` secara lokal |

Tidak ada script `lint`, `test`, atau `format` — repo tidak memakai ESLint/Prettier/Vitest (lihat [testing.md](testing.md)).

Dev/preview server mengizinkan semua host (`allowedHosts: true` di `vite.config.js`) agar bisa dibuka dari environment preview sandbox — hanya berpengaruh saat development, tidak memengaruhi hasil build.

## Development server & login

1. `npm run dev` → buka URL yang ditampilkan (default `http://localhost:5173`).
2. Login dengan username + password akun yang ada di Supabase project tersebut.
3. Akun dibuat oleh Admin via menu **Guru & Wali Kelas**; akun admin pertama dibuat manual — lihat [database.md](database.md#bootstrap-admin-pertama).

## Debugging

- **Toast error global**: `main.js` memasang `app.config.errorHandler` — error runtime Vue muncul sebagai toast + log console.
- **Judul tab per rute** (`router.afterEach`) membantu memastikan navigasi/guard bekerja.
- **LocalStorage yang dipakai**: `presensi.user` (profil cache), `app.logo_url` (logo splash), `sidebar.collapsed`, `presensi.threshold`. Curiga state basi → menu profil → Refresh (membersihkan SW + Cache Storage + reload), atau "Pulihkan Sesi" di halaman login.
- **Chunk gagal dimuat** setelah deploy baru → `router.onError` otomatis me-reload ke URL tujuan.
- Masalah umum lain: [troubleshooting.md](troubleshooting.md).

## Development conventions

Konvensi yang dipakai kode saat ini — ikuti saat menambah kode:

- **Views**: satu file per rute di `src/views/`, `<script setup>`, fetch data sendiri via `supabase`, toast untuk feedback, `logActivity()` untuk aksi penting.
- **Komponen**: UI generik masuk `src/components/ui/` (prefix `App*`, presentasional, tanpa Supabase); jangan menambah komponen sekali-pakai ke folder ini.
- **Token warna**: jangan hardcode hex untuk status kehadiran — pakai `ATTENDANCE_COLORS` / `ATTENDANCE_STATUS` dari `src/config/designSystem.js`. Warna ikon dashboard pakai `ICON_CHIP`.
- **Rute baru**: daftarkan lazy (`() => import(...)`), beri `meta` hak akses yang tepat, tambahkan judul di `titleMap`, dan tambahkan item navigasi di `src/config/navigation.js` bila perlu (perhatikan flag `adminOnly/presensiOnly/perpusOnly`).
- **Library berat**: jangan `import` statis `jspdf`/`xlsx`/`chart.js` — pakai `await import()` / `defineAsyncComponent` agar tetap di luar bundle boot (lihat [performance.md](performance.md)).
- **Dashboard**: setiap section baru harus menghormati layout budget (`docs/layout-budget.md`) — gunakan tinggi adaptif `clamp()` dan scroll internal kartu, bukan menambah tinggi tetap.
- **Aksesibilitas**: ikon tanpa teks wajib `aria-label`; status tidak boleh color-only (teks/badge selalu menyertai warna); hormati `prefers-reduced-motion` (sudah global di `style.css`).
- **Database/RLS/auth**: JANGAN diubah tanpa instruksi eksplisit (lihat [CONTRIBUTING.md](../CONTRIBUTING.md)).

## Verifikasi sebelum push

```bash
node scripts/check-template-bindings.mjs   # guard (juga otomatis di build)
npm run build                              # harus sukses tanpa error
```

CI menjalankan keduanya di setiap push/PR. QA manual per peran: [testing.md](testing.md).
