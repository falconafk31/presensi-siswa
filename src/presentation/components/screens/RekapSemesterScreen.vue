<script setup>
// Rekonstruksi Rekap Semester.
import { FileDown, CalendarRange } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { rekapSemester5A } from '@/presentation/mock'

const props = defineProps({ role: { type: String, default: 'guru' } })
const d = rekapSemester5A
const pct = (r) => Math.round((r.H / d.hariEfektif) * 100)
</script>

<template>
  <MockAppFrame
    active="rekap-semester"
    :role="role"
    page-title="Rekap Semester"
    :page-subtitle="`Ganjil ${d.rentang}`"
  >
    <template #actions>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><FileDown class="h-3.5 w-3.5" />Cetak PDF</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <div class="card-flat grid grid-cols-3 gap-2.5 p-3">
        <div>
          <label class="input-label">Kelas</label>
          <select class="input-field" :disabled="role === 'guru'"><option>Kelas 5A</option></select>
        </div>
        <div>
          <label class="input-label">Dari tanggal</label>
          <input class="input-field" type="text" value="13 Juli 2026" readonly />
        </div>
        <div>
          <label class="input-label">Sampai tanggal</label>
          <input class="input-field" type="text" value="22 September 2026" readonly />
        </div>
      </div>

      <!-- ringkasan hari efektif -->
      <div class="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">
        <div class="bg-white px-3 py-2.5">
          <p class="text-[11px] text-slate-500">Total hari efektif</p>
          <p class="text-lg font-bold text-slate-900 tnum">{{ d.hariEfektif }}</p>
        </div>
        <div v-for="b in d.perBulan" :key="b.bulan" class="bg-white px-3 py-2.5">
          <p class="text-[11px] text-slate-500">{{ b.bulan }}</p>
          <p class="text-lg font-bold text-slate-900 tnum">{{ b.hari }} hari</p>
        </div>
      </div>

      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Rekap semester kelas5A (demo fiktif)</caption>
            <thead>
              <tr>
                <th class="!text-center">#</th>
                <th>Nama Siswa</th>
                <th class="!text-center">Hadir</th>
                <th class="!text-center">Izin</th>
                <th class="!text-center">Sakit</th>
                <th class="!text-center">Alfa</th>
                <th class="!text-center">Persentase</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in d.rows" :key="r.nama">
                <td class="!text-center text-slate-400">{{ i + 1 }}</td>
                <td class="cell-main">{{ r.nama }}</td>
                <td class="cell-num text-emerald-700">{{ r.H }}</td>
                <td class="cell-num" :class="r.I ? 'text-sky-700' : 'text-slate-400'">{{ r.I }}</td>
                <td class="cell-num" :class="r.S ? 'text-amber-600' : 'text-slate-400'">{{ r.S }}</td>
                <td class="cell-num" :class="r.A ? 'font-bold text-rose-600' : 'text-slate-400'">{{ r.A }}</td>
                <td class="cell-num" :class="pct(r) < 90 ? 'text-rose-700' : 'text-emerald-700'">{{ pct(r) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span class="inline-flex items-center gap-1.5"><CalendarRange class="h-3 w-3" />Rentang otomatis tahun ajaran aktif</span>
          <span>10 siswa · data fiktif demo</span>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
