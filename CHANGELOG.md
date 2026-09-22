# Changelog

Semua perubahan yang signifikan pada proyek ini akan didokumentasikan dalam file ini.

Format changelog berdasarkan pedoman [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini akan mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Diubah (Changed)
- **Restrukturisasi dokumentasi repository:** README ditulis ulang sebagai entry point ringkas (status, overview, fitur terverifikasi source, matriks role, arsitektur, quick start); dokumentasi detail dipindah ke `docs/` (`architecture`, `tech-stack`, `project-structure`, `development`, `deployment`, `authentication`, `database`, `testing`, `performance`, `design-system`, `troubleshooting`, `decisions/`); `ROADMAP.md`, `CONTRIBUTING.md`, `SECURITY.md`, dan template PR/issue GitHub ditambahkan. Tidak ada perubahan kode aplikasi, database, RLS, maupun perilaku auth.
- **Koreksi klaim dokumentasi:** kredensial demo dihapus dari README (tidak ada kredensial default di repo); klaim "Glassmorphism"/gradient diluruskan mengikuti source (desain calm institutional); klaim PWA tidak lagi dicantumkan (sudah dilepas); `radix-vue` dicatat sebagai dependensi tak terpakai; `SETUP.md` (scaffold usang) dihapus dan isinya dilebur ke `docs/development.md`.

## [0.2.19] - 2026-09-22

### Diperbaiki (Fixed)
- **Self-recovery "Pulihkan Sesi" pada Login:** menangani proses masuk yang menggantung selamanya di loading "Memeriksa…" (terutama Chrome mobile dengan state sesi lokal yang stale). `handleLogin` kini ber-timeout ±12 detik; bila melewati batas, loading dihentikan dan tampil panel **"Mengalami masalah?"** — "Proses masuk membutuhkan waktu lebih lama dari biasanya." — dengan tombol **Pulihkan Sesi**: membersihkan key `presensi.user`, membersihkan persisted Supabase Auth session via API resmi `supabase.auth.signOut({ scope: 'local' })`, unregister Service Worker lama bila masih ada, lalu reload halaman login. UI recovery hanya muncul setelah timeout; hasil login yang datang terlambat setelah tombol ditekan diabaikan (token attempt anti race condition). Alur login normal, pesan "Username atau password salah", role/permission, router guard, database/RLS, dan business logic tidak berubah.

## [0.2.18] - 2026-09-22

### Diperbaiki (Fixed)
- **Keterbacaan "Tidak hadir hari ini":** nama siswa kini terikat pada statusnya per kelas — setiap status menjadi baris sendiri dengan format `Izin 1: Nama, Nama` / `Sakit 2: …` / `Alfa 3: …` (label berwarna semantik + nama setelah titik dua), menggantikan format lama yang menggabungkan seluruh nama kelas dalam satu baris setelah koma sehingga status per siswa tidak terbaca.

## [0.2.17] - 2026-09-22

### Diperbaiki (Fixed)
- **Kartu Komposisi konsisten data hari ini:** donut, judul ("Komposisi Hari Ini"), subtitle, dan ringkasan count tidak lagi mengikuti periode trend (sebelumnya "Komposisi 7 Hari Terakhir" dsb. dari agregat periode) — kini selalu data **hari ini**, selaras dengan section "Tidak hadir hari ini · X siswa" dalam kartu yang sama. Kode agregat periode (`periodCounts` & computed terkait) dihapus. Perbaikan denominator tren per kelas-submit, highlight per-kelas, urutan Komposisi–Tren, dan deep-link Rekap tetap dipertahankan.

## [0.2.16] - 2026-09-22

### Diubah (Changed)
- **Prioritas exception harian (Dashboard Admin):** grid analytics dibalik khusus Admin — **Komposisi di kiri (1/3), Tren Kehadiran di kanan (2/3)**; di mobile Komposisi tetap tampil lebih dulu. Di bawah donut ditambah highlight operasional **"Tidak hadir hari ini · X siswa"** (data hari ini dari `absentStudents`, bukan agregat periode): nama dikelompokkan per kelas dengan ringkasan `Izin N · Sakit N · Alfa N` (warna semantik exact) dan baris nama compact — tanpa scroll container; ketika tidak ada ketidakhadiran tampil state ringkas "Semua siswa hadir hari ini". Judul & donut Komposisi tetap mengikuti periode trend. Tidak ada perubahan business logic/query; layout Guru tidak tersentuh.

## [0.2.15] - 2026-09-22

### Diperbaiki (Fixed)
- **Denominator tren Admin (Semua Kelas):** per tanggal, "Hadir" kini dihitung terhadap populasi siswa aktif **pada kelas yang benar-benar submit** tanggal tersebut (via peta populasi per kelas dari query siswa yang sama — tanpa query baru), bukan total seluruh siswa. Tanggal tanpa submission tetap `null`.

### Diubah (Changed)
- **Komposisi periodik (Admin):** kartu Komposisi kini mengikuti periode trend — "Komposisi 7 Hari Terakhir" / "Komposisi <Bulan Tahun>" / "Komposisi Tahun <Tahun>" — dengan agregat Hadir/Izin/Sakit/Alfa periode terpilih (menghormati filter kelas, kalender akademik, tanpa tanggal masa depan; diagregasi dari dataset tren yang sama, tanpa query baru). Subtitle menampilkan populasi & konteks kelas. Guru tetap "Komposisi Hari Ini" + daftar nama.
- **Deep-link "Lihat" (Admin):** CTA kelas-belum-presensi kini membuka `/rekap?status=belum-presensi&date=…&kelas=…` — Rekap membatasi pilihan kelas hanya kelas yang belum presensi (langsung terpilih jika satu), menampilkan indikator "Belum presensi hari ini", dan keluar dari konteks otomatis saat filter diubah manual. Tanpa query duplikat; Guru tidak terpengaruh.

## [0.2.14] - 2026-09-21

### Diubah (Changed)
- **Finalisasi Dashboard Admin (presentation-only):** strip monitoring "Perlu perhatian" ringkas — hanya jumlah ("N kelas belum presensi · M siswa Alfa", tanpa badge nama kelas / nama siswa) dengan CTA "Lihat" ke Rekap; strip selesai emerald "Semua kelas sudah presensi · Tidak ada Alfa". **Komposisi Hari Ini Admin kini summary saja:** donut + 4 baris count (Hadir/Izin/Sakit/Alfa, warna semantik exact) — daftar nama siswa dengan internal scroll dihapus untuk Admin. Chart memakai ruang desktop lebih optimal (tren clamp 200–300px, donut 170–220px; Admin saja). Urutan mobile Admin: Komposisi sebelum Tren. Dashboard Guru tidak berubah (banner, quick actions, KPI, komposisi nama, tinggi chart, urutan). Semua kalkulasi/query/behavior bisnis tidak disentuh.

## [0.2.13] - 2026-09-21

### Ditambahkan (Added)
- **Menu Kalender Akademik untuk Guru:** sidebar role Guru kini menampilkan Kalender Akademik di MAIN MENU (setelah Statistik Kehadiran). Route `kalender` beralih dari `adminOnly` ke `presensiOnly` (Admin + Guru).

### Diubah (Changed)
- **Pemisahan VIEW vs MANAGE kalender:** KalenderView kini read-only untuk non-Admin — sel tanggal non-Admin di-disable (tanpa aksi/hover), `toggle()` diguard `canManage` (defense in depth), subtitle menjelaskan bahwa pengubahan status hanya oleh Admin. Admin tetap mengelola kalender penuh tanpa perubahan.

### Diperbaiki (Fixed)
- **Quick action Kalender di Dashboard Guru** sebelumnya salah route ke `{ name: 'rekap' }`; kini benar menuju `{ name: 'kalender' }`. Quick action Admin tidak berubah.

## [0.2.12] - 2026-09-21

### Diubah (Changed)
- **Konfirmasi tinggalkan halaman (Input Presensi):** `window.confirm` native diganti **AppConfirmDialog** ("Tinggalkan halaman?" / tone warning / tombol **Tetap di Halaman** & **Tinggalkan**) via async guard `onBeforeRouteLeave` berbasis Promise. ESC & klik-overlay setara "Tetap di Halaman"; navigasi ganda saat dialog terbuka tidak meninggalkan promise menggantung (dibatalkan otomatis). "Tinggalkan" **tidak pernah** menyimpan data. Dialog existing "Perbarui Data Presensi?" dan `beforeunload` browser (refresh/close tab) dipertahankan; dirty tracking (`isDirty`, `presensiBaseline`) tidak berubah.

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
