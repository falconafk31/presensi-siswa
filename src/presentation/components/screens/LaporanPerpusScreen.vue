<script setup>
// Rekonstruksi Laporan Perpustakaan.
import { UsersRound, BookOpen } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { laporanPerpus } from '@/presentation/mock'
</script>

<template>
  <MockAppFrame active="laporan-perpus" role="pustakawan" page-title="Laporan Perpustakaan" :page-subtitle="`Periode: ${laporanPerpus.periode}`">
    <div class="flex h-full flex-col gap-2.5">
      <!-- filter -->
      <div class="flex items-center justify-between gap-3">
        <div class="tabs" role="tablist">
          <button role="tab" class="tab-btn" aria-selected="true">Laporan Kunjungan</button>
          <button role="tab" class="tab-btn" aria-selected="false">Laporan Sirkulasi</button>
        </div>
        <div class="chip-tabs">
          <span class="chip-tab">Harian</span>
          <span class="chip-tab !border-primary-700 !bg-primary-700 !text-white">Bulanan</span>
          <span class="chip-tab">Tahunan</span>
          <span class="chip-tab">Sepanjang Waktu</span>
        </div>
      </div>

      <!-- ringkasan -->
      <div class="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">
        <div class="bg-white px-3 py-2.5">
          <p class="text-[11px] text-slate-500">Kunjungan periode ini</p>
          <p class="text-lg font-bold text-slate-900 tnum">{{ laporanPerpus.kunjunganTotal }}</p>
        </div>
        <div class="bg-white px-3 py-2.5">
          <p class="text-[11px] text-slate-500">Peminjaman</p>
          <p class="text-lg font-bold text-slate-900 tnum">{{ laporanPerpus.peminjamanTotal }}</p>
        </div>
        <div class="bg-white px-3 py-2.5">
          <p class="text-[11px] text-slate-500">Rata-rata / hari</p>
          <p class="text-lg font-bold text-slate-900 tnum">17</p>
        </div>
        <div class="bg-white px-3 py-2.5">
          <p class="text-[11px] text-slate-500">Judul beredar</p>
          <p class="text-lg font-bold text-slate-900 tnum">37</p>
        </div>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-2 gap-3">
        <!-- teraktif -->
        <section class="card-flat flex flex-col p-4">
          <h3 class="flex items-center gap-2 card-title"><UsersRound class="h-4 w-4 text-blue-700" />Peringkat Pengunjung Teraktif</h3>
          <p class="secondary mt-0.5">{{ laporanPerpus.periode }}</p>
          <div class="mt-3 flex flex-col gap-2">
            <div v-for="(v, i) in laporanPerpus.peringkatPengunjung" :key="v.nama" class="flex items-center gap-3">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                :class="i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'"
              >{{ i + 1 }}</span>
              <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{{ v.nama }}</span>
              <span class="text-xs text-slate-400">{{ v.kelas }}</span>
              <span class="w-16 text-right text-sm font-bold text-slate-800 tnum">{{ v.kunjungan }}× </span>
            </div>
          </div>
        </section>

        <!-- favorit -->
        <section class="card-flat flex flex-col p-4">
          <h3 class="flex items-center gap-2 card-title"><BookOpen class="h-4 w-4 text-blue-700" />Buku Terfavorit</h3>
          <p class="secondary mt-0.5">Paling sering dipinjam</p>
          <div class="mt-3 flex flex-col gap-3">
            <div v-for="(b, i) in laporanPerpus.bukuFavorit" :key="b.judul">
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="truncate font-medium text-slate-700">{{ b.judul }}</span>
                <span class="ml-2 shrink-0 text-xs font-bold text-blue-700 tnum">{{ b.kali }}×</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-blue-700/80" :style="{ width: `${(b.kali / 12) * 100}%` }" />
              </div>
            </div>
          </div>
          <div class="mt-auto border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
            Ekspor mengikuti pola rekap · data fiktif demo
          </div>
        </section>
      </div>
    </div>
  </MockAppFrame>
</template>
