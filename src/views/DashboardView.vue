<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import {
  Users, UserCheck, CalendarX2, TriangleAlert, FileSpreadsheet,
  ClipboardCheck, CalendarDays, ArrowRight, CircleAlert, PartyPopper,
  Loader2,
  CheckCircle2,
} from 'lucide-vue-next'
import { defineAsyncComponent } from 'vue'
import { supabase, whenRealtimeReady } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { todayISO, daysInMonth, dayNumber, namaBulan, isWeekend, formatTanggalPanjang } from '@/lib/dates'
import { CHART_COLORS } from '@/config/designSystem'
import {
  AppPageHeader, AppCard, AppTabs, AppBadge, AppButton,
} from '@/components/ui'
import { ICON_CHIP } from '@/config/designSystem'

// Grafik di-lazy-load via chartSetup (code-splitting) — chart.js tidak lagi
// berada di jalur kritis render pertama dashboard.
const Doughnut = defineAsyncComponent(() => import('@/lib/chartSetup').then((m) => m.Doughnut))
const Line = defineAsyncComponent(() => import('@/lib/chartSetup').then((m) => m.Line))

const auth = useAuthStore()
const initialLoading = ref(true)
const refreshing = ref(false)
const today = todayISO()
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const counts = ref({ Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 })
const totalSiswa = ref(0)
const monthly = ref([])
const absentStudents = ref({ Izin: [], Sakit: [], Alfa: [] })
const unsubmittedClasses = ref([])
const submittedCount = ref(0)
const trendMode = ref('monthly')
let channel = null

const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const selectedTab = ref('')

const kelasFilter = computed(() => (auth.isAdmin ? (selectedTab.value || null) : auth.kelas))
const kelasTabs = computed(() => [
  { value: '', label: 'Semua Kelas' },
  ...daftarKelas.value.map((k) => ({ value: k, label: `Kelas ${k}` })),
])

const totalTidakHadir = computed(() => counts.value.Izin + counts.value.Sakit + counts.value.Alfa)
const totalAbsenNames = computed(() =>
  absentStudents.value.Izin.length + absentStudents.value.Sakit.length + absentStudents.value.Alfa.length
)
const isHariLibur = ref(false)
const isBelumAbsen = ref(false)

const attendanceRate = computed(() => {
  const total = counts.value.Hadir + totalTidakHadir.value
  if (total === 0) return null
  return Math.round((counts.value.Hadir / total) * 100)
})

const quickActions = computed(() => {
  const actions = [
    { label: 'Input Presensi', desc: 'Catat kehadiran', icon: ClipboardCheck, to: { name: 'presensi' } },
    { label: 'Rekap Bulanan', desc: 'Lihat & unduh', icon: FileSpreadsheet, to: { name: 'rekap' } },
  ]
  if (auth.isAdmin) {
    actions.push(
      { label: 'Data Siswa', desc: 'Kelola siswa', icon: Users, to: { name: 'siswa' } },
      { label: 'Kalender', desc: 'Hari efektif', icon: CalendarDays, to: { name: 'kalender' } },
    )
  } else {
    actions.push(
      { label: 'Statistik', desc: 'Kehadiran kelas', icon: TriangleAlert, to: { name: 'statistik' } },
      { label: 'Kalender', desc: 'Hari efektif', icon: CalendarDays, to: { name: 'kalender' } },
    )
  }
  return actions
})

// ---- Data fetching (business logic preserved) ----
async function fetchTotalSiswa() {
  let q = supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true)
  if (kelasFilter.value) q = q.eq('kelas', kelasFilter.value)
  else if (auth.isAdmin && daftarKelas.value.length > 0) q = q.in('kelas', daftarKelas.value)
  const { count } = await q
  totalSiswa.value = count || 0
}

