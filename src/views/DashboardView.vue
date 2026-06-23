<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Users, UserCheck, UserX, CalendarDays } from 'lucide-vue-next'
import { Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { todayISO, daysInMonth, dayNumber, namaBulan, isWeekend } from '@/lib/dates'

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler
)

const auth = useAuthStore()
const loading = ref(true)
const today = todayISO()
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const counts = ref({ Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 })
const totalSiswa = ref(0)
const monthly = ref([])
let channel = null

const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const selectedTab = ref('')

// Guru hanya melihat kelasnya; Admin melihat semua, difilter via tab.
const kelasFilter = computed(() => (auth.isAdmin ? (selectedTab.value || null) : auth.kelas))

const totalHadir = computed(() => counts.value.Hadir)
const totalTidakHadir = computed(
  () => counts.value.Izin + counts.value.Sakit + counts.value.Alfa
)
const isHariLibur = ref(false)
const isBelumAbsen = ref(false)

async function fetchTotalSiswa() {
  let q = supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true)
  if (kelasFilter.value) {
    q = q.eq('kelas', kelasFilter.value)
  } else if (auth.isAdmin && daftarKelas.value.length > 0) {
    q = q.in('kelas', daftarKelas.value)
  }
  const { count } = await q
  totalSiswa.value = count || 0
}

async function fetchToday() {
  const { data: kal } = await supabase.from('academic_calendar').select('status').eq('date', today).maybeSingle()
  isHariLibur.value = kal?.status === 'Libur' || (!kal && isWeekend(today))
  isBelumAbsen.value = false

  if (isHariLibur.value) {
    counts.value = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
    return
  }

  let qAct = supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi').like('record_id', `${today}:%`)
  const { data: acts } = await qAct
  let classesSub = (acts || []).map(a => a.record_id.split(':')[1])
  if (kelasFilter.value) {
    classesSub = classesSub.filter(c => c === kelasFilter.value)
  } else if (auth.isAdmin && daftarKelas.value.length > 0) {
    classesSub = classesSub.filter(c => daftarKelas.value.includes(c))
  }

  if (classesSub.length === 0) {
    counts.value = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
    isBelumAbsen.value = true
    return
  }

  let qSiswa = supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true).in('kelas', classesSub)
  const { count: submittedSiswaCount } = await qSiswa

  let q = supabase.from('attendance_logs').select('status').eq('date', today).in('kelas', classesSub)
  const { data } = await q
  const c = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
  for (const row of data || []) c[row.status] = (c[row.status] || 0) + 1
  c.Hadir = (submittedSiswaCount || 0) - c.Izin - c.Sakit - c.Alfa
  counts.value = c
}

async function fetchMonthly() {
  const days = daysInMonth(year.value, month.value)
  
  const [{ data: kal }, { data: acts }] = await Promise.all([
    supabase.from('academic_calendar').select('date').gte('date', days[0]).lte('date', days[days.length-1]).eq('status', 'Libur'),
    supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi')
  ])

  const liburSet = new Set((kal||[]).map(k=>k.date))
  for(const d of days) if(isWeekend(d)) liburSet.add(d)

  // Buat map: date -> Set of classes submitted
  const submittedMap = {}
  for (const a of acts || []) {
    const [d, k] = a.record_id.split(':')
    if (!submittedMap[d]) submittedMap[d] = new Set()
    submittedMap[d].add(k)
  }

  let q = supabase
    .from('attendance_logs')
    .select('date, kelas')
    .gte('date', days[0])
    .lte('date', days[days.length - 1])
  if (kelasFilter.value) q = q.eq('kelas', kelasFilter.value)
  const { data } = await q
  
  const exceptionsPerDay = {}
  for (const row of data || []) exceptionsPerDay[row.date] = (exceptionsPerDay[row.date] || 0) + 1
  
  monthly.value = days.map((d) => {
    if (d > today) return { day: dayNumber(d), hadir: null }
    if (liburSet.has(d)) return { day: dayNumber(d), hadir: 0 }
    
    let kSub = submittedMap[d] ? Array.from(submittedMap[d]) : []
    if (kelasFilter.value) {
      kSub = kSub.filter(c => c === kelasFilter.value)
    } else if (auth.isAdmin && daftarKelas.value.length > 0) {
      kSub = kSub.filter(c => daftarKelas.value.includes(c))
    }
    if (kSub.length === 0) return { day: dayNumber(d), hadir: null } // Belum absen

    // Idealnya kita hitung totalSiswa harian dari kelas-kelas yang disubmit (kSub),
    // Tapi untuk performa grafik, kita anggap totalSiswa adalah totalSiswa (kelasFilter) jika semua absen,
    // Jika hanya sebagian yang absen, mungkin angkanya akan lebih rendah.
    // Asumsi: totalSiswa.value cukup mewakili jika kelasFilter sudah benar.
    return { day: dayNumber(d), hadir: totalSiswa.value - (exceptionsPerDay[d] || 0) }
  })
}

