<script setup>
// Rekonstruksi Dashboard Presensi (Admin & Guru) dengan mock konsisten.
import { computed } from 'vue'
import {
  Users, UserCheck, CalendarX2, TriangleAlert, CircleAlert,
  ClipboardCheck, FileSpreadsheet, CalendarDays, ArrowRight, CheckCircle2,
} from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { dashboardAdmin, dashboardGuru5A, trenBulanan, DEMO_TODAY_LABEL, kelasBelumPresensi } from '@/presentation/mock'
import { CHART_COLORS } from '@/config/designSystem'

const props = defineProps({
  variant: { type: String, default: 'admin' }, // admin | guru
})

const isGuru = computed(() => props.variant === 'guru')
const d = computed(() => (isGuru.value ? dashboardGuru5A : dashboardAdmin))
const kpi = computed(() => {
  const base = d.value
  return [
    { label: 'Total Siswa', value: base.totalSiswa ?? base.total, icon: Users, tone: 'primary', sub: isGuru.value ? 'Kelas 5A' : '3 kelas' },
    { label: 'Hadir', value: base.hadir, icon: UserCheck, tone: 'success', sub: `${base.persen}% kehadiran` },
    { label: 'Izin', value: base.izin, icon: CalendarX2, tone: 'info', sub: 'Hari ini' },
    { label: 'Sakit', value: base.sakit, icon: CircleAlert, tone: 'warning', sub: 'Hari ini' },
    { label: 'Alfa', value: base.alfa, icon: TriangleAlert, tone: 'danger', sub: 'Hari ini' },
  ]
})
const toneChip = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  info: 'bg-sky-50 text-sky-600 ring-sky-200',
  warning: 'bg-amber-50 text-amber-600 ring-amber-200',
  danger: 'bg-rose-50 text-rose-600 ring-rose-200',
}

// Donat via conic-gradient (warna EXACT attendance)
const donut = computed(() => {
  const { hadir, izin, sakit, alfa, tercatat } = d.value
  const total = Math.max(tercatat, 1)
  const p = [hadir, izin, sakit, alfa].map((v) => (v / total) * 360)
  const a1 = p[0]
  const a2 = a1 + p[1]
  const a3 = a2 + p[2]
  return {
    background: `conic-gradient(${CHART_COLORS.hadir} 0deg ${a1}deg, ${CHART_COLORS.izin} ${a1}deg ${a2}deg, ${CHART_COLORS.sakit} ${a2}deg ${a3}deg, ${CHART_COLORS.alfa} ${a3}deg 360deg)`,
  }
})
const donutLegend = computed(() => [
  ['Hadir', d.value.hadir, 'bg-emerald-700'],
  ['Izin', d.value.izin, 'bg-sky-700'],
  ['Sakit', d.value.sakit, 'bg-amber-600'],
  ['Alfa', d.value.alfa, 'bg-rose-700'],
])

const maxTren = Math.max(...trenBulanan.map((t) => t.hadir || 0))
</script>