async function fetchToday() {
  const { data: kal } = await supabase.from('academic_calendar').select('status').eq('date', today).maybeSingle()
  isHariLibur.value = kal?.status === 'Libur' || (!kal && isWeekend(today))
  isBelumAbsen.value = false
  unsubmittedClasses.value = []
  submittedCount.value = 0

  if (isHariLibur.value) {
    counts.value = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
    absentStudents.value = { Izin: [], Sakit: [], Alfa: [] }
    return
  }

  const [{ data: acts }, { data: attLogs }] = await Promise.all([
    supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi').like('record_id', `${today}:%`),
    supabase.from('attendance_logs').select('kelas').eq('date', today),
  ])

  const subSet = new Set()
  for (const a of acts || []) subSet.add(a.record_id.split(':')[1])
  for (const l of attLogs || []) subSet.add(l.kelas)

  let classesSub = Array.from(subSet)
  if (kelasFilter.value) classesSub = classesSub.filter((c) => c === kelasFilter.value)
  else if (auth.isAdmin && daftarKelas.value.length > 0) classesSub = classesSub.filter((c) => daftarKelas.value.includes(c))

  // Attention data: which classes haven't submitted yet (admin overview)
  if (auth.isAdmin && !kelasFilter.value && daftarKelas.value.length > 0) {
    unsubmittedClasses.value = daftarKelas.value.filter((k) => !classesSub.includes(k))
  }
  submittedCount.value = classesSub.length

  if (classesSub.length === 0) {
    counts.value = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
    absentStudents.value = { Izin: [], Sakit: [], Alfa: [] }
    isBelumAbsen.value = true
    return
  }

  const qSiswa = supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true).in('kelas', classesSub)
  const { count: submittedSiswaCount } = await qSiswa

  const q = supabase.from('attendance_logs').select('status, students(nama, kelas)').eq('date', today).in('kelas', classesSub)
  const { data } = await q
  const c = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
  const absents = { Izin: [], Sakit: [], Alfa: [] }
  for (const row of data || []) {
    if (row.status !== 'Hadir') {
      c[row.status] = (c[row.status] || 0) + 1
      if (absents[row.status] && row.students) absents[row.status].push(row.students)
    }
  }
  absents.Izin.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''))
  absents.Sakit.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''))
  absents.Alfa.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''))

  c.Hadir = (submittedSiswaCount || 0) - c.Izin - c.Sakit - c.Alfa
  counts.value = c
  absentStudents.value = absents
}

let trendRun = 0 // token anti-balapan: hanya fetch terakhir yang commit

