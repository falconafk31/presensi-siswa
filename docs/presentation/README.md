# Dokumentasi — Tutorial & Presentasi Interaktif

Repo: `falconafk31/presensi-siswa` · Branch Arena: `arena/01a0c735-presensi-siswa`

Halaman dokumentasi/tutorial interaktif dibangun **di dalam aplikasi Vue3 yang
sama** (tanpa framework kedua) dan dibuka melalui:

| Rute | Fungsi |
|---|---|
| `/tutorial` | User guide HTML (pilih bagian → pilih fitur → baca langkah + rekonstruksi UI) |
| `/tutorial/admin` | User guide, langsung ke bagian Admin |
| `/tutorial/guru` | User guide, langsung ke bagian Guru |
| `/tutorial/pustakawan` | User guide, langsung ke bagian Perpustakaan |
| `/tutorial/presentation` | Mode presentasi **16:9 (1920×1080)**, keyboard + fullscreen |
| `/tutorial/presentation?export=1` | Staging siap cetak → PDF (1 halaman = 1 slide) |

Semua rute bersifat **publik (tanpa login)** — dokumentasi tidak membutuhkan
akun maupun kredensial Supabase. Data yang tampil pada tutorial seluruhnya
**mock fiktif** (folder `src/presentation/mock/`), tidak pernah dibaca/ditulis
ke database produksi.

---

##1. Purpose (Tujuan)

