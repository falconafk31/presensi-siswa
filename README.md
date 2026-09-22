# 🏫 Sistem Presensi & Perpustakaan Madrasah (Modern Web App)

Aplikasi Sistem Informasi terintegrasi berbasis web modern yang dirancang khusus untuk instansi pendidikan (Madrasah/Sekolah). Sistem ini menangani **Presensi Akademik** dan **Manajemen Perpustakaan (Sirkulasi Buku)** dalam satu portal terpadu. Proyek ini merupakan hasil migrasi dan pengembangan dari sistem *legacy* (Google Apps Script) menjadi arsitektur modern yang lebih cepat, skalabel, dan aman.
## SS UI Beranda presensi
* https://github.com/user-attachments/assets/6ea526e4-f040-4332-9894-a89a720e4ea6
* https://github.com/user-attachments/assets/cca026fd-58d4-4287-83de-7deeec00f285

## SS UI Perpustakaan
* https://github.com/user-attachments/assets/73d66672-559b-4c73-b969-354c2a120986
* https://github.com/user-attachments/assets/fdfb4e81-8fca-4715-b1d7-e2f8e5b1c9b2

## 🚀 Tech Stack

Aplikasi ini dibangun menggunakan teknologi web terkini:

* **Frontend Framework:** [Vue 3](https://vuejs.org/) (Composition API & `<script setup>`)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/)
* **State Management:** [Pinia](https://pinia.vuejs.org/)
* **Routing:** [Vue Router](https://router.vuejs.org/)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL & Auth)
* **PDF Generation:** `jspdf` & `jspdf-autotable` (PDF Export yang dioptimasi untuk kecepatan & ukuran kecil)
* **Excel Generation:** `xlsx` (Cetak Rekap Bulanan & Semester ke Excel)
* **Charts:** `chart.js` & `vue-chartjs`
* **Icons:** `lucide-vue-next` (tree-shakeable, ringan)
* **Font:** `Inter Variable` self-host via [@fontsource-variable/inter](https://fontsource.org/fonts/inter) — tanpa CDN eksternal
* **Notifikasi:** `vue-sonner` (toast ringan, mudah diselaraskan dengan Tailwind)
* **Utilities:** `@vueuse/core` (composables siap pakai)
* **UI Primitives:** Komponen UI kustom berbasis Tailwind CSS (modal, dropdown, segmented control) — tanpa library UI berat
* **Deployment:** [Vercel](https://vercel.com/)

## ✨ Fitur Utama

### 📊 Sistem Presensi & Administrasi
1.  **Dashboard Real-time:** Visualisasi statistik kehadiran harian dan tren bulanan menggunakan grafik interaktif.
2.  **Manajemen Data Master (CRUD):** Pengelolaan data Siswa dan Guru (Wali Kelas) secara terpusat dengan antarmuka unggah (Upload) Excel bergaya *Drag-and-Drop* (*Glassmorphism*) yang modern.
3.  **Input Presensi Cerdas:**
    * Validasi otomatis terhadap Kalender Akademik (mencegah input pada hari libur).
    * Kunci Kelas (Security Lock): Guru hanya dapat mengakses dan mengisi kelas ampuan mereka.
    * Antarmuka *Segmented Control* (Hadir/Izin/Sakit/Alfa) untuk input cepat massal.
4.  **Rekapitulasi & Ekspor Laporan:**
    * Rekapitulasi dilengkapi dengan indikator **Total Hari Efektif**, **Total Hari Libur**, dan rumus persentase yang transparan untuk akuntabilitas pelaporan ke orang tua dan sekolah.
    * Pembuatan matriks kehadiran bulanan dan semester.
    * Cetak dokumen PDF yang dilengkapi dengan **Kop Surat Resmi Kementerian Agama**, penanda hari libur otomatis (warna merah), dan auto-stretch kolom presisi.
    * Ekspor data ke format **Excel (.xlsx)** lengkap dengan Nama Wali Kelas dan NIP.
5.  **Panduan Penggunaan Built-in:** Buku manual digital interaktif terpadu di dalam aplikasi untuk memandu setiap *role* (Admin, Guru, Pustakawan). Memiliki panduan solusi penanganan *Cache / Blank Screen*.

### 📚 Sistem Perpustakaan (Modul Baru)
1.  **Katalog Buku:** Manajemen data buku (Judul, Pengarang, Penerbit, Tahun, Stok).
2.  **Sirkulasi Cerdas:** Peminjaman dan Pengembalian dengan auto-kalkulasi stok secara *real-time*.
3.  **Kunjungan Scanner QR:** Pencatatan kunjungan kilat menggunakan *Barcode / QR Scanner* (dukungan kamera HP/Laptop) lengkap dengan feedback suara (berhasil/gagal).
4.  **Laporan Perpustakaan:** Cetak riwayat sirkulasi, status peminjaman aktif, dan daftar kunjungan harian ke PDF secara mudah. Judul laporan kini menggunakan Nama Perpustakaan khusus (*custom*) dari menu Pengaturan.
5.  **Cetak Kartu Perpustakaan Premium:** Menghasilkan ID Card fisik bolak-balik (Depan & Belakang berisi Tata Tertib) yang sepenuhnya dioptimalkan dengan CSS Grid, tipografi bersih, *watermark*, dan format vektor untuk cetak resolusi tinggi.
5.  **Hak Akses Khusus:** Mendukung *role* **Pustakawan** murni, serta *role* **Guru & Pustakawan** bagi guru wali kelas yang juga ditugaskan mengurus perpustakaan.

### ⚙️ Engine Inti
1.  **Pengaturan Dinamis & Cerdas:** Konfigurasi identitas sekolah (Nama, Kepala Sekolah, Kop Surat, **Nama Kustom Perpustakaan**) dan pengaturan **Hari Libur Mingguan** yang fleksibel.
2.  **Manajemen Tingkat Lanjut & Zona Berbahaya:**
    * **Kenaikan Kelas Otomatis:** Sistem yang otomatis meluluskan siswa tingkat akhir dan menaikkan kelas lainnya secara masif di akhir tahun.
    * **Reset Database (Wipe):** Fungsi *reset* sekali klik khusus Admin untuk menghapus data absensi/log lama, memastikan database Supabase tier gratis tetap lega.
4.  **Arsitektur Bersih (Pure SPA):** 
    * Penggunaan *Client-Side Pagination* (25 baris per halaman) pada data statistik mengefisienkan *rendering* tabel.
    * Penggunaan *Dynamic Import (Lazy Loading)* untuk pustaka berat seperti `xlsx`, `jspdf`, `chart.js`, dan `html5-qrcode`, membuat ukuran pemuatan awal halaman menjadi instan.
    * Sistem bersih dari ketergantungan PWA sehingga terhindar dari konflik *cache* ganda, menjadikan aplikasi jauh lebih stabil sebagai *Single Page Application* standar.

## ⚡ Performa & Strategi Loading (Anti-Kedip)

Urutan boot aplikasi dirancang agar **tidak ada layar putih atau kedipan (*flicker*)** saat pertama dibuka:

1. **Boot Splash Instan (App Shell, Netral & Multi-Sekolah)** — `index.html` memuat splash (spinner + judul generik "Sistem Presensi & Perpustakaan") yang digambar langsung oleh browser via HTML/CSS *inline*, **tanpa menunggu JavaScript** — tanpa nama/logo sekolah bawaan karena aplikasi bersifat global. Logo madrasah yang diunggah melalui menu **Pengaturan → Identitas Madrasah → Unggah Logo** di-cache ke `localStorage` dan di-*inject* ke splash oleh *script inline* — sehingga pada kunjungan berikutnya **splash menampilkan logo madrasah Anda sendiri** sejak frame pertama. Warna latar splash disamakan dengan latar aplikasi (`#f8fafc`) agar pergantian splash → halaman penuh mulus dalam satu frame.
2. **Mount Setelah Rute Siap** — `main.js` menunggu `router.isReady()` sebelum `app.mount()`, sehingga chunk halaman pertama sudah termuat saat splash hilang (tidak ada urutan "kosong → skeleton → konten").
3. **Profil User dari Cache Lokal** — setelah login, profil (nama, role, kelas) disimpan di `localStorage`. Pada kunjungan berikutnya profil di-hidrasi sinkron sehingga boot **tidak menunggu round-trip jaringan ke Supabase**; refresh profil berjalan di *background*. Fallback batas waktu boot 5 detik memastikan splash tidak pernah menggantung walau jaringan lambat.
4. **Font Self-Hosted (Inter Variable)** — tidak ada lagi CDN Google Fonts (tanpa DNS lookup + *render-blocking stylesheet* eksternal). Inter dimuat dari bundle via `@fontsource-variable/inter`: satu file *variable font* untuk semua bobot, `font-display: swap`, dan `unicode-range` (browser hanya mengunduh subset latin ±48 kB).
5. **Chart.js Lazy-Load** — Chart.js (±266 kB) hanya termuat saat dashboard yang memakai grafik dirender (via `src/lib/chartSetup.js`).
6. **Supabase Realtime Lazy-Load** — `@supabase/supabase-js` selalu meng-instansiasi `RealtimeClient` di constructornya; melalui *alias* + *shim* `src/lib/lazyRealtime.js`, paket `@supabase/realtime-js` (±57 kB) dipisah menjadi chunk on-demand yang **hanya diunduh saat fitur realtime dipakai** (dashboard presensi). Saat diaktifkan, shim membangun instance `RealtimeClient` **asli** secara normal lalu menggantikan `supabase.realtime` — semua field internal kelas asli terinisialisasi sempurna. Halaman login dan user Pustakawan murni tidak mengunduhnya sama sekali.
7. **Cache Aset Immutabel** — `vercel.json` mengirim header `Cache-Control: public, max-age=31536000, immutable` untuk semua file di `/assets/*` (nama file ber-*hash* konten), sehingga kunjungan berikutnya memuat aplikasi nyaris instan dari cache browser.

> **Catatan audit bundle:** konfigurasi `manualChunks` object-form lama sempat membuat Rollup meng-hoist *runtime Vue* ke dalam chunk `vendor-chart`, sehingga Chart.js ikut termuat di **setiap halaman** (±178 kB gzip jalur kritis). Setelah perbaikan (chunking default Rollup + font self-host + realtime lazy), jalur kritis boot kini hanya **1 file JS ±96 kB gzip + CSS ±10 kB gzip + 1 file font ±48 kB**, dan seluruh chunk berat (chart.js 186 kB, xlsx 429 kB, jspdf, html5-qrcode, realtime-js) ter-*lazy-load* sesuai kebutuhan halaman.

**Hasil audit layout & kode (sudah dibereskan):** penghapusan 7 file komponen/view yang tidak terpakai (`BaseModal`, `EmptyState`, `PageHeader`, `Pagination`, `SkeletonLoader`, `StatusBadge`, `ComingSoonView`), pembersihan artefak build dari repositori (`dev-dist/` PWA lama, `vite.config.js.timestamp-*.mjs`), penghapusan seluruh *hardcode* nama sekolah ("MIN Blora") dari UI/laporan agar tetap netral untuk multi-madrasah, serta verifikasi bahwa `AppLayout` sudah mengikuti praktik baik: *sticky header*, sidebar responsif + mode collapse, *bottom navigation* mobile dengan *safe-area*, atribut aksesibilitas (ARIA), dukungan `prefers-reduced-motion`, dan target sentuh ≥ 44px di perangkat layar sentuh.

### 📐 Vertical Density (Desktop 1366×768 / 1440×900)

Dashboard & sidebar dirancang agar informasi utama muat **tanpa scroll vertikal pada state normal**:

- **Footer sidebar = identity block compact** — hanya avatar inisial + nama + role (±54 px). Aksi **Refresh** dan **Keluar** sengaja **tidak diduplikasi** di sidebar; keduanya cukup dijangkau lewat menu profil di pojok kanan atas. Pada mode *collapsed*, footer menampilkan **avatar saja** (dengan *tooltip* nama) — tanpa tombol apa pun. Drawer mobile juga hanya menampilkan identitas, tanpa logout duplikat. Footer bersifat *shrink-0 bottom-aligned* sehingga tidak mendorong menu navigasi dan tidak menambah *scrollbar* baru.
- **Dashboard satu layar penuh (target viewport 640 px / layar 1366×720):** stat cards menjadi **KPI bar** satu kartu (5/4 kolom ber-divider, ±46 px), quick actions menjadi **baris pill** (±32 px), banner "Perlu Perhatian"/libur/belum-absen menjadi **strip 1 baris** (±36 px) dengan chip kelas & nama siswa inline, subtitle *page header* menyatu dengan judul (mode `inline`), chip filter kelas compact 28 px agar 13 kelas muat satu baris, tinggi grafik adaptif `clamp()` (tren presensi 140–220 px, donut 120–180 px, tren perpustakaan 104–150 px), dan daftar panjang memakai *scroll internal kartu*. Estimasi total dashboard ±450–520 px — seluruh section/menu dipertahankan.
- **Konsistensi warna ikon** — format kotak ikon seragam via token `ICON_CHIP` di `designSystem.js` (`bg-50 + ring-200 + text-600` per tone semantic: emerald/sky/amber/rose/blue/slate), dipakai KPI bar, chip kunjungan, dan aksi cepat.
- **Filter tren responsif (Dashboard System konsisten)** — desktop: kontrol horizontal di header kartu (tetap compact); mobile: mode di bawah judul lalu tanggal/bulan/tahun sebagai grid 2 kolom full-width — tanpa horizontal scroll. Root cause (`shrink-0` pada wrapper actions `AppCard`) diperbaiki global.
- **Warna status kehadiran terpusat & exact** — token `ATTENDANCE_COLORS` di `designSystem.js` (Hadir `#047857`, Izin `#0369a1`, Sakit `#d97706`, Alfa `#be123c`, source of truth: header tabel Rekap); dipakai konsisten oleh chart/legend, segmented control Input Presensi, ringkasan H/I/S/A, dan tint kartu siswa.
- **Safe area mobile global** — padding bawah konten utama = `calc(61px + env(safe-area-inset-bottom) + 16px)` (tinggi bottom-nav + breathing room), diterapkan di satu titik (`AppLayout`) untuk seluruh view; memperbaiki bug konten terakhir tertutup bottom-nav pada rentang 640–1023px (dulu `sm:p-5` menimpa padding) dan perangkat ber-inset (iPhone). Sticky save bar Input Presensi mengikuti offset yang sama.
- **Verifikasi layout budget** — perhitungan tinggi per-section dan skenario worst-case didokumentasikan di [`docs/layout-budget.md`](docs/layout-budget.md); verifikasi manual + CI otomatis (`.github/workflows/ci.yml`) menjaga guard binding & build produksi di setiap push.
- **Grafik adaptif tinggi layar** — tinggi chart memakai CSS `clamp()` berbasis `vh` (tren presensi 150–208 px, donut 130–176 px, tren perpustakaan 130–240 px) sehingga menyusut otomatis di layar pendek (1366×768) dan membesar di layar tinggi.
- **Kartu "Kunjungan" perpustakaan** dipadatkan menjadi 3 *chip* satu baris (ikon + angka + label) dan daftar "Peminjaman Terakhir" memakai *scroll internal kartu* — seluruh informasi utama tetap tersedia, menu/section tidak ada yang diubah.
- **Guard regresi binding template** — `scripts/check-template-bindings.mjs` meng-compile seluruh SFC dan gagal-build bila ada binding template yang tidak terdefinisi (mencegah error runtime seperti "x is not a function"); terpasang otomatis di `npm run build`.

## 🧭 Backlog Optimasi Lanjutan (Opsional)

Item berikut **tidak mendesak** — aplikasi saat ini sudah ringan dan stabil. Catatan untuk pengembangan selanjutnya:

1. **`html5-qrcode` (±384 kB, hanya di halaman Scan QR)** — sudah *lazy-load* per rute, tetapi jika ingin lebih ringan lagi, pertimbangkan migrasi ke *native* [`BarcodeDetector` API](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) dengan fallback `html5-qrcode` untuk browser lama.
2. **Kompresi logo saat unggah** — kompres/resize gambar logo di sisi klien (mis. maks. 256×256 px, WebP) sebelum masuk Storage, agar splash & sidebar semakin ringan.
3. **Upgrade `@supabase/supabase-js`** — jika versi baru menyediakan *lazy realtime* bawaan, shim `src/lib/lazyRealtime.js` bisa dilepas.
4. **Monitoring error runtime** (mis. Sentry/GlitchTip) untuk menangkap error di perangkat sekolah yang tidak terlihat saat development.
5. **CI + test otomatis** (Vitest + Vue Test Utils) untuk alur kritis: auth, guard rute, dan kalkulasi rekap.
6. **Virtualisasi tabel** (mis. `@tanstack/vue-virtual`) hanya jika jumlah siswa tumbuh sangat besar — saat ini *client-side pagination* 25 baris per halaman masih sangat efisien.


## 🎨 Design System

UI/UX aplikasi ini menggunakan pendekatan *Professional, Clean & Official*, disesuaikan dengan identitas instansi:
* **Primary Color:** `#064e3b` (Hijau Kemenag) dengan sentuhan *Gradients*
* **Accent Color:** `#FBBF24` (Kuning Emas)
* **Typography:** Font `Inter` untuk kemudahan membaca.
* **Bentuk & Tekstur:** Penggunaan sudut membulat (`rounded-xl`), efek *Glassmorphism* (`backdrop-blur`), *Sticky Footer*, dan *Micro-animations* (hover & scale effects) untuk antarmuka yang sangat responsif dan memanjakan mata.

## 🛠️ Instalasi & Konfigurasi Lokal

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di mesin lokal Anda menggunakan VS Code.

### 1. Prasyarat
* [Node.js](https://nodejs.org/) (Versi 18+ direkomendasikan)
* Akun [Supabase](https://supabase.com/)
* Git

### 2. Clone Repository & Install Dependensi
```bash
# Clone repository ini (jika sudah di-push ke GitHub)
git clone https://github.com/falconafk31/presensi-siswa.git
cd presensi-siswa

# Install semua dependensi NPM
npm install
```

### 3. Konfigurasi Environment & Database Supabase
Salin `.env.example` ke `.env` dan isi dengan URL serta Anon Key dari proyek Supabase Anda:
```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```
Pastikan Anda sudah menjalankan seluruh *script* SQL yang berada di dalam folder `supabase/` secara berurutan di SQL Editor Supabase Anda untuk membentuk *schema*, *RLS*, dan *Storage*.

### 4. Jalankan Development Server
```bash
npm run dev
```
Buka `http://localhost:5173` di *browser*. 
* Login Admin: `admin / admin123`
* Login Guru: `guru1 / guru123` (jika menggunakan data *seed*)
* Hak Akses tersedia: **Admin**, **Guru**, **Pustakawan**, dan **Guru & Pustakawan**.

### 5. Mengubah Username Admin / Menambah Admin Baru
Sistem keamanan Supabase secara ketat menggunakan email untuk identitas (*under the hood* menggunakan ekstensi `@minblora.id`). Jika Anda ingin mengubah username `admin` menjadi nama lain (misal: `kepsek`):
1. **Login** menggunakan akun Admin bawaan.
2. Buka menu **Guru & Wali Kelas**.
3. Klik **+ Tambah Akun** dan buat akun baru dengan username `kepsek`, lalu set **Role = Admin**.
4. Logout, kemudian login kembali menggunakan akun `kepsek` yang baru saja dibuat.
5. Hapus akun `admin` yang lama jika sudah tidak diperlukan.

### 6. Deployment ke Vercel (Produksi)
Proyek ini sudah dilengkapi dengan `vercel.json` untuk menjamin lalu lintas *Vue Router* berjalan lancar tanpa *Error 404* saat pengguna melakukan *refresh* di URL anak (contoh: `/siswa` atau `/rekap`).
- Cukup hubungkan *repository* Github Anda ke Dashboard Vercel.
- *Build command* yang berjalan otomatis adalah `npm run build` dan foldernya adalah `dist`.
- Vercel akan otomatis mengenali konfigurasi tersebut!

Proyek ini dapat digunakan, dimodifikasi, dan didistribusikan secara **bebas** (Free to use / Open Source) untuk keperluan pendidikan maupun instansi Anda.

## ☕ Dukungan & Donasi

Jika aplikasi ini bermanfaat bagi madrasah/sekolah Anda, Anda dapat memberikan dukungan agar proyek ini terus dikembangkan melalui:

<a href="https://saweria.co/falconafk31" target="_blank">
  <img src="https://img.shields.io/badge/Donate_via-Saweria-FBBF24?style=for-the-badge" alt="Donate via Saweria" />
</a>