async function fetchTrend() {
  // Tangkap mode di awal panggilan. fetchTrend() dapat tumpang-tindih saat
  // pengguna berpindah tab/bulan/tahun dengan cepat; tanpa ini, dateList yang
  // dibangun untuk satu mode bisa dipetakan dengan logika mode lain
  // (number[] ke dayNumber / string[] ke namaBulan) → TypeError.
  const mode = trendMode.value
  const run = ++trendRun

  let startDate = ''
  let endDate = ''
  let dateList = []

  if (mode === 'daily') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    startDate = d.toISOString().split('T')[0]
    endDate = today
    for (let i = 0; i < 7; i++) {
      const dt = new Date(d)
      dt.setDate(dt.getDate() + i)
      dateList.push(dt.toISOString().split('T')[0])
    }
  } else if (mode === 'monthly') {
    dateList = daysInMonth(year.value, month.value)
    startDate = dateList[0]
    endDate = dateList[dateList.length - 1]
  } else if (mode === 'yearly') {
    startDate = `${year.value}-01-01`
    endDate = `${year.value}-12-31`
    dateList = Array.from({ length: 12 }, (_, i) => i + 1)
  }

  const [{ data: kal }, { data: acts }] = await Promise.all([
    supabase.from('academic_calendar').select('date').gte('date', startDate).lte('date', endDate).eq('status', 'Libur'),
    supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi').gte('record_id', startDate).lte('record_id', endDate + '~'),
  ])

  const liburSet = new Set((kal || []).map((k) => k.date))
  if (mode !== 'yearly') {
    for (const d of dateList) if (isWeekend(d)) liburSet.add(d)
  }

  const submittedMap = {}
  for (const a of acts || []) {
    const [d, k] = a.record_id.split(':')
    if (!submittedMap[d]) submittedMap[d] = new Set()
    submittedMap[d].add(k)
  }

  let q = supabase.from('attendance_logs').select('date, kelas, status').gte('date', startDate).lte('date', endDate)
  if (kelasFilter.value) q = q.eq('kelas', kelasFilter.value)
  const { data } = await q

  // Abaikan respons basi: hanya panggilan terbaru yang boleh menulis hasil.
  if (run !== trendRun) return

  const exceptionsPerDay = {}
  for (const row of data || []) {
    if (!submittedMap[row.date]) submittedMap[row.date] = new Set()
    submittedMap[row.date].add(row.kelas)
    if (row.status !== 'Hadir') exceptionsPerDay[row.date] = (exceptionsPerDay[row.date] || 0) + 1
  }

  if (mode === 'yearly') {
    monthly.value = dateList.map((m) => {
      const mStr = String(m).padStart(2, '0')
      const prefix = `${year.value}-${mStr}`
      let daysWithSubmissions = 0
      let totalHadirMonth = 0
      for (let i = 1; i <= 31; i++) {
        const d = `${prefix}-${String(i).padStart(2, '0')}`
        if (d > today) continue
        let kSub = submittedMap[d] ? Array.from(submittedMap[d]) : []
        if (kelasFilter.value) kSub = kSub.filter((c) => c === kelasFilter.value)
        else if (auth.isAdmin && daftarKelas.value.length > 0) kSub = kSub.filter((c) => daftarKelas.value.includes(c))
        if (kSub.length > 0) {
          daysWithSubmissions++
          totalHadirMonth += totalSiswa.value - (exceptionsPerDay[d] || 0)
        }
      }
      const avgHadir = daysWithSubmissions > 0 ? Math.round(totalHadirMonth / daysWithSubmissions) : null
      return { day: namaBulan(m).substring(0, 3), hadir: avgHadir }
    })
  } else {
    monthly.value = dateList.map((d) => {
      const displayDay = mode === 'daily' ? `${d.substring(8, 10)}/${d.substring(5, 7)}` : dayNumber(d)
      if (d > today) return { day: displayDay, hadir: null }
      if (liburSet.has(d)) return { day: displayDay, hadir: 0 }
      let kSub = submittedMap[d] ? Array.from(submittedMap[d]) : []
      if (kelasFilter.value) kSub = kSub.filter((c) => c === kelasFilter.value)
      else if (auth.isAdmin && daftarKelas.value.length > 0) kSub = kSub.filter((c) => daftarKelas.value.includes(c))
      if (kSub.length === 0) return { day: displayDay, hadir: null }
      return { day: displayDay, hadir: totalSiswa.value - (exceptionsPerDay[d] || 0) }
    })
  }
}

async function loadAll({ initial = false } = {}) {
  // Initial load → full skeleton; filter change → light refresh indicator.
  if (initial) initialLoading.value = true
  else refreshing.value = true
  try {
    // Settings are global (not class-dependent): refetch only on initial
    // load, or if missing. Class-filter changes reuse cached settings.
    if (initial || !settingsStore.settings) await settingsStore.fetchSettings(true)
    await Promise.all([fetchTotalSiswa(), fetchToday(), fetchTrend()])
  } finally {
    if (initial) initialLoading.value = false
    else refreshing.value = false
  }
}

onMounted(async () => {
  await loadAll({ initial: true })
  const debouncedRefresh = useDebounceFn(() => {
    fetchToday()
    fetchTrend()
  }, 1000)
  // Pastikan chunk realtime-js (lazy-load) sudah siap sebelum subscribe.
  await whenRealtimeReady()
  const channelName = `dashboard-attendance-${Date.now()}`
  channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => debouncedRefresh())
    .subscribe()
})

onUnmounted(() => {
  if (channel) supabase.removeChannel(channel)
})

watch(selectedTab, () => loadAll())

