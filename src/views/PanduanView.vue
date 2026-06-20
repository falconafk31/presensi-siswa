<script setup>
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { GraduationCap, Library, ShieldCheck, CheckCircle2, AlertTriangle, Book, Bookmark, Github, Heart } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Tentukan tab aktif pertama berdasarkan role user
const defaultTab = auth.isAdmin ? 'admin' : (auth.canManagePerpus && !auth.kelas ? 'perpus' : 'guru')
const activeTab = ref(defaultTab)

const tabs = [
  { id: 'guru', label: 'Panduan Guru & Wali Kelas', icon: GraduationCap },
  { id: 'perpus', label: 'Panduan Pustakawan', icon: Library },
  { id: 'admin', label: 'Panduan Administrator', icon: ShieldCheck },
]
</script>

<template>
  <div>
    <PageHeader 
      title="Panduan Penggunaan Aplikasi" 
      subtitle="Pusat bantuan interaktif untuk setiap peran di madrasah"
    />

    <div class="card p-0 overflow-hidden mb-6">
      <!-- Tab Navigation -->
      <div class="border-b border-gray-200 bg-gray-50/50">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium transition-colors'
            ]"
          >
            <component 
              :is="tab.icon" 
              :class="[
                activeTab === tab.id ? 'text-emerald-500' : 'text-gray-400 group-hover:text-gray-500',
                '-ml-0.5 mr-2 h-5 w-5'
              ]" 
              aria-hidden="true" 
            />
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </div>

      <!-- Tab Contents -->
      <div class="p-6 sm:p-8">
        
        <!-- PANDUAN GURU -->
        <div v-if="activeTab === 'guru'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <CheckCircle2 class="w-5 h-5 text-emerald-500"/> Alur Presensi Harian
            </h3>
            <div class="bg-emerald-50/50 rounded-xl p-5 text-sm text-gray-700 space-y-4 border border-emerald-100">
              <p>Sebagai Wali Kelas, rutinitas Anda adalah mencatat kehadiran siswa setiap pagi. Sistem ini menganut sistem <strong>Pengecualian (Sparse)</strong>, artinya Anda tidak perlu memanggil siswa satu persatu. Semua siswa dianggap "Hadir" secara otomatis.</p>
              <ol class="list-decimal pl-5 space-y-2 font-medium">
                <li>Buka menu <span class="text-emerald-700">Input Presensi</span>.</li>
                <li>Tanyakan kepada ketua kelas: <em>"Siapa yang tidak masuk hari ini?"</em></li>
                <li>Hanya klik status (Izin/Sakit/Alfa) pada nama siswa yang <strong>tidak masuk</strong> saja.</li>
                <li>Klik tombol <span class="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs">Simpan Presensi</span>. Selesai!</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <CheckCircle2 class="w-5 h-5 text-emerald-500"/> Mencetak Laporan (PDF/Excel)
            </h3>
            <p class="text-sm text-gray-600 mb-4">Setiap akhir bulan atau akhir semester, Anda ditugaskan mencetak laporan untuk diserahkan ke Kepala Madrasah.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="border border-gray-200 rounded-xl p-4">
                <h4 class="font-bold text-gray-800 mb-2">Rekap Bulanan</h4>
                <p class="text-sm text-gray-600 mb-3">Pilih menu <strong>Rekap Bulanan</strong>, tentukan bulan dan tahun. Klik cetak PDF atau Download Excel. Format Excel bisa Anda modifikasi sendiri kop suratnya jika perlu.</p>
              </div>
              <div class="border border-gray-200 rounded-xl p-4">
                <h4 class="font-bold text-gray-800 mb-2">Rekap Semester</h4>
                <p class="text-sm text-gray-600 mb-3">Pilih menu <strong>Rekap Semester</strong> (Ganjil/Genap). Sistem akan merangkum 6 bulan ke belakang sesuai dengan tanggal semester berjalan. Klik Cetak PDF untuk format standar rapot.</p>
              </div>
            </div>
          </div>
          
          <div class="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex gap-3 items-start">
            <AlertTriangle class="w-5 h-5 shrink-0 mt-0.5" />
            <p><strong>Penting:</strong> Anda hanya dapat mengisi presensi dan melihat laporan untuk kelas yang ditugaskan kepada Anda (Kelas yang Anda Walikan). Jika Anda mengajar lebih dari satu kelas, silakan hubungi Admin.</p>
          </div>
        </div>

        <!-- PANDUAN PUSTAKAWAN -->
        <div v-if="activeTab === 'perpus'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Book class="w-5 h-5 text-indigo-500"/> Mengelola Katalog Buku
            </h3>
            <p class="text-sm text-gray-600 mb-4">Sebelum siswa dapat meminjam buku, buku tersebut harus terdaftar di sistem.</p>
            <ol class="list-decimal pl-5 text-sm text-gray-700 space-y-2">
              <li>Pilih menu <strong>Katalog Buku</strong> di bawah kategori Perpustakaan.</li>
              <li>Klik <span class="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs">+ Tambah Buku</span>.</li>
              <li>Masukkan Judul Buku, Penerbit, Tahun, dan <strong>Jumlah Stok</strong> fisik yang ada.</li>
              <li>Jika stok buku rusak/hilang, Anda dapat mengklik tombol "Edit" dan menyesuaikan jumlah stoknya.</li>
            </ol>
          </div>

          <div>
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Bookmark class="w-5 h-5 text-indigo-500"/> Sirkulasi Peminjaman & Kunjungan
            </h3>
            <div class="space-y-4 text-sm text-gray-700">
              <p><strong>1. Kunjungan Harian:</strong> Buka menu <em>Kunjungan Perpus</em>. Cukup pilih nama siswa yang datang mengunjungi perpustakaan pada hari itu lalu simpan. Ini penting untuk laporan akreditasi perpustakaan.</p>
              <p><strong>2. Peminjaman Buku:</strong> Buka menu <em>Sirkulasi Buku</em>. Klik Tambah Peminjaman. Pilih Siswa dan Buku yang dipinjam. Sistem otomatis mencatat hari ini sebagai tanggal pinjam dan memotong stok buku.</p>
              <p><strong>3. Pengembalian:</strong> Saat siswa mengembalikan buku, cari namanya di daftar Sirkulasi yang berstatus "Dipinjam". Klik tombol <strong>Selesaikan/Kembalikan</strong>. Stok buku akan kembali otomatis.</p>
            </div>
          </div>
        </div>

        <!-- PANDUAN ADMIN -->
        <div v-if="activeTab === 'admin'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <ShieldCheck class="w-5 h-5 text-rose-500"/> Kenaikan Kelas Massal (Akhir Tahun)
            </h3>
            <p class="text-sm text-gray-600 mb-3">Pada akhir tahun ajaran, Anda harus menaikkan kelas semua siswa secara otomatis melalui sistem.</p>
            <div class="bg-rose-50 border border-rose-100 p-4 rounded-xl text-sm text-rose-800 space-y-3">
              <p><strong>Langkah Kenaikan Kelas:</strong></p>
              <ol class="list-decimal pl-5 space-y-1 font-medium">
                <li>Buka menu <strong>Pengaturan</strong>, lalu temukan tab <strong>Manajemen Tahun Ajaran</strong>.</li>
                <li>Klik tombol <strong>Jalankan Proses Kenaikan Kelas</strong>.</li>
                <li>Sistem akan menaikkan kelas 1 menjadi 2, 2 menjadi 3, dan seterusnya.</li>
                <li>Kelas 6 akan otomatis ditandai sebagai <em>"Lulus"</em> dan dinonaktifkan (tidak bisa presensi lagi).</li>
                <li>Seluruh kelas siswa yang lama dan nama wali kelasnya akan disimpan permanen ke dalam menu <strong>Riwayat Kelas</strong>.</li>
              </ol>
              <p class="text-rose-600 italic text-xs mt-2">*Perhatian: Proses ini tidak dapat dibatalkan. Lakukan hanya di akhir tahun ajaran Genap.</p>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <ShieldCheck class="w-5 h-5 text-amber-500"/> Upload Data via Excel
            </h3>
            <p class="text-sm text-gray-600 mb-4">Untuk memasukkan ratusan siswa atau guru secara cepat tanpa mengetik satu persatu, gunakan fitur Upload Excel.</p>
            <ul class="list-disc pl-5 text-sm text-gray-700 space-y-2">
              <li>Pilih menu <strong>Data Siswa</strong> atau <strong>Guru & Wali Kelas</strong>.</li>
              <li>Klik tombol <strong>Upload Excel</strong>.</li>
              <li><strong>PENTING:</strong> Anda WAJIB mengunduh <em>Template Excel</em> yang disediakan di dalam jendela upload.</li>
              <li>Isi template tersebut, jangan mengubah nama kolom pada baris pertama.</li>
              <li>Setelah selesai, unggah file tersebut kembali ke sistem.</li>
            </ul>
          </div>
          
          <div class="bg-gray-100 p-4 rounded-xl text-sm text-gray-600">
            <strong>Tips Admin:</strong> Menu <strong>Log Aktivitas</strong> dapat digunakan untuk memantau siapa saja yang rajin mengisi presensi dan jam berapa mereka mengisinya. Anda bisa menegur wali kelas yang sering terlambat mengisi presensi.
          </div>
        </div>

      </div>
    </div>

    <!-- Credit & Support Section -->
    <div class="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="inline-flex flex-col items-center bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-xl mx-auto">
        <h3 class="text-lg font-bold text-gray-900 mb-2">Tentang Aplikasi</h3>
        <p class="text-sm text-gray-600 mb-6">
          Sistem Presensi & Perpustakaan Madrasah ini merupakan proyek *Open Source* yang dirancang untuk mempermudah digitalisasi sekolah.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 w-full">
          <!-- Github Repo Button -->
          <a 
            href="https://github.com/falconafk31/presensi-siswa" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Github class="w-5 h-5" />
            <span>Source Code (GitHub)</span>
          </a>

          <!-- Saweria Support Button -->
          <a 
            href="https://saweria.co/falconafk31" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex-1 flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-950 py-3 px-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Heart class="w-5 h-5 fill-amber-500 text-amber-600" />
            <span>Dukung via Saweria</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
