# Changelog

Semua perubahan yang signifikan pada proyek ini akan didokumentasikan dalam file ini.

Format changelog berdasarkan pedoman [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini akan mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.11] - 2026-09-21

### Diperbaiki (Fixed)
- **Warna aktif segmented control dipastikan solid & per-status (anti-fallback hijau):** utilitas warna aktif kini `!important` (menang pasti atas rule komponen `[aria-pressed]` yang ber-background putih di semua browser), dan fallback tone option tanpa warna diubah dari `primary` (hijau) ke `neutral` — menutup satu-satunya jalur "semua status jadi hijau". Nilai terverifikasi di CSS produksi: rgb(4 120 87) / rgb(3 105 161) / rgb(217 119 6) / rgb(190 18 60).

## [0.2.10] - 2026-09-21

### Diubah (Changed)
- **Segmented control status kehadiran:** tombol ACTIVE kini **solid warna status masing-masing + teks putih** (bukan tint, bukan satu warna global) — Hadir `#047857`, Izin `#0369a1`, Sakit `#d97706`, Alfa `#be123c` (exact Rekap/`ATTENDANCE_COLORS`); warna dipilih per option via `tone` dari `ATTENDANCE_STATUS`. Inactive: teks digelapkan (slate-700, semibold) di atas container netral.

## [0.2.9] - 2026-09-21

### Diperbaiki (Fixed)
- **Filter tren dashboard terdorong keluar viewport (mobile):** wrapper actions `AppCard` bersifat `shrink-0` sehingga grup kontrol tren (3 chip + 2 select ≈ 380px) memaksa lebar max-content → tahun terdorong keluar & halaman bisa di-swipe horizontal. Perbaikan global: wrapper kini `min-w-0 flex-wrap`; kedua dashboard menambahkan tata letak mobile khusus — mode tabs di bawah judul, tanggal/bulan/tahun sebagai grid 2 kolom full-width (desktop tidak berubah: kontrol tetap horizontal di header).

### Diubah (Changed)
- **Warna status kehadiran konsisten & exact** (source of truth: tabel Rekap): token `ATTENDANCE_COLORS` baru di `designSystem.js` — Hadir `#047857`, Izin `#0369a1`, Sakit `#d97706`, Alfa `#be123c`; `CHART_COLORS` (donut/line) disejajarkan; segmented control Input Presensi memakai fill exact; ringkasan H/I/S/A diperbaiki (amber-700→amber-600, rose-600→rose-700); kartu siswa Input Presensi mendapat tint subtle + border sesuai status terpilih (tetap putih/netral, label & `aria-pressed` dipertahankan — tidak color-only).

## [0.2.8] - 2026-09-21

### Diperbaiki (Fixed)
- **Konten tertutup bottom navigation (root cause global):** `sm:p-5` menimpa padding bawah konten pada rentang 640–1023px sementara bottom-nav baru tersembunyi di ≥1024px — konten terakhir (mis. baris terakhir Rekap) tertutup nav. Kini padding bawah konten = `calc(61px + env(safe-area-inset-bottom) + 16px)` di satu titik global (`AppLayout`), mencakup inset iOS/gesture navigation. Sticky save bar Input Presensi turut disesuaikan offset-nya.

### Diubah (Changed)
- **Dashboard presensi (density final):** KPI bar min. 60px, pill aksi cepat 48px (touch ≥44px), donut 140–170px dengan daftar "Tidak Hadir" yang readable (nama wrap, tidak truncate, scroll internal), grafik tren 200–240px desktop, jarak antar-section 10–12px. Urutan section sesuai standar: header → filter kelas → strip status → stats → quick actions → trend+komposisi (2/3 : 1/3).
- **Dashboard perpustakaan:** layout baru — Trend (2/3) + Kunjungan (1/3) sejajar, **Peminjaman Terakhir full width** (tetap 5 transaksi, list 2 kolom dengan scroll internal), KPI 60px, pill 48px, grafik 200–240px.
- **Sidebar:** tinggi item menu 34px (dari ±37px), jarak antar-grup lebih rapat — seluruh menu dipertahankan.

## [0.2.7] - 2026-09-21

