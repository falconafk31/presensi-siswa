<script setup>
import { ref } from 'vue'
import { GraduationCap, Library, ShieldCheck, CheckCircle2, Book, Bookmark, Github, Heart } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { AppPageHeader, AppCard, AppTabs, AppAlert, AppButton } from '@/components/ui'

const auth = useAuthStore()

const defaultTab = auth.isAdmin ? 'admin' : (auth.canManagePerpus && !auth.kelas ? 'perpus' : 'guru')
const activeTab = ref(defaultTab)

const tabs = [
  { value: 'guru', label: 'Guru & Wali Kelas', icon: GraduationCap },
  { value: 'perpus', label: 'Pustakawan', icon: Library },
  { value: 'admin', label: 'Administrator', icon: ShieldCheck },
]
</script>

<template>
  <div class="page-stack">
    <AppPageHeader
      title="Panduan Penggunaan"
      subtitle="Pusat bantuan untuk setiap peran di madrasah"
    />

    <AppTabs v-model="activeTab" :options="tabs" variant="underline" ariaLabel="Panduan per peran" />

    <!-- PANDUAN GURU -->
    <div v-if="activeTab === 'guru'" class="flex flex-col gap-4">
      <AppCard>
        <h3 class="mb-2 flex items-center gap-2 text-[15px] font-bold text-slate-900">
          <CheckCircle2 class="h-5 w-5 text-primary-600" aria-hidden="true" /> Alur Presensi Harian
        </h3>
        <p class="text-sm leading-relaxed text-slate-600">
          Sebagai wali kelas, catat kehadiran siswa setiap pagi. Sistem memakai pola
          <strong>pengecualian</strong>: semua siswa otomatis dianggap “Hadir” — Anda hanya menandai yang tidak masuk.
        </p>
        <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-sm font-medium text-slate-700">
          <li>Buka menu <span class="text-primary-700">Input Presensi</span>.</li>
          <li>Tanyakan ke ketua kelas: <em>“Siapa yang tidak masuk hari ini?”</em></li>
          <li>Klik status (Izin / Sakit / Alfa) hanya pada siswa yang <strong>tidak masuk</strong>.</li>
          <li>Klik <strong>Simpan Presensi</strong>. Selesai!</li>
        </ol>
      </AppCard>

      <AppCard title="Mencetak Laporan (PDF / Excel)" subtitle="Setiap akhir bulan atau semester untuk Kepala Madrasah">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="rounded-xl border border-slate-200 p-4">
            <h4 class="mb-1.5 text-sm font-bold text-slate-800">Rekap Bulanan</h4>
            <p class="text-sm leading-relaxed text-slate-600">Buka <strong>Rekap Bulanan</strong>, tentukan bulan &amp; tahun, lalu cetak PDF atau unduh Excel. Laporan otomatis mencantumkan hari efektif, hari libur, dan rumus persentase kehadiran.</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-4">
            <h4 class="mb-1.5 text-sm font-bold text-slate-800">Rekap Semester</h4>
            <p class="text-sm leading-relaxed text-slate-600">Buka <strong>Rekap Semester</strong> (Ganjil/Genap). Sistem merangkum 6 bulan ke belakang sesuai tanggal semester berjalan. Klik Cetak PDF untuk format standar rapor.</p>
          </div>
        </div>
      </AppCard>

      <AppAlert tone="info" title="Batasan akses wali kelas">
        Anda hanya dapat mengisi presensi dan melihat laporan untuk kelas yang ditugaskan kepada Anda.
        Jika mengampu lebih dari satu kelas, hubungi admin.
      </AppAlert>
    </div>

    <!-- PANDUAN PUSTAKAWAN -->
    <div v-if="activeTab === 'perpus'" class="flex flex-col gap-4">
      <AppCard title="Mengelola Katalog Buku" subtitle="Buku harus terdaftar sebelum bisa dipinjam">
        <template #actions><Book class="h-5 w-5 text-library" aria-hidden="true" /></template>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Buka menu <strong>Katalog Buku</strong> di kategori Perpustakaan.</li>
          <li>Klik <strong>+ Tambah Buku</strong>.</li>
          <li>Isi judul, penerbit, tahun, dan <strong>jumlah stok</strong> fisik yang ada.</li>
          <li>Jika ada buku rusak/hilang, klik “Edit” dan sesuaikan jumlah stoknya.</li>
        </ol>
      </AppCard>

      <AppCard title="Sirkulasi Peminjaman & Kunjungan">
        <template #actions><Bookmark class="h-5 w-5 text-library" aria-hidden="true" /></template>
        <div class="flex flex-col gap-3 text-sm leading-relaxed text-slate-600">
          <p><strong class="text-slate-800">1. Kunjungan harian:</strong> buka <em>Kunjungan Perpus</em>, pilih nama siswa yang datang, lalu simpan. Penting untuk laporan akreditasi perpustakaan.</p>
          <p><strong class="text-slate-800">2. Peminjaman buku:</strong> buka <em>Sirkulasi Buku</em> → Tambah Peminjaman → pilih siswa dan buku. Tanggal pinjam tercatat otomatis dan stok berkurang.</p>
          <p><strong class="text-slate-800">3. Pengembalian:</strong> cari nama siswa di daftar berstatus “Dipinjam”, lalu klik <strong>Selesaikan / Kembalikan</strong>. Stok kembali otomatis.</p>
          <p><strong class="text-slate-800">4. Scanner QR:</strong> di halaman Kunjungan, klik “Buka Scanner QR” lalu arahkan kamera ke kartu siswa untuk pencatatan super cepat. Klik “Kembali” untuk keluar dari mode scanner.</p>
        </div>
      </AppCard>

      <AppCard title="Cetak Kartu Anggota (Bolak-Balik)" subtitle="Kartu dilengkapi QR Code NISN">
        <ul class="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Buka <strong>Cetak Kartu</strong>, pilih kelas untuk memuat data siswa.</li>
          <li>Aplikasi membuat 2 desain otomatis: <strong>sisi depan</strong> (data &amp; QR) dan <strong>sisi belakang</strong> (tata tertib).</li>
          <li>Klik <strong>Download PDF</strong> atau tekan <strong>Ctrl+P</strong>. Kartu depan-belakang tersusun berdampingan.</li>
          <li>Cetak di kertas tebal, <strong>potong, lipat bagian tengah</strong>, lalu laminasi.</li>
        </ul>
      </AppCard>
    </div>

    <!-- PANDUAN ADMIN -->
    <div v-if="activeTab === 'admin'" class="flex flex-col gap-4">
      <AppCard title="Kenaikan Kelas Massal (Akhir Tahun)" subtitle="Jalankan sekali di akhir tahun ajaran genap">
        <template #actions><ShieldCheck class="h-5 w-5 text-rose-500" aria-hidden="true" /></template>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm font-medium text-slate-700">
          <li>Buka <strong>Pengaturan</strong> → tab <strong>Kenaikan Kelas</strong>.</li>
          <li>Klik <strong>Proses Kenaikan</strong> dan konfirmasi.</li>
          <li>Kelas 1 → 2, 2 → 3, dan seterusnya secara otomatis.</li>
          <li>Kelas 6 ditandai <em>“Lulus”</em> dan dinonaktifkan (tidak bisa presensi lagi).</li>
          <li>Kelas lama &amp; wali kelas tersimpan permanen di <strong>Riwayat Kelas</strong>.</li>
        </ol>
        <AppAlert tone="danger" title="Tidak dapat dibatalkan" class="mt-3">
          Proses ini permanen. Lakukan hanya di akhir tahun ajaran genap.
        </AppAlert>
      </AppCard>

      <AppCard title="Upload Data via Excel" subtitle="Ratusan siswa/guru sekaligus tanpa mengetik satu per satu">
        <ul class="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Buka <strong>Data Siswa</strong> atau <strong>Guru &amp; Wali Kelas</strong>.</li>
          <li>Klik <strong>Upload Excel</strong>.</li>
          <li><strong>Penting:</strong> unduh <em>template Excel</em> di dalam jendela upload dan isi sesuai format — jangan ubah nama kolom baris pertama.</li>
          <li>Unggah kembali file tersebut ke sistem.</li>
        </ul>
      </AppCard>

      <AppAlert tone="info" title="Tips admin">
        Menu <strong>Log Aktivitas</strong> merekam semua tindakan — presensi maupun sirkulasi perpustakaan
        (tambah, pinjam, kembali). Berguna sebagai <em>audit trail</em>.
      </AppAlert>

      <AppCard title="Solusi Layar Blank (White Screen)" subtitle="Biasanya karena cache versi lama di perangkat">
        <ul class="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li><strong>Solusi 1:</strong> minta guru menekan tombol <strong>Refresh App (Clear Cache)</strong> berwarna merah di bagian paling bawah sidebar kiri.</li>
          <li><strong>Solusi 2:</strong> jika hanya layar putih, hapus <em>cache / site data</em> dari pengaturan browser Chrome di HP (ikon gembok di samping URL).</li>
        </ul>
      </AppCard>
    </div>

    <!-- Tentang -->
    <AppCard class="mx-auto w-full max-w-xl text-center">
      <h3 class="text-base font-bold text-slate-900">Tentang Aplikasi</h3>
      <p class="mx-auto mb-5 mt-1 max-w-md text-sm text-slate-600">
        Sistem Presensi &amp; Perpustakaan Madrasah — proyek <em>open source</em> untuk mempermudah digitalisasi sekolah.
      </p>
      <div class="flex flex-col gap-2.5 sm:flex-row">
        <a
          href="https://github.com/falconafk31/presensi-siswa"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-secondary w-full"
        >
          <Github class="h-4 w-4" aria-hidden="true" />
          Source Code (GitHub)
        </a>
        <a
          href="https://saweria.co/falconafk31"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-warning w-full"
        >
          <Heart class="h-4 w-4" aria-hidden="true" />
          Dukung via Saweria
        </a>
      </div>
    </AppCard>
  </div>
</template>
