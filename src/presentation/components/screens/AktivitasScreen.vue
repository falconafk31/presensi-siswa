<script setup>
// Rekonstruksi Log Aktivitas + ringkasan Riwayat Kelas.
import { Search } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { riwayatKelas } from '@/presentation/mock'

const logs = [
  { waktu: '22 Sep 2026 · 07:35', aksi: 'input_presensi', oleh: 'Siti Rahmawati', tabel: 'attendance_logs', detail: '2026-09-22:5A · H8 I1 S1' },
  { waktu: '22 Sep 2026 · 07:41', aksi: 'input_presensi', oleh: 'Dewi Lestari', tabel: 'attendance_logs', detail: '2026-09-22:5B · H9 S1' },
  { waktu: '21 Sep 2026 · 14:02', aksi: 'update_kalender', oleh: 'Budi Santoso', tabel: 'academic_calendar', detail: '2026-09-14 → Libur (kegiatan)' },
  { waktu: '21 Sep 2026 · 10:04', aksi: 'pinjam_buku', oleh: 'Nur Aini', tabel: 'book_loans', detail: 'Ilham Fauzi · Dilan1990' },
  { waktu: '20 Sep 2026 · 09:22', aksi: 'edit_siswa', oleh: 'Budi Santoso', tabel: 'students', detail: '0072341516 · ubah kelas' },
  { waktu: '19 Sep 2026 · 11:15', aksi: 'kunjungan_perpus', oleh: 'Nur Aini', tabel: 'library_visits', detail: 'Ahmad Fauzan · 5A' },
]
const tone = {
  input_presensi: 'badge-success',
  update_kalender: 'badge-warning',
  pinjam_buku: 'badge-library',
  edit_siswa: 'badge-info',
  kunjungan_perpus: 'badge-neutral',
}
</script>

<template>
  <MockAppFrame active="aktivitas" role="admin" page-title="Log Aktivitas" page-subtitle="Jejak audit — siapa mengubah apa dan kapan (200 terbaru)">
    <div class="flex h-full flex-col gap-2.5">
      <div class="card-flat grid grid-cols-3 gap-2.5 p-3">
        <div>
          <label class="input-label">Cari</label>
          <div class="input-with-icon relative">
            <Search class="leading-icon h-4 w-4" aria-hidden="true" />
            <input class="input-field pl-9" type="text" placeholder="Aksi, pengguna, atau record…" />
          </div>
        </div>
        <div>
          <label class="input-label">Aksi</label>
          <select class="input-field"><option>Semua Aksi</option><option>input_presensi</option><option>update_kalender</option></select>
        </div>
        <div>
          <label class="input-label">Rentang tanggal</label>
          <input class="input-field" type="text" value="7 hari terakhir" readonly />
        </div>
      </div>

      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Log aktivitas sistem (demo fiktif)</caption>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aksi</th>
                <th>Pengguna</th>
                <th>Tabel</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in logs" :key="i">
                <td class="whitespace-nowrap text-slate-500 tnum">{{ l.waktu }}</td>
                <td><span :class="tone[l.aksi] || 'badge-neutral'">{{ l.aksi }}</span></td>
                <td class="cell-main">{{ l.oleh }}</td>
                <td class="text-slate-500">{{ l.tabel }}</td>
                <td class="max-w-[260px] truncate text-xs text-slate-500" :title="l.detail">{{ l.detail }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          Log bersifat append-only ·6 baris terbaru (demo)
        </div>
      </div>

      <!-- riwayat kelas mini -->
      <section class="card-flat p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="card-title">Riwayat Kelas Siswa</h3>
          <span class="caption">Histori per tahun ajaran</span>
        </div>
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NISN</th>
                <th class="!text-center">Tahun Ajaran</th>
                <th class="!text-center">Kelas</th>
                <th>Wali Kelas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in riwayatKelas.slice(0, 4)" :key="i">
                <td class="cell-main">{{ r.nama }}</td>
                <td class="text-slate-500 tnum">{{ r.nisn }}</td>
                <td class="cell-num">{{ r.tahun }}</td>
                <td class="cell-num">{{ r.kelas }}</td>
                <td>{{ r.wali }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </MockAppFrame>
</template>