### Ditambahkan (Added)
- **`docs/layout-budget.md`** — verifikasi aritmetika "dashboard muat 1 layar" (viewport ≥ 610 px): tabel tinggi per-section dari nilai CSS terkompilasi, skenario worst-case presensi (±596 px) & perpustakaan (±568 px), panduan verifikasi manual, dan pedoman menjaga budget untuk kontributor.
- **CI otomatis** (`.github/workflows/ci.yml`) — menjalankan guard binding template + build produksi pada setiap push/PR.

## [0.2.6] - 2026-09-21

### Diubah (Changed)
- **Dashboard muat satu layar penuh** di viewport 640 px (layar 1366×720 dengan browser normal), hasil perencanaan bersama:
  - Stat cards → **KPI bar** satu kartu dengan divider (±46 px); quick actions → **baris pill** (±32 px); banner libur/belum-absen/"Perlu Perhatian" → **strip 1 baris** berisi chip kelas, nama siswa Alfa, dan tombol aksi inline.
  - Subtitle *page header* menyatu dengan judul pada desktop (`inline`), chip filter kelas compact 28 px (13 kelas muat satu baris, tidak wrap), padding bawah konten desktop dipangkas.
  - Tinggi grafik adaptif viewport (`clamp()`): tren presensi 140–220 px, donut 120–180 px dengan ringkasan "Tidak Hadir" per grup (badge + nama inline, scroll internal), tren perpustakaan 104–150 px; daftar "Peminjaman Terakhir" scroll internal.
  - Seluruh section/menu dashboard dipertahankan tanpa mengurangi keterbacaan.
- **Konsistensi warna ikon:** token `ICON_CHIP` (bg-50 + ring-200 + text-600 per tone) di `designSystem.js` untuk KPI bar, chip kunjungan, dan aksi cepat. Ikon tidak diubah (mengikuti keputusan review).

## [0.2.5] - 2026-09-21

### Diperbaiki (Fixed)
- **Error "historyMeta is not a function" (/buku) & "formatDateID is not a function" (/peminjaman):** sebagian edit *script* pada sesi sebelumnya tidak tertulis ke file (service flaky) sementara edit *template*-nya selamat, sehingga template memanggil fungsi yang tidak pernah dideklarasikan. Semua helper telah dikembalikan: `historyMeta` (BukuView), serta `formatDateID`, `loanStatusMeta`, `hariTerlambat`, `activeLoanCount` (PeminjamanView).
- **Guard regresi:** `scripts/check-template-bindings.mjs` meng-compile seluruh SFC dan mendeteksi binding template yang tidak terdefinisi; terpasang di `npm run build` sehingga kelas error ini tidak bisa masuk lagi.

### Diubah (Changed)
- **Densitas dashboard lebih agresif (tanpa mengurangi keterbacaan):** padding kartu 12/14 px, tab filter 36 px, stat card & quick actions ramping (ikon 32 px), padding konten desktop dirapatkan; **tinggi grafik adaptif tinggi layar** via CSS `clamp()` (tren presensi 150–208 px, donut 130–176 px, tren perpustakaan 130–240 px); kartu "Kunjungan" perpustakaan menjadi 3 chip satu baris; daftar panjang scroll internal kartu. Seluruh section/menu dashboard dipertahankan.

## [0.2.4] - 2026-09-21

### Diubah (Changed)
- **Footer sidebar — identity block compact:** tombol **Refresh** dan **Keluar** dihapus dari sidebar (expanded & collapsed) karena sudah tersedia di menu profil kanan atas — tidak ada lagi duplikasi aksi. Footer kini hanya menampilkan blok identitas ramping (avatar inisial + nama + role); pada mode *collapsed* tampil avatar saja dengan *tooltip*. Drawer mobile juga tanpa tombol duplikat. Footer *bottom-aligned*, tidak mendorong navigasi, tanpa *overflow* baru.
- **Vertical density dashboard (presensi & perpustakaan):** jarak antar-seksi dirapatkan (16/20→12/16 px), margin ganda *page header* dihapus, *stat card* & *quick action* dirapatkan, **filter bulan/tahun tren digabung ke header kartu** (baris kontrol duplikat dihilangkan), tinggi grafik disesuaikan (tren 224/256 px, donut 192 px), dan daftar panjang memakai *scroll internal kartu*. Target: informasi utama muat tanpa *scroll* vertikal pada desktop 1366×768 / 1440×900 state normal — tanpa mengurangi keterbacaan.

