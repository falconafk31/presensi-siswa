<script setup>
// Rekonstruksi Beranda Perpustakaan.
import { Book, Library, BookOpen, TriangleAlert, ArrowRight } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { perpusStats, sirkulasi, kunjunganHariIni } from '@/presentation/mock'

const kpi = [
  { label: 'Total Judul', value: perpusStats.totalJudul, icon: Book, tone: 'library', sub: 'koleksi' },
  { label: 'Total Eksemplar', value: perpusStats.totalEksemplar, icon: Library, tone: 'neutral', sub: 'buku fisik' },
  { label: 'Sedang Dipinjam', value: perpusStats.dipinjam, icon: BookOpen, tone: 'info', sub: 'aktif' },
  { label: 'Terlambat', value: perpusStats.terlambat, icon: TriangleAlert, tone: 'danger', sub: 'perlu ditagih' },
]
const toneChip = {
  library: 'bg-blue-100 text-blue-700 ring-blue-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-sky-100 text-sky-600 ring-sky-200',
  danger: 'bg-rose-100 text-rose-600 ring-rose-200',
}

// mini bar trend (kunjungan per hari, demo)
const trend = [
  { d: '1', v: 18 }, { d: '2', v: 22 }, { d: '3', v: 20 }, { d: '4', v: 26 },
  { d: '5', v: 8 }, { d: '6', v: 4 }, { d: '7', v: 24 }, { d: '8', v: 27 },
  { d: '9', v: 21 }, { d: '10', v: 19 }, { d: '11', v: 6 }, { d: '12', v: 5 },
  { d: '13', v: 25 }, { d: '14', v: 23 }, { d: '15', v: 28 }, { d: '16', v: 24 },
  { d: '17', v: 7 }, { d: '18', v: 4 }, { d: '19', v: 26 }, { d: '20', v: 22 },
]
const maxV = Math.max(...trend.map((t) => t.v))
const loanTone = { Dipinjam: 'badge-info', Dikembalikan: 'badge-success', 'Terlambat7 hari': 'badge-danger' }
</script>

<template>
  <MockAppFrame active="dashboard-perpus" role="pustakawan" page-title="Beranda Perpustakaan" page-subtitle="Sirkulasi koleksi dan kunjungan pengunjung">
    <template #actions>
      <span class="chip-tabs">
        <span class="chip-tab">Harian</span>
        <span class="chip-tab !border-primary-700 !bg-primary-700 !text-white">Bulanan</span>
        <span class="chip-tab">Tahunan</span>
      </span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <!-- KPI -->
      <div class="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">
        <div v-for="s in kpi" :key="s.label" class="flex min-h-[62px] items-center gap-2.5 bg-white px-3 py-2.5">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1" :class="toneChip[s.tone]">
            <component :is="s.icon" class="h-4 w-4" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-[11px] leading-tight text-slate-500">{{ s.label }}</p>
            <p class="truncate text-lg font-bold leading-tight text-slate-900 tnum">{{ s.value }}</p>
          </div>
          <span class="ml-auto text-[11px] text-slate-400">{{ s.sub }}</span>
        </div>
      </div>

      <!-- aksi cepat -->
      <div class="flex flex-wrap gap-2">
        <span v-for="a in ['Sirkulasi · Pinjam & kembali', 'Data Koleksi · Kelola buku', 'Pengunjung · Catat kunjungan', 'Laporan · Statistik & cetak']"
          :key="a" class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700"
        >
          {{ a }} <ArrowRight class="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
        </span>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-3 gap-3">
        <!-- tren -->
        <div class="card-flat col-span-2 flex flex-col p-4">
          <div class="mb-2">
            <h3 class="card-title">Tren Kunjungan & Peminjaman</h3>
            <p class="secondary mt-0.5">September2026</p>
          </div>
          <div class="flex min-h-0 flex-1 items-end gap-1.5 pt-2">
            <div v-for="t in trend" :key="t.d" class="flex h-full flex-1 flex-col justify-end gap-1">
              <div class="w-full rounded-t-[3px] bg-blue-700/80" :style="{ height: `${(t.v / maxV) * 100}%` }" :title="`${t.d} Sep · ${t.v} pengunjung`" />
              <span class="text-center text-[8px] leading-none text-slate-400">{{ t.d }}</span>
            </div>
          </div>
          <div class="mt-2 flex items-center gap-4 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-blue-700" /> Kunjungan</span>
            <span class="ml-auto">Total bulan ini: {{ perpusStats.kunjunganHariIni * 14 }} (demo agregat)</span>
          </div>
        </div>

        <!-- pinjam terakhir -->
        <div class="card-flat flex flex-col p-4">
          <h3 class="card-title">Peminjaman Terakhir</h3>
          <p class="secondary mt-0.5">5 transaksi terbaru</p>
          <div class="mt-2.5 flex flex-col gap-2">
            <div v-for="l in sirkulasi" :key="l.siswa + l.buku" class="rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-[12.5px] font-semibold text-slate-800">{{ l.siswa }}</p>
                <span :class="loanTone[l.status]" class="!text-[10px]">{{ l.status }}</span>
              </div>
              <p class="truncate text-[11.5px] text-slate-500">{{ l.buku }} · {{ l.kelas }}</p>
            </div>
          </div>
          <div class="mt-auto border-t border-slate-100 pt-2 text-[11px] text-slate-400">Data fiktif demo</div>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