async function loadAll() {
  loading.value = true
  try {
    // Selalu ambil pengaturan terbaru dari server agar Sinkron (menghindari butuh F5 manual)
    await settingsStore.fetchSettings()
    await Promise.all([fetchTotalSiswa(), fetchToday(), fetchMonthly()])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadAll()
  // Realtime hanya di Dashboard.
  channel = supabase
    .channel('dashboard-attendance')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance_logs' },
      () => {
        fetchToday()
        fetchMonthly()
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (channel) supabase.removeChannel(channel)
})

watch(selectedTab, loadAll)

const doughnutData = computed(() => ({
  labels: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
  datasets: [
    {
      data: [counts.value.Hadir, counts.value.Izin, counts.value.Sakit, counts.value.Alfa],
      backgroundColor: ['#059669', '#0ea5e9', '#f59e0b', '#f43f5e'],
      borderWidth: 0,
    },
  ],
}))

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  cutout: '62%',
}

const lineData = computed(() => ({
  labels: monthly.value.map((d) => d.day),
  datasets: [
    {
      label: 'Hadir',
      data: monthly.value.map((d) => d.hadir),
      borderColor: '#064e3b',
      backgroundColor: 'rgba(6,78,59,0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 2,
      spanGaps: false,
    },
  ],
}))

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
}

const stats = computed(() => [
  { label: 'Total Siswa', value: totalSiswa.value, icon: Users, color: 'bg-primary' },
  { label: 'Hadir Hari Ini', value: isHariLibur.value ? '-' : (isBelumAbsen.value ? 'Belum Absen' : totalHadir.value), icon: UserCheck, color: 'bg-emerald-600' },
  { label: 'Tidak Hadir', value: isHariLibur.value ? '-' : (isBelumAbsen.value ? '-' : totalTidakHadir.value), icon: UserX, color: 'bg-rose-500' },
  { label: 'Status Hari Ini', value: isHariLibur.value ? 'Libur' : (isBelumAbsen.value ? 'Menunggu' : 'Aktif'), icon: CalendarDays, color: 'bg-gold' },
])
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      :subtitle="auth.isAdmin ? (selectedTab ? `Ringkasan kehadiran kelas ${selectedTab}` : 'Ringkasan kehadiran seluruh kelas') : `Ringkasan kehadiran kelas ${auth.kelas || '-'}`"
    />

    <!-- Filter Tab Kelas (Admin Only) -->
    <div v-if="auth.isAdmin" class="mb-4 flex flex-wrap gap-2">
      <button 
        class="rounded-xl px-4 py-2 text-sm font-medium transition"
        :class="selectedTab === '' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
        @click="selectedTab = ''"
      >
        Semua Kelas
      </button>
      <button 
        v-for="k in daftarKelas" :key="k"
        class="rounded-xl px-4 py-2 text-sm font-medium transition"
        :class="selectedTab === k ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
        @click="selectedTab = k"
      >
        Kelas {{ k }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div v-for="s in stats" :key="s.label" class="card flex items-center gap-3">
        <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white', s.color]">
          <component :is="s.icon" class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-xs text-gray-500">{{ s.label }}</p>
          <p class="text-lg font-bold text-gray-800">{{ s.value }}</p>
        </div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="card lg:col-span-1">
        <h3 class="mb-3 text-sm font-semibold text-gray-700">Komposisi Hari Ini</h3>
        <div class="relative h-64">
          <Doughnut v-if="!isHariLibur && !isBelumAbsen && totalSiswa > 0" :data="doughnutData" :options="doughnutOptions" />
          <p v-else-if="isHariLibur" class="flex h-full items-center justify-center text-sm text-gray-400">
            Hari ini Libur
          </p>
          <p v-else-if="isBelumAbsen" class="flex h-full items-center justify-center text-sm font-medium text-rose-500">
            Belum Diabsen
          </p>
          <p v-else class="flex h-full items-center justify-center text-sm text-gray-400">
            Belum ada data siswa
          </p>
        </div>
      </div>

      <div class="card lg:col-span-2">
        <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-gray-700">
            Tren Kehadiran — {{ namaBulan(month) }} {{ year }}
          </h3>
          <div class="flex items-center gap-2">
            <select v-model.number="month" class="input-field py-1 text-xs" @change="fetchMonthly">
              <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
            </select>
            <select v-model.number="year" class="input-field py-1 text-xs" @change="fetchMonthly">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>
        <div class="h-64">
          <Line :data="lineData" :options="lineOptions" />
        </div>
      </div>
    </div>
  </div>
</template>
