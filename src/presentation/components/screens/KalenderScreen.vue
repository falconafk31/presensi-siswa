<script setup>
// Rekonstruksi Kalender Akademik Sep2026 (1=Wednesday).
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'

const props = defineProps({
  role: { type: String, default: 'admin' }, // admin: editable, guru: read-only
})

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
// Sep2026: Selasa1 → blanks=2 (Min,Sen).
const blanks = 2
const days =28 // tampilkan28 sel? Sep punya30 hari
const totalDays =30
const cells = [
  ...Array.from({ length: blanks }, () => null),
  ...Array.from({ length: totalDays }, (_, i) => i + 1),
]
const isWeekend = (n) => {
  const dow = (blanks + n - 1) % 7 //0=Min
  return dow === 0 || dow === 6
}
const extraLibur = new Set([14]) // contoh: libur kegiatan madrasah (Senin)
const isLibur = (n) => isWeekend(n) || extraLibur.has(n)
</script>

<template>
  <MockAppFrame
    active="kalender"
    :role="role"
    page-title="Kalender Akademik"
    :page-subtitle="role === 'admin'
      ? 'Ketuk tanggal untuk mengubah status Masuk / Libur'
      : 'Tanggal masuk & libur untuk kegiatan presensi. Pengubahan hanya oleh Admin.'"
  >
    <div class="flex h-full items-start justify-center">
      <div class="card-flat w-[760px] p-5">
        <div class="mb-3 flex items-center justify-between">
          <span class="btn-icon !h-8 !w-8"><ChevronLeft class="h-5 w-5" /></span>
          <h3 class="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
            <CalendarDays class="h-4 w-4 text-primary-600" aria-hidden="true" />
            September 2026
          </h3>
          <span class="btn-icon !h-8 !w-8"><ChevronRight class="h-5 w-5" /></span>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center">
          <div v-for="h in HARI" :key="h" class="py-1 text-xs font-medium text-slate-400">{{ h }}</div>
        </div>
        <div class="mt-1 grid grid-cols-7 gap-1">
          <template v-for="(iso, i) in cells" :key="i">
            <div v-if="!iso" aria-hidden="true" />
            <div
              v-else
              class="flex aspect-square min-h-[52px] flex-col items-center justify-center rounded-lg border text-sm"
              :class="isLibur(iso)
                ? 'border-rose-200 bg-rose-50 font-semibold text-rose-600'
                : (iso === 22
                  ? 'border-primary-600 bg-primary-50 font-semibold text-primary-800 ring-1 ring-primary-600'
                  : 'border-slate-200 bg-white text-slate-700')"
            >
              <span class="tnum">{{ iso }}</span>
              <span v-if="isLibur(iso)" class="mt-0.5 text-[9px] font-semibold uppercase tracking-wide">Libur</span>
              <span v-else-if="iso === 22" class="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-600">Hari ini</span>
            </div>
          </template>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-200" /> Libur</span>
          <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-white ring-1 ring-slate-200" /> Masuk</span>
          <span class="ml-auto italic">
            Akhir pekan otomatis libur{{ role === 'admin' ? ' (dapat diubah)' : ' · read-only untuk Guru' }}.
          </span>
        </div>
        <p v-if="role === 'admin'" class="mt-2 text-[11px] text-slate-400">Klik tanggal → tandai Libur (dengan keterangan) atau kembalikan ke Masuk.</p>
      </div>
    </div>
  </MockAppFrame>
</template>
