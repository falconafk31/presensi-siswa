# Changelog

Semua perubahan yang signifikan pada proyek ini akan didokumentasikan dalam file ini.

Format changelog berdasarkan pedoman [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini akan mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
