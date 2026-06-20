# 🏫 Sistem Presensi & Perpustakaan Madrasah (Modern Web App)

Aplikasi Sistem Informasi terintegrasi berbasis web modern yang dirancang khusus untuk instansi pendidikan (Madrasah/Sekolah). Sistem ini menangani **Presensi Akademik** dan **Manajemen Perpustakaan (Sirkulasi Buku)** dalam satu portal terpadu. Proyek ini merupakan hasil migrasi dan pengembangan dari sistem *legacy* (Google Apps Script) menjadi arsitektur modern yang lebih cepat, skalabel, dan aman.

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
* **Notifikasi:** `vue-sonner` (toast ringan, mudah diselaraskan dengan Tailwind)
* **Utilities:** `@vueuse/core` (composables siap pakai)
* **UI Primitives:** `radix-vue` / `@headlessui/vue` (modal, dropdown, segmented control yang accessible)
* **Deployment:** [Vercel](https://vercel.com/)

## ✨ Fitur Utama

### 📊 Sistem Presensi & Administrasi
1.  **Dashboard Real-time:** Visualisasi statistik kehadiran harian dan tren bulanan menggunakan grafik interaktif.
2.  **Manajemen Data Master (CRUD):** Pengelolaan data Siswa dan Guru (Wali Kelas) secara terpusat dengan dukungan *Upload* Excel massal.
3.  **Input Presensi Cerdas:**
    * Validasi otomatis terhadap Kalender Akademik (mencegah input pada hari libur).
    * Kunci Kelas (Security Lock): Guru hanya dapat mengakses dan mengisi kelas ampuan mereka.
    * Antarmuka *Segmented Control* (Hadir/Izin/Sakit/Alfa) untuk input cepat massal.
4.  **Rekapitulasi & Ekspor Laporan:**
    * Pembuatan matriks kehadiran bulanan dan semester.
    * Cetak dokumen PDF yang dilengkapi dengan **Kop Surat Resmi Kementerian Agama**, penanda hari libur otomatis (warna merah), dan auto-stretch kolom presisi.
    * Ekspor data ke format **Excel (.xlsx)** lengkap dengan Nama Wali Kelas dan NIP.
5.  **Panduan Penggunaan Built-in:** Buku manual digital interaktif terpadu di dalam aplikasi untuk memandu setiap *role* (Admin, Guru, Pustakawan).

### 📚 Sistem Perpustakaan (Modul Baru)
1.  **Katalog Buku:** Manajemen data buku (Judul, Pengarang, Penerbit, Tahun, Stok).
2.  **Sirkulasi Cerdas:** Peminjaman dan Pengembalian dengan auto-kalkulasi stok secara *real-time*.
3.  **Laporan Perpustakaan:** Cetak riwayat sirkulasi, status peminjaman aktif, dan daftar kunjungan harian ke PDF secara mudah.
4.  **Hak Akses Khusus:** Mendukung *role* **Pustakawan** murni, serta *role* **Guru & Pustakawan** bagi guru wali kelas yang juga ditugaskan mengurus perpustakaan.

### ⚙️ Engine Inti
1.  **Pengaturan Dinamis & Cerdas:** Konfigurasi identitas sekolah (Nama, Kepala Sekolah, Kop Surat).
2.  **Progressive Web App (PWA):** Dukungan penuh PWA yang memungkinkan aplikasi ini **di-instal secara native** ke Home Screen smartphone/desktop, lengkap dengan *Service Worker Caching* untuk akses ultra-cepat.
3.  **Manajemen Tingkat Lanjut & Zona Berbahaya:**
    * **Kenaikan Kelas Otomatis:** Sistem yang otomatis meluluskan siswa tingkat akhir dan menaikkan kelas lainnya secara masif di akhir tahun.
    * **Reset Database (Wipe):** Fungsi *reset* sekali klik khusus Admin untuk menghapus data absensi/log lama, memastikan database Supabase tier gratis tetap lega.
4.  **Performa Ekstra Cepat (Optimized):** 
    * Penggunaan *Client-Side Pagination* (25 baris per halaman) pada data statistik mengefisienkan *rendering* tabel.
    * Penggunaan *Dynamic Import (Lazy Loading)* untuk pustaka berat seperti `xlsx`, membuat ukuran pemuatan awal halaman menjadi instan.
    * Konfigurasi anti-crash `cross-env NODE_OPTIONS` untuk kelancaran *build* & *development*.

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
Pastikan Anda sudah menjalankan seluruh *script* SQL yang berada di dalam folder `scaffold/supabase/` secara berurutan di SQL Editor Supabase Anda untuk membentuk *schema*, *RLS*, dan *Storage*.

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
