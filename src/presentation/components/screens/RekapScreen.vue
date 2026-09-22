<script setup>
// Rekonstruksi Rekap Bulanan (matriks H/I/S/A + ringkasan persen).
import { computed } from 'vue'
import { FileDown, Table2 } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { rekap5A } from '@/presentation/mock'

const props = defineProps({
  role: { type: String, default: 'guru' },
})

// Hari kerja Sep2026 (1=Wed) yang tampil sebagai kolom — demo tampilkan22 hari.
const DAYS = Array.from({ length: 22 }, (_, i) => i + 1)
const liburSet = new Set(rekap5A.libur)
const showDays = DAYS

const pct = (r) => {
  const total = r.H + r.I + r.S + r.A
  return total ? Math.round((r.H / total) * 100) : 0
}
const cell = (nisn, day) => {
  if (liburSet.has(day)) return { txt: '', cls: 'bg-slate-50 text-slate-300' }
  const ex = rekap5A.exceptions[nisn]?.[day]
  if (ex === 'I') return { txt: 'I', cls: 'text-sky-600' }
  if (ex === 'S') return { txt: 'S', cls: 'text-amber-600' }
  if (ex === 'A') return { txt: 'A', cls: 'font-bold text-rose-600' }
  return { txt: 'H', cls: 'text-emerald-600' }
}
const rows = computed(() => rekap5A.rows)
</script>

<template>
  <MockAppFrame
    active="rekap"
    :role="role"
    page-title="Rekap Bulanan"
    page-subtitle="September 2026 · Kelas 5A ·15 hari tercatat"
  >
    <template #actions>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><FileDown class="h-3.5 w-3.5" />PDF</span>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><Table2 class="h-3.5 w-3.5" />Excel</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <!-- filter -->
      <div class="card-flat grid grid-cols-3 gap-2.5 p-3">
        <div>
          <label class="input-label">Kelas</label>
          <select class="input-field" :disabled="role === 'guru'">
            <option>Kelas 5A</option>
            <option v-if="role === 'admin'">Kelas 5B</option>
          </select>
        </div>
        <div>
          <label class="input-label">Bulan</label>
          <select class="input-field"><option>September</option></select>
        </div>
        <div>
          <label class="input-label">Tahun</label>
          <select class="input-field"><option>2026</option></select>
        </div>
      </div>

      <!-- matriks -->
      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Matriks rekap kehadiran kelas 5A September2026 (demo fiktif)</caption>
            <thead>
              <tr>
                <th class="!text-center">#</th>
                <th>Nama</th>
                <th v-for="d in showDays" :key="d" class="!px-1 !text-center !text-[10px]">{{ d }}</th>
                <th class="!text-center">H</th>
                <th class="!text-center">I</th>
                <th class="!text-center">S</th>
                <th class="!text-center">A</th>
                <th class="!text-center">%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.nisn">
                <td class="!text-center text-slate-400">{{ i + 1 }}</td>
                <td class="cell-main whitespace-nowrap">{{ r.nama }}</td>
                <td
                  v-for="d in showDays"
                  :key="d"
                  class="!px-1 !py-1.5 !text-center !text-[11px]"
                  :class="cell(r.nisn, d).cls"
                >{{ cell(r.nisn, d).txt }}</td>
                <td class="cell-num text-emerald-700">{{ r.H }}</td>
                <td class="cell-num" :class="r.I ? 'text-sky-700' : 'text-slate-400'">{{ r.I }}</td>
                <td class="cell-num" :class="r.S ? 'text-amber-600' : 'text-slate-400'">{{ r.S }}</td>
                <td class="cell-num" :class="r.A ? 'text-rose-600' : 'text-slate-400'">{{ r.A }}</td>
                <td class="cell-num" :class="pct(r) < 80 ? 'text-rose-700' : 'text-emerald-700'">{{ pct(r) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span>Sel abu = akhir pekan/libur · H/I/S/A = status harian</span>
          <span>10 siswa · data fiktif demo</span>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
