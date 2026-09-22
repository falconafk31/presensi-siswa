<script setup>
// Rekonstruksi Statistik Kehadiran (urut terendah + ambang batas).
import { TriangleAlert, RefreshCw } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { statistikRows, statistikThreshold, statistikDiBawah, statistikBulan } from '@/presentation/mock'

const props = defineProps({ role: { type: String, default: 'guru' } })
</script>

<template>
  <MockAppFrame
    active="statistik"
    :role="role"
    page-title="Statistik Kehadiran"
    :page-subtitle="`${statistikBulan} — urut dari kehadiran terendah`"
  >
    <template #actions>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><RefreshCw class="h-3.5 w-3.5" />Muat Ulang</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <div class="card-flat grid grid-cols-3 gap-2.5 p-3">
        <div>
          <label class="input-label">Kelas</label>
          <select class="input-field" :disabled="role === 'guru'">
            <option v-if="role === 'admin'">Semua Kelas</option>
            <option>Kelas 5A</option>
          </select>
        </div>
        <div>
          <label class="input-label">Ambang batas (%)</label>
          <input class="input-field tnum" type="text" :value="statistikThreshold" readonly />
        </div>
        <div class="flex items-end">
          <div class="flex w-full items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <TriangleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong class="tnum">{{ statistikDiBawah }}</strong> siswa di bawah {{ statistikThreshold }}%</span>
          </div>
        </div>
      </div>

      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Statistik kehadiran bulan berjalan (demo fiktif)</caption>
            <thead>
              <tr>
                <th class="!text-center">#</th>
                <th>Nama</th>
                <th class="!text-center">Kelas</th>
                <th class="!text-center" title="Izin">I</th>
                <th class="!text-center" title="Sakit">S</th>
                <th class="!text-center" title="Alfa">A</th>
                <th class="!text-center" title="Kehadiran aktual">Hadir</th>
                <th class="!text-center" title="Total hari efektif">Tercatat</th>
                <th class="!text-center">% (Bebas Alfa)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in statistikRows"
                :key="r.nisn"
                :class="r.persen < statistikThreshold ? 'row-alert' : ''"
              >
                <td class="!text-center text-slate-400">{{ i + 1 }}</td>
                <td class="cell-main">{{ r.nama }}</td>
                <td>{{ r.kelas }}</td>
                <td class="cell-num" :class="r.i ? 'text-sky-700' : 'text-slate-400'">{{ r.i || '–' }}</td>
                <td class="cell-num" :class="r.s ? 'text-amber-600' : 'text-slate-400'">{{ r.s || '–' }}</td>
                <td class="cell-num" :class="r.a ? 'text-rose-600' : 'text-slate-400'">{{ r.a || '–' }}</td>
                <td class="cell-num">{{ r.hadir }}</td>
                <td class="cell-num !font-normal text-slate-500">{{ r.total }}</td>
                <td class="cell-num" :class="r.persen < statistikThreshold ? 'text-rose-700' : 'text-emerald-700'">{{ r.persen }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span>Menampilkan1–10 dari10 siswa</span>
          <span>15 hari tercatat · data fiktif demo</span>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
