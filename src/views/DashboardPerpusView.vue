<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Book, BookOpen, AlertTriangle, CheckCircle2, Library, Users, CalendarDays, BarChart2, TrendingUp } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, Filler } from 'chart.js'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { namaBulan } from '@/lib/dates'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, Filler)

const loading = ref(true)

const totalBukuStok = ref(0)
const totalBukuJudul = ref(0)
const bukuDipinjam = ref(0)
const bukuTerlambat = ref(0)

const kunjunganHariIni = ref(0)
const kunjunganBulanIni = ref(0)
const kunjunganTahunIni = ref(0)

const recentLoans = ref([])

// Filter options
const now = new Date()
const filterMode = ref('monthly') // 'daily', 'monthly', 'yearly'
const selectedDate = ref(now.toISOString().slice(0, 10))
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

// Data for chart
const chartLabels = ref([])
const chartDataVisits = ref([])
const chartDataLoans = ref([])

async function fetchDashboardData() {
  loading.value = true
  try {
    // 1. Get global stats
    const { data: books } = await supabase.from('books').select('stok')
    let sumStok = 0
    if (books) {
      totalBukuJudul.value = books.length
      books.forEach(b => sumStok += b.stok)
    }

    const { data: allActiveLoans } = await supabase.from('book_loans').select('tanggal_kembali_seharusnya').eq('status', 'dipinjam')
    bukuDipinjam.value = allActiveLoans ? allActiveLoans.length : 0
    totalBukuStok.value = sumStok
    
    const todayStr = new Date().toISOString().split('T')[0]
    bukuTerlambat.value = (allActiveLoans || []).filter(l => l.tanggal_kembali_seharusnya < todayStr).length

    // Global visit stats
    const currentYearStr = todayStr.substring(0, 4)
    const currentMonthStr = todayStr.substring(0, 7)
    const { data: globalVisits } = await supabase.from('library_visits').select('tanggal').gte('tanggal', `${currentYearStr}-01-01`)
    if (globalVisits) {
      kunjunganTahunIni.value = globalVisits.length
      kunjunganBulanIni.value = globalVisits.filter(v => v.tanggal.startsWith(currentMonthStr)).length
      kunjunganHariIni.value = globalVisits.filter(v => v.tanggal === todayStr).length
    }

    const { data: recents } = await supabase
      .from('book_loans')
      .select('id, tanggal_pinjam, tanggal_kembali_seharusnya, status, books(judul), students(nama, kelas)')
      .order('tanggal_pinjam', { ascending: false })
      .limit(5)
    recentLoans.value = recents || []

    // 2. Build Chart Data based on filter
    let startQuery = ''
    let endQuery = ''
    let dateGrouper = (dateStr) => dateStr // Default grouping

    if (filterMode.value === 'daily') {
      startQuery = selectedDate.value
      endQuery = selectedDate.value
      // Generate hours 07:00 to 16:00
      chartLabels.value = Array.from({ length: 10 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)
      // Note: we can't easily group by hour without created_at, but we'll use created_at
      dateGrouper = (isoStr) => {
        const hour = new Date(isoStr).getHours()
        return `${String(hour).padStart(2, '0')}:00`
      }
    } else if (filterMode.value === 'monthly') {
      const mStr = String(selectedMonth.value).padStart(2, '0')
      const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
      startQuery = `${selectedYear.value}-${mStr}-01`
      endQuery = `${selectedYear.value}-${mStr}-${String(lastDay).padStart(2, '0')}`
      
      chartLabels.value = Array.from({ length: lastDay }, (_, i) => `${i + 1} ${namaBulan(selectedMonth.value).substring(0,3)}`)
      dateGrouper = (dateStr) => {
        const d = new Date(dateStr)
        return `${d.getDate()} ${namaBulan(selectedMonth.value).substring(0,3)}`
      }
    } else {
      // Yearly
      startQuery = `${selectedYear.value}-01-01`
      endQuery = `${selectedYear.value}-12-31`
      chartLabels.value = monthOptions.map(m => namaBulan(m))
      dateGrouper = (dateStr) => namaBulan(new Date(dateStr).getMonth() + 1)
    }

    // Fetch visits for chart
    let visitsQuery = supabase.from('library_visits').select('tanggal, created_at').gte('tanggal', startQuery).lte('tanggal', endQuery)
    const { data: chartV } = await visitsQuery
    
    // Fetch loans for chart
    let loansQuery = supabase.from('book_loans').select('tanggal_pinjam, created_at').gte('tanggal_pinjam', startQuery).lte('tanggal_pinjam', endQuery)
    const { data: chartL } = await loansQuery

    // Aggregate
    const visitCounts = {}
    const loanCounts = {}
    chartLabels.value.forEach(l => { visitCounts[l] = 0; loanCounts[l] = 0 })

    if (chartV) {
      chartV.forEach(v => {
        const key = filterMode.value === 'daily' ? dateGrouper(v.created_at) : dateGrouper(v.tanggal)
        if (visitCounts[key] !== undefined) visitCounts[key]++
      })
    }
    
    if (chartL) {
      chartL.forEach(l => {
        const key = filterMode.value === 'daily' ? dateGrouper(l.created_at) : dateGrouper(l.tanggal_pinjam)
        if (loanCounts[key] !== undefined) loanCounts[key]++
      })
    }

    chartDataVisits.value = chartLabels.value.map(l => visitCounts[l])
    chartDataLoans.value = chartLabels.value.map(l => loanCounts[l])

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch([filterMode, selectedDate, selectedMonth, selectedYear], () => {
  fetchDashboardData()
})

const mixedChartData = computed(() => {
  return {
    labels: chartLabels.value,
    datasets: [
      {
        type: 'line',
        label: 'Kunjungan Siswa',
        data: chartDataVisits.value,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: 'Peminjaman Buku',
        data: chartDataLoans.value,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        yAxisID: 'y1'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#1f2937',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 10,
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      title: { display: true, text: 'Jumlah Kunjungan' },
      beginAtZero: true,
      ticks: { precision: 0 }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      title: { display: true, text: 'Jumlah Buku Dipinjam' },
      beginAtZero: true,
      ticks: { precision: 0 },
      grid: { drawOnChartArea: false }
    }
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div>
    <PageHeader title="Dashboard Perpustakaan" subtitle="Ikhtisar korelasi sirkulasi buku dan kunjungan siswa" />

    <div v-if="loading && !chartLabels.length" class="flex justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>

    <div v-else class="space-y-6">
      
      <!-- Filter Section -->
      <div class="card flex flex-wrap items-center gap-4 bg-white/50 backdrop-blur-sm border-emerald-100/50">
        <div class="flex items-center gap-2">
          <TrendingUp class="h-5 w-5 text-emerald-600" />
          <span class="text-sm font-semibold text-gray-700">Analisis Tren:</span>
        </div>
        
        <select v-model="filterMode" class="input w-36 py-1.5 text-sm border-gray-200">
          <option value="daily">Harian</option>
          <option value="monthly">Bulanan</option>
          <option value="yearly">Tahunan</option>
        </select>

        <div v-if="filterMode === 'daily'" class="flex items-center gap-2">
          <input type="date" v-model="selectedDate" class="input py-1.5 text-sm border-gray-200" />
        </div>

        <div v-if="filterMode === 'monthly'" class="flex items-center gap-2">
          <select v-model="selectedMonth" class="input w-32 py-1.5 text-sm border-gray-200">
            <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
          </select>
          <select v-model="selectedYear" class="input w-24 py-1.5 text-sm border-gray-200">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div v-if="filterMode === 'yearly'" class="flex items-center gap-2">
          <select v-model="selectedYear" class="input w-24 py-1.5 text-sm border-gray-200">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>

      <!-- Main Chart Correlation -->
      <div class="card shadow-lg shadow-emerald-500/5 border-none">
        <div class="mb-4">
          <h3 class="font-bold text-gray-800">Korelasi Kunjungan & Peminjaman</h3>
          <p class="text-xs text-gray-500">Perbandingan antusiasme kehadiran siswa dengan sirkulasi peminjaman buku.</p>
        </div>
        
        <div class="relative h-80 w-full">
          <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          </div>
          <Line :data="mixedChartData" :options="chartOptions" />
        </div>
      </div>

      <!-- 4 Cards Stat (Buku) -->
      <h3 class="font-bold text-gray-800 -mb-2 mt-4">Status Koleksi Fisik</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="card flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <Library class="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Total Eksemplar</p>
            <p class="text-2xl font-bold text-gray-800">{{ totalBukuStok }} <span class="text-xs font-normal text-gray-500">Buku</span></p>
          </div>
        </div>

        <div class="card flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100">
            <Book class="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Koleksi Judul</p>
            <p class="text-2xl font-bold text-gray-800">{{ totalBukuJudul }} <span class="text-xs font-normal text-gray-500">Judul</span></p>
          </div>
        </div>

        <div class="card flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100">
            <BookOpen class="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Sedang Dipinjam</p>
            <p class="text-2xl font-bold text-gray-800">{{ bukuDipinjam }} <span class="text-xs font-normal text-gray-500">Buku</span></p>
          </div>
        </div>

        <div class="card flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <AlertTriangle class="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Terlambat</p>
            <p class="text-2xl font-bold text-rose-600">{{ bukuTerlambat }} <span class="text-xs font-normal text-gray-500">Buku</span></p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- 3 Cards Kunjungan -->
        <div class="lg:col-span-1 space-y-4">
          <h3 class="font-bold text-gray-800">Statistik Kunjungan (Tahun Ini)</h3>
          
          <div class="card flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-white">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80">
              <Users class="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Hari Ini</p>
              <p class="text-2xl font-bold text-gray-800">{{ kunjunganHariIni }} <span class="text-xs font-normal text-gray-500">Orang</span></p>
            </div>
          </div>
          
          <div class="card flex items-center gap-4 bg-gradient-to-r from-blue-50 to-white">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100/80">
              <CalendarDays class="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Bulan Ini</p>
              <p class="text-2xl font-bold text-gray-800">{{ kunjunganBulanIni }} <span class="text-xs font-normal text-gray-500">Orang</span></p>
            </div>
          </div>

          <div class="card flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-white">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100/80">
              <BarChart2 class="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Tahun Ini</p>
              <p class="text-2xl font-bold text-gray-800">{{ kunjunganTahunIni }} <span class="text-xs font-normal text-gray-500">Orang</span></p>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card lg:col-span-2">
          <div class="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 class="font-bold text-gray-800">5 Peminjaman Terakhir</h3>
            <RouterLink :to="{ name: 'peminjaman' }" class="text-xs font-medium text-emerald-600 hover:text-emerald-700">Lihat Semua</RouterLink>
          </div>
          
          <ul class="space-y-3">
            <li v-for="l in recentLoans" :key="l.id" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <BookOpen class="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <div class="font-semibold text-gray-800">{{ l.students?.nama }} <span class="text-xs font-normal text-gray-500">(Kelas {{ l.students?.kelas }})</span></div>
                  <div class="text-sm text-gray-600">{{ l.books?.judul }}</div>
                </div>
              </div>
              <div class="text-right">
                <div v-if="l.status === 'dikembalikan'" class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 class="h-3 w-3" /> Selesai
                </div>
                <div v-else-if="l.tanggal_kembali_seharusnya < new Date().toISOString().split('T')[0]" class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  <AlertTriangle class="h-3 w-3" /> Terlambat
                </div>
                <div v-else class="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                  Aktif
                </div>
                <div class="mt-1 text-xs text-gray-400">{{ l.tanggal_pinjam }}</div>
              </div>
            </li>
            <li v-if="!recentLoans.length" class="text-center text-sm text-gray-500 py-4">Belum ada transaksi perpustakaan.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
