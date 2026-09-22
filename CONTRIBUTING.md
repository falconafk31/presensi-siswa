# Contributing

Terima kasih ingin berkontribusi! Baca seluruh dokumen ini sebelum membuka PR — terutama aturan database.

## Branch workflow

- **Jangan bekerja langsung di `main`.** Buat branch dari `main` terbaru:
  - Fitur: `arena/<id>-<nama-fitur>` atau `feat/<nama-fitur>`
  - Perbaikan: `fix/<nama-perbaikan>`
  - Dokumentasi: `docs/<topik>`
- Satu PR = satu topik. Jaga diff kecil dan terfokus.
- Update `CHANGELOG.md` untuk setiap perubahan perilaku/fitur/perbaikan (format Keep a Changelog; lihat entri terbaru sebagai contoh).
- Update dokumentasi (`README`/`docs/`) bila perilaku, peran, command, atau arsitektur berubah.

## Development setup

```bash
npm install
cp .env.example .env   # isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Detail lengkap: [docs/development.md](docs/development.md). Database: [docs/database.md](docs/database.md).

## Coding conventions

- Vue 3 `<script setup>` + Composition API; komponen UI generik di `src/components/ui/` (prefix `App*`, presentasional, tanpa Supabase).
- Warna status kehadiran **wajib** dari `ATTENDANCE_COLORS` (`src/config/designSystem.js`) — jangan hardcode hex.
- Rute baru: lazy import, `meta` hak akses yang tepat, judul di `titleMap`, item navigasi di `src/config/navigation.js` bila perlu.
- Library berat (`jspdf`, `xlsx`, `chart.js`) **wajib** dynamic import — jangan `import` statis di entry path.
- Dashboard: hormati layout budget (`docs/layout-budget.md`) — tinggi adaptif `clamp()`, daftar panjang scroll internal kartu.
- Aksesibilitas: `aria-label` untuk ikon tanpa teks, status tidak color-only, tidak ada animasi esensial yang mengabaikan `prefers-reduced-motion`.
- Bahasa UI & komentar: Bahasa Indonesia (konsisten dengan kode saat ini).

## Testing / build requirement

Sebelum push / membuka PR:

```bash
node scripts/check-template-bindings.mjs
npm run build
```

Keduanya wajib lolos (CI menjalankan hal yang sama). Untuk perubahan perilaku/UI, lengkapi QA manual di [docs/testing.md](docs/testing.md) dan centang di deskripsi PR.

## Commit expectations

- Pesan jelas, Bahasa Indonesia atau Inggris, format konvensional bila memungkinkan:
  - `feat: …`, `fix: …`, `docs: …`, `refactor: …`, `chore: …`
  - Contoh: `docs: restructure repository documentation`
- Jangan mencampur refactor besar + fitur dalam satu commit.

## PR expectations

- Isi template PR (`.github/pull_request_template.md`): ringkasan, perubahan, testing, dampak database/keamanan, screenshot bila ada perubahan UI.
- Checklist wajib: build lolos, tidak ada perubahan database tak disengaja, dampak RLS diulas, mobile dicek untuk perubahan UI, dokumentasi diperbarui.
- PR dengan perubahan database/auth wajib menyebutkannya eksplisit di bagian "Security / Database Impact".

## ⛔ Database safety (wajib dibaca)

**Agent/developer TIDAK boleh mengubah database, RLS, policy Storage, trigger, maupun konfigurasi Auth tanpa instruksi eksplisit dari maintainer.**

- Jangan menjalankan SQL destruktif (`DROP`, `TRUNCATE`, `DELETE` massal) di project Supabase bersama/produksi.
- Perubahan skema (bila diminta eksplisit) harus berupa file SQL baru yang berurutan di `supabase/`, diulas dampak RLS-nya, dan dicatat di CHANGELOG.
- Uji perubahan berisiko (kenaikan kelas, reset, policy) di project/dev data terpisah dulu.
- Jangan commit dump data, kredensial, atau service-role key — lihat [SECURITY.md](SECURITY.md).

## Security considerations

- Jangan pernah log/menampilkan token, password, atau key.
- Otorisasi di UI (guard/menu) bukan kontrol keamanan — penegakan final ada di RLS. Bila menambah rute/fitur sensitif, pastikan policy database menutup akses yang tidak berhak.
- Menemukan kerentanan? Lihat [SECURITY.md](SECURITY.md) — jangan dibuka sebagai issue publik.
