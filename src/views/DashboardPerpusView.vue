<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Book, BookOpen, TriangleAlert, Library, Users, CalendarDays, BarChart2, ArrowRight, UsersRound, FileSpreadsheet } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, Filler } from 'chart.js'
import { supabase } from '@/lib/supabase'
import { namaBulan } from '@/lib/dates'
import { CHART_COLORS } from '@/config/designSystem'
import {
  AppPageHeader, AppStatCard, AppCard, AppTabs, AppSkeleton,
  AppBadge, AppButton, AppEmptyState,
} from '@/components/ui'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, Filler)
ChartJS.defaults.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif'
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#64748b'

const loading = ref(true)

const totalBukuStok = ref(0)
const totalBukuJudul = ref(0)
const bukuDipinjam = ref(0)
const bukuTerlambat = ref(0)

const kunjunganHariIni = ref(0)
const kunjunganBulanIni = ref(0)
const kunjunganTahunIni = ref(0)

const recentLoans = ref([])

const now = new Date()
const filterMode = ref('monthly')
const selectedDate = ref(now.toISOString().slice(0, 10))
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
const filterModes = [
  { value: 'daily', label: 'Harian' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

const chartLabels = ref([])
const chartDataVisits = ref([])
const chartDataLoans = ref([])

const todayStr = new Date().toISOString().split('T')[0]

const overviewStats = computed(() => [
  { label: 'Total Judul', value: totalBukuJudul.value, icon: Book, tone: 'library', sub: 'koleksi' },
  { label: 'Total Eksemplar', value: totalBukuStok.value, icon: Library, tone: 'neutral', sub: 'buku fisik' },
  { label: 'Sedang Dipinjam', value: bukuDipinjam.value, icon: BookOpen, tone: 'info', sub: 'aktif' },
  { label: 'Terlambat', value: bukuTerlambat.value, icon: TriangleAlert, tone: 'danger', sub: 'perlu ditagih' },
])

const quickActions = [
  { label: 'Sirkulasi', desc: 'Pinjam & kembali', icon: BookOpen, to: { name: 'peminjaman' } },
  { label: 'Data Koleksi', desc: 'Kelola buku', icon: Book, to: { name: 'buku' } },
  { label: 'Pengunjung', desc: 'Catat kunjungan', icon: UsersRound, to: { name: 'kunjungan-perpus' } },
  { label: 'Laporan', desc: 'Statistik & cetak', icon: FileSpreadsheet, to: { name: 'rekap-perpus' } },
]

function loanTone(l) {
  if (l.status === 'dikembalikan') return 'success'
  if (l.tanggal_kembali_seharusnya < todayStr) return 'danger'
  return 'info'
}
function loanLabel(l) {
  if (l.status === 'dikembalikan') return 'Selesai'
  if (l.tanggal_kembali_seharusnya < todayStr) return 'Terlambat'
  return 'Dipinjam'
}

let dashRun = 0 // token anti-balapan: hanya fetch terakhir yang commit

async function fetchDashboardData() {
  // Tangkap mode & filter di awal panggilan. Fetch dapat tumpang-tindih saat
  // pengguna berpindah mode/tanggal cepat; pembacaan ulang ref setelah await
  // akan mencampur label satu mode dengan grouping mode lain (chart salah).
  const mode = filterMode.value
  const selDate = selectedDate.value || todayStr // input tanggal yang dikosongkan → fallback hari ini
  const selMonth = selectedMonth.value
  const selYear = selectedYear.value
  const run = ++dashRun

  loading.value = true
  try {
    const { data: books } = await supabase.from('books').select('stok')
    let sumStok = 0
    if (books) {
      totalBukuJudul.value = books.length
      books.forEach((b) => { sumStok += b.stok })
    }

    const { data: allActiveLoans } = await supabase.from('book_loans').select('tanggal_kembali_seharusnya').eq('status', 'dipinjam')
    bukuDipinjam.value = allActiveLoans ? allActiveLoans.length : 0
    totalBukuStok.value = sumStok

    bukuTerlambat.value = (allActiveLoans || []).filter((l) => l.tanggal_kembali_seharusnya < todayStr).length

    const currentYearStr = todayStr.substring(0, 4)
    const currentMonthStr = todayStr.substring(0, 7)
    const currentMonth = Number(todayStr.substring(5, 7))
    // Hari terakhir bulan berjalan — jangan hardcode -31 (bukan tanggal nyata
    // untuk bulan < 31 hari; Postgres menolaknya → HTTP 400 setiap fetch).
    const lastDayOfMonth = new Date(Number(currentYearStr), currentMonth, 0).getDate()
    const currentMonthEnd = `${currentMonthStr}-${String(lastDayOfMonth).padStart(2, '0')}`

    const [{ count: cTahun }, { count: cBulan }, { count: cHari }] = await Promise.all([
      supabase.from('library_visits').select('*', { count: 'exact', head: true }).gte('tanggal', `${currentYearStr}-01-01`),
      supabase.from('library_visits').select('*', { count: 'exact', head: true }).gte('tanggal', `${currentMonthStr}-01`).lte('tanggal', currentMonthEnd),
      supabase.from('library_visits').select('*', { count: 'exact', head: true }).eq('tanggal', todayStr),
    ])

    kunjunganTahunIni.value = cTahun || 0
    kunjunganBulanIni.value = cBulan || 0
    kunjunganHariIni.value = cHari || 0

    const { data: recents } = await supabase
      .from('book_loans')
      .select('id, tanggal_pinjam, tanggal_kembali_seharusnya, status, books(judul), students(nama, kelas)')
      .order('tanggal_pinjam', { ascending: false })
      .limit(5)
    recentLoans.value = recents || []

    let startQuery = ''
    let endQuery = ''
    let dateGrouper = (dateStr) => dateStr

    if (mode === 'daily') {
      startQuery = selDate
      endQuery = selDate
      chartLabels.value = Array.from({ length: 10 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)
      dateGrouper = (isoStr) => {
        const hour = new Date(isoStr).getHours()
        return `${String(hour).padStart(2, '0')}:00`
      }
    } else if (mode === 'monthly') {
      const mStr = String(selMonth).padStart(2, '0')
      const lastDay = new Date(selYear, selMonth, 0).getDate()
      startQuery = `${selYear}-${mStr}-01`
      endQuery = `${selYear}-${mStr}-${String(lastDay).padStart(2, '0')}`

      chartLabels.value = Array.from({ length: lastDay }, (_, i) => `${i + 1} ${namaBulan(selMonth).substring(0, 3)}`)
      dateGrouper = (dateStr) => {
        const d = new Date(dateStr)
        return `${d.getDate()} ${namaBulan(selMonth).substring(0, 3)}`
      }
    } else {
      startQuery = `${selYear}-01-01`
      endQuery = `${selYear}-12-31`
      chartLabels.value = monthOptions.map((m) => namaBulan(m))
      dateGrouper = (dateStr) => namaBulan(new Date(dateStr).getMonth() + 1)
    }

    const visitsQuery = supabase.from('library_visits').select('tanggal, created_at').gte('tanggal', startQuery).lte('tanggal', endQuery)
    const { data: chartV } = await visitsQuery

    const loansQuery = supabase.from('book_loans').select('tanggal_pinjam, created_at').gte('tanggal_pinjam', startQuery).lte('tanggal_pinjam', endQuery)
    const { data: chartL } = await loansQuery

    // Abaikan respons basi: hanya panggilan terbaru yang boleh menulis hasil.
    if (run !== dashRun) return

    const visitCounts = {}
    const loanCounts = {}
    chartLabels.value.forEach((l) => { visitCounts[l] = 0; loanCounts[l] = 0 })

    if (chartV) {
      chartV.forEach((v) => {
        const key = mode === 'daily' ? dateGrouper(v.created_at) : dateGrouper(v.tanggal)
        if (visitCounts[key] !== undefined) visitCounts[key]++
      })
    }

    if (chartL) {
      chartL.forEach((l) => {
        const key = mode === 'daily' ? dateGrouper(l.created_at) : dateGrouper(l.tanggal_pinjam)
        if (loanCounts[key] !== undefined) loanCounts[key]++
      })
    }

    chartDataVisits.value = chartLabels.value.map((l) => visitCounts[l])
    chartDataLoans.value = chartLabels.value.map((l) => loanCounts[l])
  } catch (e) {
    console.error(e)
  } finally {
    if (run === dashRun) loading.value = false
  }
}

watch([filterMode, selectedDate, selectedMonth, selectedYear], () => {
  fetchDashboardData()
})

const mixedChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      type: 'line',
      label: 'Kunjungan',
      data: chartDataVisits.value,
      borderColor: CHART_COLORS.libraryLine,
      backgroundColor: CHART_COLORS.libraryFill,
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: 2,
      yAxisID: 'y',
    },
    {
      type: 'bar',
      label: 'Peminjaman',
      data: chartDataLoans.value,
      backgroundColor: '#10b981',
      borderRadius: 4,
      yAxisID: 'y1',
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 5, useBorderRadius: true, padding: 14 } },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      type: 'linear', display: true, position: 'left',
      title: { display: true, text: 'Kunjungan' },
      beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' },
    },
    y1: {
      type: 'linear', display: true, position: 'right',
      title: { display: true, text: 'Peminjaman' },
      beginAtZero: true, ticks: { precision: 0 }, grid: { drawOnChartArea: false },
    },
  },
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader
      title="Beranda Perpustakaan"
      subtitle="Sirkulasi koleksi dan kunjungan pengunjung"
    >
      <template #actions>
        <AppButton variant="library" :to="{ name: 'peminjaman' }">
          <template #icon><BookOpen class="h-4 w-4" aria-hidden="true" /></template>
          Sirkulasi
        </AppButton>
      </template>
    </AppPageHeader>

    <AppSkeleton v-if="loading && !chartLabels.length" type="stat" />
    <AppSkeleton v-if="loading && !chartLabels.length" type="line" />

    <template v-else>
      <!-- Library overview -->
      <section aria-label="Ringkasan perpustakaan">
        <div class="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <AppStatCard
            v-for="s in overviewStats"
            :key="s.label"
            :label="s.label"
            :value="s.value"
            :icon="s.icon"
            :tone="s.tone"
            :sub="s.sub"
          />
        </div>
      </section>

      <!-- Quick actions -->
      <section aria-label="Aksi cepat perpustakaan">
        <div class="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
          <RouterLink
            v-for="a in quickActions"
            :key="a.label"
            :to="a.to"
            class="card-flat card-interactive group flex items-center gap-2.5 p-2.5"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 transition-colors group-hover:bg-blue-700 group-hover:text-white">
              <component :is="a.icon" class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13.5px] font-semibold text-slate-800">{{ a.label }}</p>
              <p class="truncate text-xs text-slate-400">{{ a.desc }}</p>
            </div>
            <ArrowRight class="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" />
          </RouterLink>
        </div>
      </section>

      <!-- Trend -->
      <AppCard title="Tren Kunjungan & Peminjaman" subtitle="Perbandingan antusiasme kunjungan dengan sirkulasi buku">
        <template #actions>
          <!-- Mode + filter tanggal/bulan/tahun digabung di header kartu (hemat satu baris) -->
          <div class="flex flex-wrap items-center justify-end gap-1.5">
            <AppTabs v-model="filterMode" :options="filterModes" ariaLabel="Mode tren" />
            <input v-if="filterMode === 'daily'" id="library-trend-date" v-model="selectedDate" type="date" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih tanggal" />
            <template v-if="filterMode === 'monthly'">
              <select id="library-trend-month" v-model.number="selectedMonth" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih bulan">
                <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
              </select>
              <select id="library-trend-year" v-model.number="selectedYear" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih tahun">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>
            </template>
            <select v-if="filterMode === 'yearly'" id="library-trend-annual-year" v-model.number="selectedYear" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih tahun">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </template>
        <div class="relative h-[clamp(130px,17vh,240px)]" role="img" aria-label="Grafik tren kunjungan dan peminjaman">
          <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60">
            <div class="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" role="status" aria-label="Memuat grafik" />
          </div>
          <Line :data="mixedChartData" :options="chartOptions" />
        </div>
      </AppCard>

      <div class="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <!-- Visit stats -->
        <AppCard title="Kunjungan" subtitle="Akumulasi pengunjung">
          <!-- Chip satu baris: ringkas tanpa mengurangi informasi -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <Users class="h-4 w-4" aria-hidden="true" />
              </div>
              <p class="min-w-0 truncate text-[13px] text-slate-500">
                <span class="stat-number !text-base">{{ kunjunganHariIni }}</span> orang · Hari ini
              </p>
            </div>
            <div class="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-200/70 text-slate-600">
                <CalendarDays class="h-4 w-4" aria-hidden="true" />
              </div>
              <p class="min-w-0 truncate text-[13px] text-slate-500">
                <span class="stat-number !text-base">{{ kunjunganBulanIni }}</span> orang · Bulan ini
              </p>
            </div>
            <div class="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-200/70 text-slate-600">
                <BarChart2 class="h-4 w-4" aria-hidden="true" />
              </div>
              <p class="min-w-0 truncate text-[13px] text-slate-500">
                <span class="stat-number !text-base">{{ kunjunganTahunIni }}</span> orang · Tahun ini
              </p>
            </div>
          </div>
        </AppCard>

        <!-- Recent loans -->
        <AppCard title="Peminjaman Terakhir" subtitle="5 transaksi terbaru" class="lg:col-span-2">
          <template #actions>
            <RouterLink :to="{ name: 'peminjaman' }" class="link text-[13px]">Lihat semua</RouterLink>
          </template>
          <AppEmptyState
            v-if="!recentLoans.length"
            title="Belum ada transaksi"
            description="Transaksi peminjaman akan muncul di sini."
            :icon="BookOpen"
          />
          <ul v-else class="flex max-h-[clamp(108px,14vh,240px)] flex-col gap-1.5 overflow-y-auto pr-1">
            <li
              v-for="l in recentLoans"
              :key="l.id"
              class="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-slate-100 p-2 transition-colors hover:bg-slate-50/70"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <BookOpen class="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-800">
                    {{ l.students?.nama }} <span class="text-xs font-normal text-slate-400">(Kelas {{ l.students?.kelas }})</span>
                  </p>
                  <p class="truncate text-[13px] text-slate-500">{{ l.books?.judul }}</p>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <AppBadge :label="loanLabel(l)" :tone="loanTone(l)" dot />
                <p class="mt-1 text-xs text-slate-400 tnum">{{ l.tanggal_pinjam }}</p>
              </div>
            </li>
          </ul>
        </AppCard>
      </div>
    </template>
  </div>
</template>