1. **User guide** aplikasi per peran (Admin, Guru, Pustakawan).
2. **Interactive HTML presentation** dengan prinsip desain dari
   [frontend-slides](https://github.com/zarazhangrui/frontend-slides):
   HTML-first, visual storytelling, fixed 16:9 stage, progressive disclosure,
   intentional animation, avoid dense text, visual hierarchy,
   screenshot/UI-driven explanation.
3. **Presentation mode** dengan navigasi keyboard, progress, fullscreen.
4. **Export PDF** (browser rendering / Playwright) —1 halaman =1 slide 16:9.
5. **Export PPTX** (PptxGenJS) — 16:9, teks tetap *text* (editable).

---

##2. Architecture

```
src/
├── router/index.js                 # menambahkan route /tutorial (publik)
└── presentation/                   # ← modul tutorial (self-contained)
    ├── components/
    │   ├── TutorialLayout.vue      # chrome docs (re-use design tokens)
    │   ├── TutorialView.vue        # mode dokumentasi HTML
    │   ├── PresentationView.vue    # stage16:9 + controls + export
    │   ├── SlideRenderer.vue       # render1 slide dari model (semua layout)
    │   └── screens/                # rekonstruksi UI aplikasi (1280×800)
    │       ├── ScreenFrame.vue     # scaling contain (tanpa distorsi)
    │       ├── MockAppFrame.vue    # sidebar+topbar meniru AppLayout
    │       ├── LoginScreen.vue · DashboardScreen.vue · PresensiScreen.vue
    │       ├── RekapScreen.vue · RekapSemesterScreen.vue · StatistikScreen.vue
    │       ├── SiswaScreen.vue · GuruScreen.vue · KalenderScreen.vue
    │       ├── PengaturanScreen.vue · AktivitasScreen.vue · PanduanScreen.vue
    │       └── Perpus… Buku… Sirkulasi… Kunjungan… Kartu… Laporan…
    │       └── index.js            # registry screen key → komponen
    ├── slides/                     # ★ SHARED SLIDE MODEL (single source)
    │   ├── model.js                # skema + SECTIONS + helper
    │   ├── intro.js · admin.js · guru.js · library.js
    │   ├── security.js · closing.js · index.js
    ├── mock/                       # data fiktif (konsisten antar slide)
    │   ├── admin.ts · guru.ts · kelas.ts · siswa.ts
    │   ├── presensi.ts · statistik.ts · library.ts · index.ts
    ├── export/
    │   ├── pptx.js                 # slide model → PptxGenJS
    │   └── pdf.js                  # buka staging cetak (window.print)
    └── styles/stage.css            # fixed16:9 stage + print CSS (@page)
scripts/
└── export-pdf.mjs                  # PDF presisi via Playwright
docs/presentation/README.md         # file ini
```

### Shared slide model (satu sumber kebenaran)

```js
// src/presentation/slides/index.js
export const slides = [
  {
    id: 'admin-dashboard',
    section: 'admin',        // intro|admin|guru|library|security|flow|closing
    role: 'admin',           // all|admin|guru|pustakawan
    layout: 'feature',       // cover|divider|feature|grid|flow|lanes|bullets|closing
    title: 'Dashboard Presensi',
    kicker: 'Admin · Langkah02',
    description: '…',
    goal: '…',               // tujuan fitur
    steps: ['…'],            // langkah penggunaan
    watchouts: ['…'],        // hal yang perlu diperhatikan
    screen: 'dashboard-admin',     // registry rekonstruksi UI
    screenTable: { caption, headers, rows, note }, // ringkas → PPTX table
  },
]
```

- **HTML tutorial** membaca `slides` → daftar fitur + panel detail.
- **Presentation mode** membaca `slides` → stage 1920×1080.
- **PDF** merender slide HTML yang sama (`?export=1`).
- **PPTX** memetakan field slide yang sama ke teks/shape/table native.

Dengan demikian **HTML = PDF = PPTX** selalu konsisten.

---

##3. Mock data

Folder `src/presentation/mock/` — seluruhnya **fiktif, lokal, tanpa Supabase**:

| File | Isi |
|---|---|
| `admin.ts` | Admin **Budi Santoso**, identitas madrasah demo, periode 2026/2027 Ganjil, tanggal demo 22 Sep 2026 |
| `guru.ts` | **Siti Rahmawati** (wali 5A), Dewi Lestari (5B), Agus Setiawan (6A), Nur Aini (Pustakawan) |
| `kelas.ts` | Kelas **5A, 5B, 6A** (10/10/12 siswa, total 32) |
| `siswa.ts` | **Ahmad Fauzan, Nabila Putri, Rizky Maulana** + nama lain, NISN karangan, riwayat kelas |
| `presensi.ts` | Presensi 22 Sep: 5A `H8 I1 S1`, 5B `H9 S1`, **6A belum presensi**; matriks rekap; rekap semester |
| `statistik.ts` | % bebas alfa konsisten dengan rumus aplikasi `(hari−Alfa)/hari`, ambang demo 90% → 2 siswa |
| `library.ts` |128 judul/462 eksemplar, katalog, sirkulasi, kunjungan, laporan |

Angka dirancang konsisten lintas slide: dashboard (`17 hadir · 85%`),
rekap bulanan (15 hari tercatat), semester (50 hari), statistik, dan
monitoring ("1 kelas belum presensi") saling terhubung.

**Rekonstruksi UI** (`screens/`) memakai token & class design system yang sama
(`card-flat`, `.table`, `.badge-*`, `.segmented`, warna attendance exact) dan
diberi label **DEMO** agar jelas bukan tangkapan layar produksi.

---

##4. How to run

```bash
npm install
# .env wajib ada (sudah dibutuhkan aplikasi sebelum tutorial; lihat .env.example)
npm run dev
# buka http://localhost:5173/tutorial
```

Build produksi:

```bash
npm run build && npm run preview
```

> Catatan: aplikasi (termasuk /login) selalu membutuhkan `VITE_SUPABASE_URL` /
> `VITE_SUPABASE_ANON_KEY` untuk boot — perilaku lama yang tidak diubah.
> Halaman tutorial **tidak membaca data Supabase apa pun**; cukup placeholder
> env agar shell aplikasi ter-mount.

---

##5. How to export PDF

**Cara A — dari aplikasi (browser):**
1. Buka `/tutorial` → tombol **Export PDF**
   (atau `/tutorial/presentation` → ikon ⭳ → *Export PDF*).
2. Staging `?export=1` menampilkan semua slide, CSS `@page size:20in 11.25in`
   (= 1920×1080 px @96dpi) → **1 halaman = 1 slide, rasio16:9**.
3. Klik **Cetak / Simpan PDF** → pilih *Save as PDF*, margin: None,
   Background graphics: ON.

**Cara B — presisi via Playwright (CI/headless):**

```bash
npm install
npm run build
npx playwright install chromium     # sekali saja
npm run preview &                  # http://localhost:4173
npm run export:pdf                 # hasil: out/tutorial-presensi-siswa.pdf
```

`preferCSSPageSize: true` memaksa ukuran halaman mengikuti `@page` →
tepat 16:9, tanpa potong, font & layout identik dengan HTML.

---

##6. How to export PPTX

Dari aplikasi: `/tutorial` → tombol **Export PPTX**
(atau menu ⭳ pada presentation mode).

- Library: **pptxgenjs** (dynamic import — tidak membebani chunk awal).
- Layout `LAYOUT_16x9` (13.333in × 7.5in).
- Teks (judul, langkah, kartu) = **text box native → editable**.
- `screenTable` pada slide model dirender sebagai **table PowerPoint native**.
- Tidak ada slide kosong: setiap slide mendapat header + konten dari model.
- Hasil: `tutorial-presensi-siswa.pptx` (nama file di `export/pptx.js`).

---

##7. How to add slides

1. Tambah objek baru di file section yang sesuai
   (`slides/intro.js` … `slides/closing.js`) — atau buat file baru lalu
   gabungkan di `slides/index.js`.
2. Isi skema minimal: `id` (unik), `section`, `role`, `layout`, `title`.
3. Untuk layout `feature`, isi `goal`, `steps` (≤6), `watchouts` (≤4),
   dan `screen` (key registry) + opsional `screenTable` untuk PPTX.
4. Secara otomatis muncul di: daftar fitur `/tutorial`, presentation mode,
   PDF, dan PPTX — tanpa duplikasi konten.

Batas densitas (`LAYOUT_LIMITS` di `slides/model.js`): steps≤6, bullets≤8,
cards≤6, flow≤10 — lampaui itu, **split slide**, jangan mengecilkan teks.

##8. How to modify tutorial content

- **Teks langkah/tujuan** → edit objek slide di `slides/*.js` (source of truth).
- **Angka demo** → edit `mock/*.ts`; pastikan konsistensi antar file
  (lihat komentar `presensi.ts`).
- **Rekonstruksi UI** → edit komponen di `components/screens/*.vue`
  (author tetap 1280×800, tanpa breakpoint responsif — Tailwind `sm:`/`lg:`
  mengikuti *viewport*, bukan stage).
- **Gaya presentasi** → `styles/stage.css` + class di `SlideRenderer.vue`;
  warna attendance **tidak boleh diubah** (Hadir #047857 · Izin #0369A1 ·
  Sakit #D97706 · Alfa #BE123C).

##9. Navigation (presentation mode)

| Kontrol | Aksi |
|---|---|
| `→` / `Space` / `PageDown` / tombol ⏵ | Slide berikutnya |
| `←` / `PageUp` / tombol ⏴ | Slide sebelumnya |
| `Home` / `End` | Slide pertama / terakhir |
| `F` | Toggle fullscreen |
| `Esc` | Keluar fullscreen (browser) |
| Swipe (mobile) | Geser kiri/kanan |
| `?slide=<id>` | Deep-link ke slide tertentu |
| Progress bar atas | Progres deck |

##10. Batasan yang diketahui (known limitations)

- Ekspor PDF dari browser sangat bergantung dialog cetak (paper size bisa
  perlu dipilih manual); untuk hasil presisi gunakan `npm run export:pdf`.
- PPTX memakai *screenTable* (tabel ringkas) sebagai perwakilan screenshot —
  rasterisasi penuh DOM tidak dilakukan agar teks tetap editable & andal.
- Rekonstruksi UI adalah **gambaran visual** fungsi nyata, bukan tangkapan
  layar production; ditandai label `DEMO`.
- Sitemap fitur mengikuti source code per commit ini; fitur baru aplikasi
  perlu ditambahkan ke slide model agar tutorial ikut diperbarui.

##11. Prinsip desain (dari frontend-slides, diadaptasi)

- **HTML-first** — slide adalah DOM; PDF/PPTX turunan dari model yang sama.
- **Fixed16:9 stage** — author 1920×1080, scale transform menyeluruh,
  letterbox/pillarbox; tidak pernah reflow per device, tanpa overflow.
- **Progressive disclosure** — `.reveal` bertahap (stagger65ms) hanya saat
  slide aktif; menghormati `prefers-reduced-motion`.
- **Visual storytelling** — tiap fitur didahului rekonstruksi UI, teks pendukung.
- **Avoid dense text** — langkah ≤6 butir, kartu ≤6, split slide bila lebih.
- **Intentional animation** — transisi slide ringan (fade320ms), tanpa
  dekorasi neon/glow/gradient berlebih; mengikuti arah desain institusional
  aplikasi (emerald primary, gold aksen terbatas).

## 12. Video narasi per modul

Tujuh file video (1920×1080, H.264 + narasi AAC) di `docs/presentation/video/` —
satu per bagian, agar ukuran masing-masing ringan dan bisa dibagikan terpisah:

| File | Slide | Durasi |
|---|---|---|
| `01-pendahuluan.mp4` |5 | ±23 dtk |
| `02-admin.mp4` |13 | ±35 dtk |
| `03-guru.mp4` |10 | ±35 dtk |
| `04-perpustakaan.mp4` |9 | ±29 dtk |
| `05-keamanan.mp4` |6 | ±23 dtk |
| `06-alur-end-to-end.mp4` |3 | ±18 dtk |
| `07-penutup.mp4` |4 | ±21 dtk |

**Narasi:** suara perempuan Indonesia (`voice-01`, hasil audisi TTS session) —
naskahBahasa Indonesia per bagian, tanpa data produksi.

**Sinkronisasi:** dwell tiap slide = `durasi narasi / jumlah slide` (min2 detik),
dihasilkan dari durasi audio hasil TTS sehingga tempo mengikuti teks.

**Regenerasi (ringkas):**
1. Generate naskah per bagian → TTS (`generate_speech`, `voice_id`).
2. Rekam per section via Playwright `recordVideo` (viewport1920×1080,
   `?slide=<slide-pertama-section>`, ArrowRight antar slide, dwell dari durasi audio).
3. Mux: `ffmpeg -i modul.webm -i narasi.mp3 -c:v libx264 -pix_fmt yuv420p -crf20
   -c:a aac -af apad -shortest -movflags +faststart modul.mp4`.
