# 🏫 Sistem Presensi Madrasah (Modern Web App)

Aplikasi Sistem Presensi berbasis web modern yang dirancang khusus untuk instansi pendidikan (Madrasah/Sekolah). Proyek ini merupakan hasil migrasi dari sistem *legacy* (Google Apps Script + Alpine.js + Spreadsheet) menjadi arsitektur modern yang lebih cepat, skalabel, dan aman.

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

1.  **Dashboard Real-time:** Visualisasi statistik kehadiran harian dan tren bulanan menggunakan grafik interaktif.
2.  **Manajemen Data Master (CRUD):** Pengelolaan data Siswa dan Guru (Wali Kelas) secara terpusat.
3.  **Input Presensi Cerdas:**
    * Validasi otomatis terhadap Kalender Akademik (mencegah input pada hari libur).
    * Antarmuka *Segmented Control* (Hadir/Izin/Sakit/Alfa) untuk input cepat massal.
4.  **Rekapitulasi & Ekspor Laporan:**
    * Pembuatan matriks kehadiran bulanan dan semester.
    * Cetak dokumen PDF yang dilengkapi dengan **Kop Surat Resmi Kementerian Agama**, penanda hari libur otomatis (warna merah), dan kolom tanda tangan.
    * Ekspor data ke format **Excel (.xlsx)**.
5.  **Pengaturan Dinamis & Cerdas:** 
    * Konfigurasi identitas sekolah (Nama, Kepala Sekolah, Kop Surat).
    * **Favicon Otomatis:** Menggunakan logo sekolah sebagai favicon secara dinamis tanpa perlu modifikasi *codebase*.
    * **Kenaikan Kelas Otomatis:** Sistem canggih yang otomatis mendeteksi kelas awalan 6 untuk diluluskan dan menaikkan kelas lainnya, lengkap dengan riwayat kelas (*snapshot*).

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
git clone <url-repo-anda>
cd min-blora-presensi

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

## 📄 Lisensi

Proyek ini dapat digunakan, dimodifikasi, dan didistribusikan secara **bebas** (Free to use / Open Source) untuk keperluan pendidikan maupun instansi Anda.

## ☕ Dukungan & Donasi

Jika aplikasi ini bermanfaat bagi madrasah/sekolah Anda, Anda dapat memberikan dukungan agar proyek ini terus dikembangkan melalui:

<a href="https://saweria.co/falconafk31" target="_blank">
  <img src="https://img.shields.io/badge/Donate_via-Saweria-FBBF24?style=for-the-badge" alt="Donate via Saweria" />
</a>