## [0.2.3] - 2026-09-21

### Diperbaiki (Fixed)
- **Error realtime di dashboard** (`Cannot read properties of undefined (reading 'find')`): shim lazy-load realtime versi awal memakai *prototype-swap* yang membuat *class field* kelas `RealtimeClient` asli tidak pernah terinisialisasi (`channels` = undefined) sehingga subscribe channel gagal. Kini shim membangun instance asli secara normal dan menggantikannya ke `supabase.realtime` — subscribe realtime kembali berfungsi.

### Diubah (Changed)
- **/buku — popup Riwayat Peminjam:** tampilan compact (baris satu baris, padding rapat) sehingga muat tanpa *scroll* di desktop; header kolom dilengkapi ikon berwarna (Peminjam, Tgl Pinjam, Tenggat, Tgl Kembali, Status) dan badge status ber-ikon (Dipinjam biru, Dikembalikan hijau, Terlambat merah, Hilang abu).
- **/peminjaman — redesign tampilan sirkulasi:**
  - Tombol aksi **Kembalikan** kini memakai ikon panah kembali (`Undo2`) berwarna biru khas modul perpustakaan — lebih jelas bagi pengguna awam daripada ikon centang hijau sebelumnya.
  - Kolom baru **Tgl Pinjam** dan **Status** (badge ber-ikon: Dipinjam / Terlambat N hari / Dikembalikan), avatar inisial peminjam, tanggal batas kembali berwarna merah + ikon jam ketika terlambat.
  - Modal konfirmasi pengembalian diringkas dengan ikon, ringkasan transaksi (buku, peminjam, batas kembali, keterlambatan), dan tombol konfirmasi "Ya, Terima Buku".

## [0.2.2] - 2026-09-21

### Diubah (Changed)
- **Font self-hosted:** Inter kini dibundel via `@fontsource-variable/inter` (variable font, `font-display: swap`) — tanpa CDN Google Fonts, tanpa *render-blocking stylesheet* eksternal.
- **Boot splash netral & multi-sekolah:** splash tidak lagi menampilkan teks/nama sekolah atau placeholder logo "MIN". Judul generik "Sistem Presensi & Perpustakaan"; logo madrasah dari **Pengaturan → Identitas Madrasah → Unggah Logo** di-cache ke `localStorage` dan otomatis tampil di splash pada kunjungan berikutnya.
- **Branding netral:** seluruh *hardcode* "MIN Blora" dihapus dari UI & fallback laporan (sidebar, judul halaman, kartu, PDF) agar aplikasi layak untuk banyak madrasah.
- **`vercel.json`:** header `Cache-Control: immutable` untuk aset ber-*hash* di `/assets/*`.

### Ditambahkan (Added)
- **Lazy-load `@supabase/realtime-js`:** shim `src/lib/lazyRealtime.js` + alias Vite memisahkan realtime-js (±57 kB) menjadi chunk on-demand yang hanya diunduh saat fitur realtime dipakai (dashboard presensi); jalur kritis boot kini ±96 kB gzip (1 file JS).

## [0.2.1] - 2026-09-21

### Diperbaiki (Fixed)
- **Loading Awal Kedip-Kedip (Flicker):** Boot aplikasi kini mulus tanpa layar putih/kedip ±2 detik:
  - *Boot splash* bermerek digambar instan dari HTML/CSS inline `index.html` (tanpa menunggu JS), lalu diganti mulus saat aplikasi siap.
  - `app.mount()` menunggu `router.isReady()` sehingga splash hanya hilang tepat saat halaman pertama sudah ter-render penuh.
  - Profil user di-cache di `localStorage` dan di-hidrasi sinkron — kunjungan ulang tidak lagi menunggu round-trip jaringan ke Supabase sebelum aplikasi tampil; refresh profil berjalan di background. Disertai batas waktu boot 5 detik agar splash tidak pernah menggantung.
  - Google Fonts tidak lagi render-blocking (pola preload + print-swap).
