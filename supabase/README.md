# 🐘 Supabase Database & Security Architecture

Folder ini berisi skema database dan keamanan untuk **Sistem Presensi & Perpustakaan Madrasah**.
Seluruh instruksi di sini sudah digunakan pada saat setup awal aplikasi.

## 1. Arsitektur Autentikasi (Supabase Auth)
Aplikasi ini sudah **sepenuhnya bermigrasi menggunakan Supabase Auth (Go-Live Ready)**. 
- Semua akun pengguna didaftarkan di dalam *Supabase Authentication* menggunakan domain virtual `@minblora.id` (Contoh: `admin@minblora.id`).
- Tabel `users` di public schema hanya berfungsi sebagai ekstensi profil (menyimpan NIP, Nama, Role, Kelas) dan berelasi langsung dengan `auth.users` via foreign key `auth_id`.

## 2. Struktur Tabel Utama
- **`users`**: Profil pengguna (Admin, Guru, Pustakawan).
- **`students`**: Master data siswa.
- **`academic_periods`**: Pengaturan Tahun Ajaran & Semester aktif.
- **`academic_calendar`**: Penanda hari libur nasional/sekolah.
- **`attendance_logs`**: Catatan presensi detail per siswa per hari.
- **`activity_logs`**: Log aktivitas (*audit trail*) untuk input absensi, penambahan guru, dll.
- **`library_books`**: Master data katalog buku perpustakaan dan stok fisik.
- **`library_loans`**: Catatan sirkulasi peminjaman dan pengembalian buku.
- **`library_visits`**: Buku tamu / log kunjungan harian perpustakaan.
- **`app_settings`**: Konfigurasi dinamis sekolah (Kop surat, logo, daftar kelas, hari libur mingguan).

## 3. Storage Bucket
- Bucket bernama **`assets`** telah dikonfigurasi sebagai publik (*Public*).
- Digunakan secara eksklusif untuk menyimpan gambar *Logo Sekolah* yang diunggah via menu Pengaturan Admin.

## 4. Row Level Security (RLS)
Sistem menggunakan Opsi Keamanan berbasis *Permissive Authenticated* pada aplikasi ini. Semua *queries* diatur secara ketat melalui frontend (Vue) berdasarkan deteksi *role* Pinia Store. 
*(Catatan: Anda dapat menerapkan kebijakan RLS yang lebih ketat berdasarkan `auth.uid()` jika diperlukan ekspansi keamanan skala besar).*
