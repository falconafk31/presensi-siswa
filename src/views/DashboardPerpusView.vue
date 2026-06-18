<script setup>
import { ref, onMounted, computed } from 'vue'
import { Book, BookOpen, AlertTriangle, CheckCircle2, Library } from 'lucide-vue-next'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'

ChartJS.register(ArcElement, Tooltip, Legend)

const loading = ref(true)

const totalBukuStok = ref(0)
const totalBukuJudul = ref(0)
const bukuDipinjam = ref(0)
const bukuTerlambat = ref(0)

const recentLoans = ref([])

async function fetchDashboardData() {
  loading.value = true
  try {
    // 1. Get total books (judul) and total stock
    const { data: books } = await supabase.from('books').select('stok')
    let sumStok = 0
    if (books) {
      totalBukuJudul.value = books.length
      books.forEach(b => sumStok += b.stok)
    }

    // 2. Get active loans
    const { data: loans } = await supabase
      .from('book_loans')
      .select('id, tanggal_kembali_seharusnya, status, books(judul), students(nama)')
      .eq('status', 'dipinjam')
      
    bukuDipinjam.value = loans ? loans.length : 0
    totalBukuStok.value = sumStok // Total keseluruhan fisik buku = stok aslinya
    
    // 3. Count overdue
    const todayStr = new Date().toISOString().split('T')[0]
    bukuTerlambat.value = (loans || []).filter(l => l.tanggal_kembali_seharusnya < todayStr).length

    // 4. Get recent loans
    const { data: recents } = await supabase
      .from('book_loans')
      .select('id, tanggal_pinjam, tanggal_kembali_seharusnya, status, books(judul), students(nama, kelas)')
      .order('tanggal_pinjam', { ascending: false })
      .limit(5)
    
    recentLoans.value = recents || []

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const chartData = computed(() => {
  const tersedia = totalBukuStok.value - bukuDipinjam.value
  const dipinjamAman = bukuDipinjam.value - bukuTerlambat.value
  
  return {
    labels: ['Tersedia di Rak', 'Dipinjam (Aman)', 'Terlambat Kembali'],
    datasets: [
      {
        data: [tersedia, dipinjamAman, bukuTerlambat.value],
        backgroundColor: ['#10b981', '#38bdf8', '#f43f5e'],
        borderWidth: 0,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%',
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
  },
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div>
    <PageHeader title="Dashboard Perpustakaan" subtitle="Ikhtisar sirkulasi dan koleksi buku sekolah" />

    <div v-if="loading" class="flex justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
    </div>

    <div v-else class="space-y-6">
      <!-- 4 Cards Stat -->
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
            <p class="text-2xl font-bold text-gray-800">{{ bukuDipinjam }} <span class="text-xs font-normal text-gray-500">Transaksi</span></p>
          </div>
        </div>

        <div class="card flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <AlertTriangle class="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Terlambat</p>
            <p class="text-2xl font-bold text-rose-600">{{ bukuTerlambat }} <span class="text-xs font-normal text-gray-500">Transaksi</span></p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Chart Sirkulasi -->
        <div class="card lg:col-span-1">
          <h3 class="mb-4 font-bold text-gray-800">Status Eksemplar Perpustakaan</h3>
          <div class="relative h-64">
            <Doughnut :data="chartData" :options="chartOptions" />
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-3xl font-bold text-gray-800">{{ totalBukuStok }}</span>
              <span class="text-xs text-gray-500">Total Buku</span>
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
            <li v-for="l in recentLoans" :key="l.id" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
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