- **Runtime Vue & Chart.js termuat di semua halaman:** `manualChunks` object-form lama meng-hoist runtime Vue ke chunk `vendor-chart` sehingga Chart.js (±264 kB) berada di jalur kritis setiap halaman. Chunking dikembalikan ke default Rollup; Chart.js kini lazy-load via `src/lib/chartSetup.js`. Jalur kritis boot turun ±38% (±178 kB → ±110 kB gzip).

### Dihapus (Removed)
- Kode mati yang tidak pernah di-import: `BaseModal`, `EmptyState`, `PageHeader`, `Pagination`, `SkeletonLoader`, `StatusBadge`, dan `ComingSoonView`.
- Artefak build dari repositori: `dev-dist/` (sisa PWA lama) dan `vite.config.js.timestamp-*.mjs`; kini didaftarkan di `.gitignore`.

## [0.2.0] - 2026-08-12

### Ditambahkan (Added)
- **Cetak Kartu Bolak-Balik:** Penambahan cetak sisi belakang (Back Side) kartu perpustakaan yang berisi tata tertib perpustakaan secara otomatis ketika mencetak PDF.
- **Log Aktivitas:** Sistem log aktivitas perpustakaan dan riwayat peminjaman buku untuk pelacakan yang lebih baik.
- **UI/UX Perpustakaan:** Pembaruan antarmuka tabel sirkulasi dan laporan perpustakaan agar lebih responsif di perangkat mobile dan memberikan informasi yang lebih intuitif dengan pagination.

## [0.1.0] - 2026-06-21

### Ditambahkan (Added)
- **Modul Presensi:** Input absensi harian (Hadir, Sakit, Izin, Alpha) untuk seluruh siswa MIN Blora.
- **Modul Perpustakaan:** Manajemen katalog buku, sistem sirkulasi peminjaman/pengembalian, dan pencatatan buku tamu.
- **Dashboard Integrasi:** Grafik korelasi kunjungan perpus dan sirkulasi buku.
- **Rekap & Laporan:** Fitur ekspor/cetak laporan PDF dan Excel (Rekap Bulanan, Semester, Kunjungan Perpus, Sirkulasi Perpus).
- **Pengaturan:** Antarmuka interaktif tab-based untuk mengatur identitas madrasah, kop surat laporan, kalender akademik, dan otomatisasi kenaikan kelas.
- **Role-Based Access Control (RBAC):** Sistem manajemen keamanan baris (RLS) di Supabase yang membedakan akses Admin, Guru (Wali Kelas), dan Pustakawan.
- **Progressive Web App (PWA):** Dukungan instalasi aplikasi di *smartphone* Android dan iOS, termasuk *auto-update* dan *custom icon*.
- **Global Error Handling:** Sistem penanganan *ChunkLoadError* untuk transisi PWA saat ada rilis versi baru.

### Fitur Beta (Beta Features)
- **Cetak ID Card Perpustakaan:** Menghasilkan PDF kartu perpustakaan secara massal (ukuran CR80) yang dilengkapi dengan QR Code NISN siswa.
- **Scanner Kunjungan Otomatis:** Pemindaian QR Code menggunakan kamera (*smartphone*/webcam) untuk mencatat pengunjung perpustakaan secara instan dengan *feedback* suara.
- **Penambahan Atribut Data Siswa:** Modifikasi basis data dan antarmuka untuk mendukung input **NISM**, **Tempat Lahir**, dan **Tanggal Lahir**.

### Keamanan (Security)
- Penerapan otentikasi JWT Supabase.
- Konfigurasi *Row Level Security* (RLS) di seluruh tabel basis data.

### Performa (Performance)
- Optimalisasi antarmuka UI/UX yang responsif (Mobile First) menggunakan TailwindCSS dan Vue 3.
- *Lazy loading* komponen via Vite untuk mempercepat waktu muat awal halaman.
- Kompresi generasi PDF menggunakan format JPEG 80% (`html2canvas` & `jsPDF`) untuk memangkas ukuran file dari 59MB menjadi ~1MB.