// ---- Charts ----
const doughnutData = computed(() => ({
  labels: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
  datasets: [{
    data: [counts.value.Hadir, counts.value.Izin, counts.value.Sakit, counts.value.Alfa],
    backgroundColor: [CHART_COLORS.hadir, CHART_COLORS.izin, CHART_COLORS.sakit, CHART_COLORS.alfa],
    borderWidth: 2,
    borderColor: '#ffffff',
    hoverOffset: 4,
  }],
}))
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 5, useBorderRadius: true, padding: 14 } },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
}
const lineData = computed(() => ({
  labels: monthly.value.map((d) => d.day),
  datasets: [{
    label: 'Hadir',
    data: monthly.value.map((d) => d.hadir),
    borderColor: CHART_COLORS.line,
    backgroundColor: CHART_COLORS.lineFill,
    fill: true,
    tension: 0.35,
    pointRadius: 2.5,
    pointBackgroundColor: CHART_COLORS.line,
    borderWidth: 2,
    spanGaps: false,
  }],
}))
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8 } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
}
const trendTitle = computed(() => {
  if (trendMode.value === 'daily') return '7 hari terakhir'
  if (trendMode.value === 'monthly') return `${namaBulan(month.value)} ${year.value}`
  return `Tahun ${year.value}`
})
const trendModes = [
  { value: 'daily', label: '7 Hari' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

const overviewStats = computed(() => {
  const dash = isHariLibur.value || isBelumAbsen.value
  return [
    { label: 'Total Siswa', value: totalSiswa.value, icon: Users, tone: 'primary', sub: kelasFilter.value ? `Kelas ${kelasFilter.value}` : `${daftarKelas.value.length} kelas` },
    { label: 'Hadir', value: dash ? '—' : counts.value.Hadir, icon: UserCheck, tone: 'success', sub: attendanceRate.value != null && !dash ? `${attendanceRate.value}% kehadiran` : 'Hari ini' },
    { label: 'Izin', value: dash ? '—' : counts.value.Izin, icon: CalendarX2, tone: 'info', sub: 'Hari ini' },
    { label: 'Sakit', value: dash ? '—' : counts.value.Sakit, icon: CircleAlert, tone: 'warning', sub: 'Hari ini' },
    { label: 'Alfa', value: dash ? '—' : counts.value.Alfa, icon: TriangleAlert, tone: 'danger', sub: 'Hari ini' },
  ]
})

const hasAttention = computed(() =>
  !isHariLibur.value && (unsubmittedClasses.value.length > 0 || counts.value.Alfa > 0 || isBelumAbsen.value)
)
</script>

<template>
  <div class="flex flex-col gap-2.5 sm:gap-3">
    <AppPageHeader
      inline
      title="Dashboard Presensi"
      :subtitle="`${formatTanggalPanjang(today)}${auth.isAdmin ? (selectedTab ? ` · Kelas ${selectedTab}` : ' · Semua kelas') : ` · Kelas ${auth.kelas || '-'}`}`"
    >
      <template #actions>
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400" role="status">
          <Loader2 class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Memperbarui…
        </span>
        <AppButton :to="{ name: 'presensi' }">
          <template #icon><ClipboardCheck class="h-4 w-4" aria-hidden="true" /></template>
          Input Presensi
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Class filter (admin) -->
    <AppTabs
      v-if="auth.isAdmin && daftarKelas.length > 0"
      v-model="selectedTab"
      :options="kelasTabs"
      ariaLabel="Filter kelas"
    />

    <!-- Initial loading only; refresh keeps dashboard visible -->
    <div v-if="initialLoading" aria-live="polite" aria-busy="true" class="flex flex-col gap-3">
      <div class="h-12 animate-pulse rounded-xl bg-slate-200/70" />
      <div class="h-40 animate-pulse rounded-xl bg-slate-200/50" />
    </div>

    <template v-else>
      <!-- Status hari ini: strip ramping 1 baris (hemat tinggi, info tetap utuh) -->
      <div v-if="isHariLibur" class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
        <CalendarDays class="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        Hari libur — tidak ada kegiatan presensi sesuai kalender akademik.
      </div>
      <!-- Admin: strip monitoring ringkas (jumlah saja, detail via CTA) -->
      <template v-else-if="auth.isAdmin">
        <div v-if="hasAttention" class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <TriangleAlert class="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span class="font-semibold">Perlu perhatian</span>
          <span class="min-w-0 truncate">
            <span v-if="unsubmittedClasses.length">{{ unsubmittedClasses.length }} kelas belum presensi</span>
            <span v-else-if="isBelumAbsen">Kelas {{ kelasFilter }} belum presensi</span>
            <template v-if="counts.Alfa > 0"><span v-if="unsubmittedClasses.length || isBelumAbsen"> · </span><span class="font-medium text-rose-700">{{ counts.Alfa }} siswa Alfa</span></template>
          </span>
          <AppButton size="sm" class="ml-auto !py-1" :to="{ name: 'rekap' }">Lihat</AppButton>
        </div>
        <div v-else-if="submittedCount > 0" class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          Semua kelas sudah presensi · Tidak ada Alfa
        </div>
      </template>
      <!-- Guru: strip status existing (tidak diubah) -->
      <template v-else>
        <div v-if="isBelumAbsen" class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <ClipboardCheck class="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span><strong>{{ kelasFilter ? `Kelas ${kelasFilter}` : 'Belum ada kelas' }}</strong> yang mengisi presensi hari ini — segera isi agar rekap tetap akurat.</span>
          <AppButton size="sm" class="ml-auto !py-1" :to="{ name: 'presensi' }">Isi Sekarang</AppButton>
        </div>
        <div v-else-if="hasAttention" class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <TriangleAlert class="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span class="font-semibold">Perlu perhatian:</span>
          <template v-if="unsubmittedClasses.length">
            <span>{{ unsubmittedClasses.length }} kelas belum presensi</span>
            <span v-for="k in unsubmittedClasses.slice(0, 4)" :key="k" class="badge-warning !text-[11px]">{{ k }}</span>
            <span v-if="unsubmittedClasses.length > 4" class="text-xs text-amber-700">+{{ unsubmittedClasses.length - 4 }}</span>
          </template>
          <template v-if="counts.Alfa > 0">
            <span class="font-medium text-rose-700">· {{ counts.Alfa }} siswa Alfa</span>
            <span class="min-w-0 truncate text-xs text-rose-600">{{ absentStudents.Alfa.slice(0, 3).map((st) => st.nama).join(', ') }}{{ absentStudents.Alfa.length > 3 ? ` +${absentStudents.Alfa.length - 3} lagi` : '' }}</span>
          </template>
          <AppButton size="sm" class="ml-auto !py-1" :to="{ name: 'presensi' }">Isi Presensi</AppButton>
        </div>
        <div v-else-if="submittedCount > 0" class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          <PartyPopper class="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          Semua kelas sudah presensi dan tidak ada alfa. Kerja bagus!
        </div>
      </template>

      <!-- 1. Attendance overview: KPI bar satu kartu (ringkas, semua info tetap ada) -->
      <section aria-label="Ringkasan kehadiran hari ini">
        <div class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 sm:grid-cols-3 xl:grid-cols-5">
          <div v-for="s in overviewStats" :key="s.label" class="flex min-h-[60px] items-center gap-2.5 bg-white px-3 py-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1" :class="ICON_CHIP[s.tone]">
              <component :is="s.icon" class="h-4 w-4" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-[11px] leading-tight text-slate-500">{{ s.label }}</p>
              <p class="truncate text-lg font-bold leading-tight text-slate-900 tnum">{{ s.value }}</p>
            </div>
            <span class="ml-auto hidden shrink-0 text-[11px] text-slate-400 lg:block">{{ s.sub }}</span>
          </div>
        </div>
      </section>

      <!-- 2. Quick actions: baris pill ramping -->
      <section aria-label="Aksi cepat">
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="a in quickActions"
            :key="a.label"
            :to="a.to"
            class="group inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
          >
            <component :is="a.icon" class="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary-700" aria-hidden="true" />
            <span class="whitespace-nowrap">{{ a.label }}</span>
            <ArrowRight class="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600" aria-hidden="true" />
          </RouterLink>
        </div>
      </section>

      <!-- 4 & 5. Trend + composition -->
      <div class="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <AppCard :class="auth.isAdmin ? 'order-2 lg:order-1 lg:col-span-2' : 'lg:col-span-2'" title="Tren Kehadiran" :subtitle="trendTitle">
          <template #actions>
            <!-- Desktop: mode + filter bulan/tahun horizontal di header (posisi tetap) -->
            <div class="hidden flex-wrap items-center justify-end gap-1.5 lg:flex">
              <AppTabs v-model="trendMode" :options="trendModes" ariaLabel="Mode tren" @update:model-value="fetchTrend" />
              <select v-if="trendMode === 'monthly'" v-model.number="month" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih bulan" @change="fetchTrend">
                <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
              </select>
              <select v-if="trendMode !== 'daily'" v-model.number="year" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih tahun" @change="fetchTrend">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </template>
          <!-- Mobile: mode di atas, bulan & tahun grid 2 kolom (tanpa horizontal scroll) -->
          <div class="mb-2 flex flex-col gap-2 lg:hidden">
            <AppTabs v-model="trendMode" :options="trendModes" ariaLabel="Mode tren" @update:model-value="fetchTrend" />
            <div class="grid grid-cols-2 gap-2">
              <select v-if="trendMode === 'monthly'" v-model.number="month" class="input-field w-full !py-1.5 !text-xs" aria-label="Pilih bulan" @change="fetchTrend">
                <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
              </select>
              <select v-if="trendMode !== 'daily'" v-model.number="year" class="input-field w-full !py-1.5 !text-xs" aria-label="Pilih tahun" @change="fetchTrend">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>
          <div :class="auth.isAdmin ? 'h-[clamp(200px,30vh,300px)]' : 'h-[clamp(170px,26vh,240px)]'" role="img" :aria-label="`Grafik tren kehadiran ${trendTitle}`">
            <Line :data="lineData" :options="lineOptions" />
          </div>
        </AppCard>

        <AppCard :class="auth.isAdmin ? 'order-1 lg:order-2' : ''" title="Komposisi Hari Ini" :subtitle="isHariLibur ? 'Libur' : isBelumAbsen ? 'Belum diabsen' : `${counts.Hadir + totalTidakHadir} siswa tercatat`">
          <div class="relative" :class="auth.isAdmin ? 'h-[clamp(170px,24vh,220px)]' : 'h-[clamp(140px,22vh,170px)]'">
            <Doughnut v-if="!isHariLibur && !isBelumAbsen && totalSiswa > 0" :data="doughnutData" :options="doughnutOptions" />
            <div v-else class="flex h-full flex-col items-center justify-center gap-1.5 text-center">
              <CalendarDays v-if="isHariLibur" class="h-8 w-8 text-slate-200" aria-hidden="true" />
              <ClipboardCheck v-else class="h-8 w-8 text-slate-200" aria-hidden="true" />
              <p class="text-sm text-slate-400">{{ isHariLibur ? 'Hari ini libur' : isBelumAbsen ? 'Belum ada data presensi' : 'Belum ada data siswa' }}</p>
            </div>
          </div>

          <!-- Admin: ringkasan count per status (tanpa daftar nama siswa) -->
          <div v-if="auth.isAdmin && !isHariLibur && !isBelumAbsen && totalSiswa > 0" class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5">
            <div v-for="r in [['Hadir', counts.Hadir, 'bg-emerald-700'], ['Izin', counts.Izin, 'bg-sky-700'], ['Sakit', counts.Sakit, 'bg-amber-600'], ['Alfa', counts.Alfa, 'bg-rose-700']]" :key="r[0]" class="flex items-center gap-1.5 text-[12.5px]">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="r[2]" aria-hidden="true" />
              <span class="text-slate-500">{{ r[0] }}</span>
              <span class="ml-auto font-semibold text-slate-900 tnum">{{ r[1] }}</span>
            </div>
          </div>
          <!-- Guru: daftar tidak hadir existing (tidak diubah) -->
          <div v-else-if="!auth.isAdmin && !isHariLibur && !isBelumAbsen && totalAbsenNames > 0" class="mt-3 border-t border-slate-100 pt-2.5">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Tidak hadir ({{ totalAbsenNames }})
            </p>
            <div class="flex max-h-28 flex-col gap-2 overflow-y-auto pr-1">
              <template v-for="key in ['Izin', 'Sakit', 'Alfa']" :key="key">
                <div v-if="absentStudents[key].length > 0">
                  <AppBadge :label="`${key} (${absentStudents[key].length})`" :tone="key === 'Izin' ? 'info' : key === 'Sakit' ? 'warning' : 'danger'" dot />
                  <p class="mt-0.5 text-[12.5px] leading-snug text-slate-600">
                    <template v-for="(st, i) in absentStudents[key]" :key="st.nama + st.kelas">
                      {{ i > 0 ? ',' : '' }} {{ st.nama }}<span v-if="!kelasFilter" class="text-slate-400"> · {{ st.kelas }}</span>
                    </template>
                  </p>
                </div>
              </template>
            </div>
          </div>
        </AppCard>
      </div>
    </template>
  </div>
</template>
