<script setup>
// Rekonstruksi Data Pengunjung + Scanner QR.
import { QrCode, UserPlus, Search } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { kunjunganHariIni, perpusStats } from '@/presentation/mock'
</script>

<template>
  <MockAppFrame active="kunjungan" role="pustakawan" page-title="Data Pengunjung" page-subtitle="22 September 2026 ·24 pengunjung tercatat">
    <template #actions>
      <span class="btn-primary pointer-events-none !py-1.5 !text-xs"><QrCode class="h-3.5 w-3.5" />Buka Scanner QR</span>
    </template>

    <div class="flex h-full gap-3">
      <!-- form manual -->
      <div class="card-flat w-[340px] shrink-0 p-4">
        <h3 class="card-title">Catat Pengunjung</h3>
        <p class="secondary mt-0.5">Manual — atau gunakan scanner QR</p>
        <div class="mt-3 flex flex-col gap-3">
          <div>
            <label class="input-label">Pilih siswa</label>
            <select class="input-field"><option>Ahmad Fauzan — 5A</option></select>
          </div>
          <div>
            <label class="input-label">Tanggal</label>
            <input class="input-field" type="text" value="22 September 2026" readonly />
          </div>
          <span class="btn-primary"><UserPlus class="h-4 w-4" />Catat Kunjungan</span>
        </div>

        <!-- QR preview -->
        <div class="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <div class="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
            <QrCode class="h-16 w-16 text-slate-800" aria-hidden="true" />
          </div>
          <p class="mt-2 text-[12px] font-semibold text-slate-700">Scanner mode</p>
          <p class="text-[11px] text-slate-400">Arahkan kamera ke kartu anggota (QR NISN)</p>
        </div>
      </div>

      <!-- daftar -->
      <div class="flex min-w-0 flex-1 flex-col gap-2.5">
        <div class="input-with-icon relative">
          <Search class="leading-icon h-4 w-4" aria-hidden="true" />
          <input class="input-field pl-9" type="text" placeholder="Cari nama siswa…" />
        </div>
        <div class="table-card min-h-0 flex-1">
          <div class="table-scroll h-full">
            <table class="table">
              <caption class="sr-only">Daftar pengunjung hari ini (demo fiktif)</caption>
              <thead>
                <tr>
                  <th class="!text-center">Jam</th>
                  <th>Nama</th>
                  <th class="!text-center">Kelas</th>
                  <th>Cara</th>
                  <th class="!text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(v, i) in kunjunganHariIni" :key="i">
                  <td class="cell-num text-slate-500">{{ v.jam }}</td>
                  <td class="cell-main">{{ v.nama }}</td>
                  <td class="cell-num">{{ v.kelas }}</td>
                  <td><span :class="i % 2 === 0 ? 'badge-info' : 'badge-primary'">{{ i % 2 === 0 ? 'QR Scan' : 'Manual' }}</span></td>
                  <td class="!text-center text-slate-300">✕</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
           5 dari24 pengunjung (potongan demo)
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] text-slate-500">
          Total kunjungan hari ini:
          <strong class="text-slate-800 tnum">{{ perpusStats.kunjunganHariIni }}</strong>
          · penting untuk laporan akreditasi perpustakaan
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