<template>
  <MockAppFrame
    active="dashboard"
    :role="isGuru ? 'guru' : 'admin'"
    page-title="Dashboard Presensi"
    :page-subtitle="`${DEMO_TODAY_LABEL} · ${isGuru ? 'Kelas 5A' : 'Semua kelas'}`"
  >
    <template #actions>
      <span class="btn-primary pointer-events-none !py-1.5 !text-xs">
        <ClipboardCheck class="h-3.5 w-3.5" aria-hidden="true" />
        Input Presensi
      </span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <!-- strip status -->
      <div
        v-if="!isGuru"
        class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800"
      >
        <TriangleAlert class="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span class="font-semibold">Perlu perhatian</span>
        <span>{{ kelasBelumPresensi.length }} kelas belum presensi ({{ kelasBelumPresensi.join(', ') }})</span>
        <span class="btn-secondary pointer-events-none ml-auto !min-h-[28px] !px-2.5 !py-0.5 !text-xs">Lihat</span>
      </div>
      <div v-else class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
        <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        Kelas 5A sudah presensi · Tidak ada Alfa
      </div>

      <!-- KPI strip -->
      <div class="grid grid-cols-5 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">
        <div v-for="s in kpi" :key="s.label" class="flex min-h-[60px] items-center gap-2.5 bg-white px-3 py-2.5">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1" :class="toneChip[s.tone]">
            <component :is="s.icon" class="h-4 w-4" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-[11px] leading-tight text-slate-500">{{ s.label }}</p>
            <p class="truncate text-lg font-bold leading-tight text-slate-900 tnum">{{ s.value }}</p>
          </div>
          <span class="ml-auto hidden shrink-0 text-[11px] text-slate-400 xl:block">{{ s.sub }}</span>
        </div>
      </div>

      <!-- aksi cepat -->
      <div class="flex flex-wrap gap-2">
        <span
          v-for="a in (isGuru
            ? [{ l: 'Input Presensi' }, { l: 'Rekap Bulanan' }, { l: 'Statistik' }, { l: 'Kalender' }]
            : [{ l: 'Input Presensi' }, { l: 'Rekap Bulanan' }, { l: 'Data Siswa' }, { l: 'Kalender' }])"
          :key="a.l"
          class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700"
        >
          {{ a.l }}
          <ArrowRight class="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
        </span>
      </div>

      <!-- charts -->
      <div class="grid min-h-0 flex-1 grid-cols-3 gap-3">
        <div class="card-flat col-span-2 flex flex-col p-4">
          <div class="mb-2 flex items-center justify-between">
            <div>
              <h3 class="card-title">Tren Kehadiran</h3>
              <p class="secondary mt-0.5">September 2026</p>
            </div>
            <span class="chip-tabs">
              <span class="chip-tab">7 Hari</span>
              <span class="chip-tab !border-primary-700 !bg-primary-700 !text-white">Bulanan</span>
              <span class="chip-tab">Tahunan</span>
            </span>
          </div>
          <!-- bar chart sederhana (CSS) -->
          <div class="flex min-h-0 flex-1 items-end gap-[3px] pt-2" role="img" aria-label="Grafik tren kehadiran September">
            <template v-for="t in trenBulanan" :key="t.day">
              <div class="group flex h-full flex-1 flex-col justify-end gap-1">
                <div
                  class="w-full rounded-t-[3px]"
                  :class="t.hadir === 0 ? 'bg-slate-100' : (t.day === 22 ? 'bg-amber-500' : 'bg-primary-700/85')"
                  :style="{ height: `${Math.max(((t.hadir || 0) / maxTren) * 100, t.hadir === 0 ? 4 : 6)}%` }"
                  :title="`${t.day} Sep · ${t.hadir ?? '—'} hadir`"
                />
                <span class="text-center text-[8px] leading-none text-slate-400">{{ t.day }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="card-flat flex flex-col p-4">
          <h3 class="card-title">Komposisi Hari Ini</h3>
          <p class="secondary mt-0.5">{{ d.tercatat }} siswa tercatat</p>
          <div class="mt-3 flex items-center gap-4">
            <div class="relative h-[120px] w-[120px] shrink-0 rounded-full" :style="donut">
              <div class="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-white">
                <span class="text-xl font-bold leading-none text-slate-900 tnum">{{ d.persen }}%</span>
                <span class="mt-0.5 text-[9px] text-slate-400">hadir</span>
              </div>
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div v-for="([label, val, cls], i) in donutLegend" :key="i" class="flex items-center gap-1.5 text-[12.5px]">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="cls" aria-hidden="true" />
                <span class="text-slate-500">{{ label }}</span>
                <span class="ml-auto font-semibold text-slate-900 tnum">{{ val }}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 border-t border-slate-100 pt-2.5">
            <p class="flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Tidak hadir hari ini</span>
              <span class="tnum text-[13px] font-bold normal-case tracking-normal text-rose-700">
                {{ d.izin + d.sakit + d.alfa }} siswa
              </span>
            </p>
            <div class="mt-1.5 flex flex-col gap-1 text-[12.5px] leading-snug">
              <p v-if="d.izin" class="text-slate-600"><span class="font-semibold text-sky-700">Izin {{ d.izin }}:</span> Nabila Putri</p>
              <p v-if="d.sakit" class="text-slate-600">
                <span class="font-semibold text-amber-700">Sakit {{ d.sakit }}:</span>
                {{ isGuru ? 'Rizky Maulana' : 'Rizky Maulana, Farhan Abdillah' }}
              </p>
              <p v-if="!d.izin && !d.sakit && !d.alfa" class="text-slate-500">Semua siswa hadir hari ini</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
