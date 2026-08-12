<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { useSettingsStore } from '@/stores/settings'
import { exportPdfPerpus } from '@/lib/pdfPerpus'
import { exportPdfKunjungan } from '@/lib/pdfKunjungan'
import { exportExcelKunjungan, exportExcelSirkulasi } from '@/lib/excelExport'
import { namaBulan } from '@/lib/dates'
import { Trophy, BookOpen, UserCircle, Loader2, Download, Library, FileSpreadsheet, Users, Filter, Info } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import Pagination from '@/components/Pagination.vue'

const settingsStore = useSettingsStore()

const itemsPerPage = 20
const currentPageKunjungan = ref(1)
const currentPageBooks = ref(1)
const currentPageLoans = ref(1)

const loading = ref(false)
const activeTab = ref('kunjungan') // 'kunjungan' or 'sirkulasi'

// Data Sirkulasi
const topBooks = ref([])
const topStudentsLoans = ref([])
const totalDipinjamPeriodeIni = ref(0)
const totalSiswaPeminjam = ref(0)

// Data Kunjungan
const topStudentsVisits = ref([])
const totalKunjunganPeriodeIni = ref(0)
const totalSiswaUnikKunjungan = ref(0)

// Filter
const filterMode = ref('monthly') // 'all', 'monthly', 'daily', 'yearly'
const now = new Date()
const selectedDate = ref(now.toISOString().slice(0, 10))
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const periodeText = computed(() => {
  if (filterMode.value === 'monthly') return `Bulan ${namaBulan(selectedMonth.value)} ${selectedYear.value}`
  if (filterMode.value === 'daily') return `Tanggal ${new Date(selectedDate.value).toLocaleDateString('id-ID')}`
  if (filterMode.value === 'yearly') return `Tahun ${selectedYear.value}`
  return 'Keseluruhan'
})

async function fetchRekap() {
  loading.value = true
  try {
    let loansQuery = supabase.from('book_loans').select('tanggal_pinjam, book_id, student_nisn, books(judul), students(nama, kelas)')
    let visitsQuery = supabase.from('library_visits').select('tanggal, student_nisn, students(nama, kelas)')

    let start = null
    let end = null

    if (filterMode.value === 'monthly') {
      const monthStr = String(selectedMonth.value).padStart(2, '0')
      const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
      start = `${selectedYear.value}-${monthStr}-01`
      end = `${selectedYear.value}-${monthStr}-${String(lastDay).padStart(2, '0')}`
    } else if (filterMode.value === 'daily') {
      start = selectedDate.value
      end = selectedDate.value
    } else if (filterMode.value === 'yearly') {
      start = `${selectedYear.value}-01-01`
      end = `${selectedYear.value}-12-31`
    }

    if (start && end) {
      loansQuery = loansQuery.gte('tanggal_pinjam', start).lte('tanggal_pinjam', end)
      visitsQuery = visitsQuery.gte('tanggal', start).lte('tanggal', end)
    }

    const [loansRes, visitsRes] = await Promise.all([loansQuery, visitsQuery])
    
    if (loansRes.error) throw loansRes.error
    if (visitsRes.error) throw visitsRes.error

    const loans = loansRes.data || []
    const visits = visitsRes.data || []

    // --- AGREGASI SIRKULASI ---
    const bookCounts = {}
    const bookNames = {}
    const loanStudentCounts = {}
    const loanStudentData = {}

    for (const l of loans) {
      if (l.book_id) {
        bookCounts[l.book_id] = (bookCounts[l.book_id] || 0) + 1
        bookNames[l.book_id] = l.books?.judul || 'Buku Dihapus'
      }
      if (l.student_nisn) {
        loanStudentCounts[l.student_nisn] = (loanStudentCounts[l.student_nisn] || 0) + 1
        loanStudentData[l.student_nisn] = { nama: l.students?.nama, kelas: l.students?.kelas }
      }
    }

    topBooks.value = Object.entries(bookCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, judul: bookNames[id], count }))

    topStudentsLoans.value = Object.entries(loanStudentCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([nisn, count]) => ({ nisn, ...loanStudentData[nisn], count }))

    totalDipinjamPeriodeIni.value = loans.length
    totalSiswaPeminjam.value = Object.keys(loanStudentCounts).length

    // --- AGREGASI KUNJUNGAN ---
    const visitStudentCounts = {}
    const visitStudentData = {}

    for (const v of visits) {
      if (v.student_nisn) {
        visitStudentCounts[v.student_nisn] = (visitStudentCounts[v.student_nisn] || 0) + 1
        visitStudentData[v.student_nisn] = { nama: v.students?.nama, kelas: v.students?.kelas }
      }
    }

    topStudentsVisits.value = Object.entries(visitStudentCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([nisn, count]) => ({ nisn, ...visitStudentData[nisn], count }))

    totalKunjunganPeriodeIni.value = visits.length
    totalSiswaUnikKunjungan.value = Object.keys(visitStudentCounts).length

  } catch (e) {
    toast.error('Gagal memuat laporan perpus: ' + e.message)
  } finally {
    loading.value = false
  }
}

const paginatedStudentsVisits = computed(() => {
  const start = (currentPageKunjungan.value - 1) * itemsPerPage
  return topStudentsVisits.value.slice(start, start + itemsPerPage)
})

const paginatedBooks = computed(() => {
  const start = (currentPageBooks.value - 1) * itemsPerPage
  return topBooks.value.slice(start, start + itemsPerPage)
})

const paginatedStudentsLoans = computed(() => {
  const start = (currentPageLoans.value - 1) * itemsPerPage
  return topStudentsLoans.value.slice(start, start + itemsPerPage)
})

const helperText = computed(() => {
  const isKunjungan = activeTab.value === 'kunjungan'
  const prefix = isKunjungan 
    ? 'Menampilkan rekapitulasi data pengunjung (kedatangan fisik) ke perpustakaan'
    : 'Menampilkan rekapitulasi data peminjaman buku beserta daftar buku dan peminjam teraktif'
  
  if (filterMode.value === 'all') return `${prefix} untuk seluruh data dari awal hingga saat ini.`
  return `${prefix} pada periode: ${periodeText.value}.`
})

watch([filterMode, selectedDate, selectedMonth, selectedYear], () => {
  currentPageKunjungan.value = 1
  currentPageBooks.value = 1
  currentPageLoans.value = 1
  fetchRekap()
})

// Export Handlers
async function handleDownloadPdfSirkulasi() {
  await exportPdfPerpus({
    topBooks: topBooks.value,
    topStudents: topStudentsLoans.value,
    totalDipinjamBulanIni: totalDipinjamPeriodeIni.value,
    totalSiswaPeminjam: totalSiswaPeminjam.value,
    periodeText: periodeText.value,
    settings: settingsStore.settings
  })
}

async function handleDownloadPdfKunjungan() {
  await exportPdfKunjungan({
    topStudents: topStudentsVisits.value,
    totalKunjungan: totalKunjunganPeriodeIni.value,
    totalSiswaUnik: totalSiswaUnikKunjungan.value,
    periodeText: periodeText.value,
    settings: settingsStore.settings
  })
}

async function handleDownloadExcelKunjungan() {
  await exportExcelKunjungan({
    topStudents: topStudentsVisits.value,
    periodeText: periodeText.value
  })
}

async function handleDownloadExcelSirkulasi() {
  await exportExcelSirkulasi({
    topBooks: topBooks.value,
    topStudents: topStudentsLoans.value,
    periodeText: periodeText.value
  })
}

onMounted(() => {
  fetchRekap()
})
</script>

<template>
  <div>
    <PageHeader title="Laporan & Statistik" subtitle="Rekapitulasi komprehensif kunjungan dan sirkulasi bahan pustaka">
    </PageHeader>

    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Tab Kunjungan -->
      <button
        @click="activeTab = 'kunjungan'"
        class="flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200"
        :class="activeTab === 'kunjungan' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'"
      >
        <div class="rounded-xl p-3" :class="activeTab === 'kunjungan' ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-100 text-emerald-600'">
          <Users class="h-6 w-6" />
        </div>
        <div>
          <h3 class="font-bold" :class="activeTab === 'kunjungan' ? 'text-emerald-900' : 'text-gray-800'">Laporan Kunjungan</h3>
          <p class="mt-1 text-xs text-gray-500">Statistik kehadiran dan frekuensi kedatangan siswa ke perpustakaan.</p>
        </div>
      </button>

      <!-- Tab Sirkulasi -->
      <button
        @click="activeTab = 'sirkulasi'"
        class="flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200"
        :class="activeTab === 'sirkulasi' ? 'border-sky-500 bg-sky-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-sky-200 hover:bg-sky-50/30'"
      >
        <div class="rounded-xl p-3" :class="activeTab === 'sirkulasi' ? 'bg-sky-500 text-white shadow-md' : 'bg-sky-100 text-sky-600'">
          <Library class="h-6 w-6" />
        </div>
        <div>
          <h3 class="font-bold" :class="activeTab === 'sirkulasi' ? 'text-sky-900' : 'text-gray-800'">Laporan Sirkulasi Buku</h3>
          <p class="mt-1 text-xs text-gray-500">Statistik aktivitas peminjaman, buku terlaris, dan peminjam teraktif.</p>
        </div>
      </button>
    </div>

    <!-- Filter Controls & Helper Text -->
    <div class="mb-6 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
      <div class="flex flex-wrap items-center gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
        <div class="flex items-center gap-2">
          <Filter class="h-4 w-4 text-gray-500" />
          <label class="text-sm font-medium text-gray-700">Filter Waktu:</label>
          <select v-model="filterMode" class="input w-40 py-1.5 text-sm font-medium bg-white">
            <option value="all">Sepanjang Waktu</option>
            <option value="yearly">Tahunan</option>
            <option value="monthly">Bulanan</option>
            <option value="daily">Harian</option>
          </select>
        </div>

        <div v-if="filterMode === 'monthly'" class="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <select v-model="selectedMonth" class="input w-36 py-1.5 text-sm font-medium bg-white">
            <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
          </select>
          <select v-model="selectedYear" class="input w-28 py-1.5 text-sm font-medium bg-white">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div v-if="filterMode === 'yearly'" class="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <select v-model="selectedYear" class="input w-28 py-1.5 text-sm font-medium bg-white">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div v-if="filterMode === 'daily'" class="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <input type="date" v-model="selectedDate" class="input py-1.5 text-sm font-medium bg-white" />
        </div>
      </div>
      
      <!-- Helper Text (Dynamic Explanation) -->
      <div class="flex items-start gap-2.5 p-4 text-sm">
        <Info class="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p class="text-gray-600 leading-relaxed">{{ helperText }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-emerald-500" />
    </div>

    <div v-else>
      <!-- TAB KUNJUNGAN -->
      <div v-if="activeTab === 'kunjungan'" class="space-y-6">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex gap-4">
            <div class="card bg-emerald-50 border border-emerald-100 flex-1">
              <p class="text-sm font-medium text-emerald-700">Total Kunjungan</p>
              <p class="text-2xl font-bold text-emerald-900">{{ totalKunjunganPeriodeIni }} <span class="text-xs font-normal">Kali</span></p>
            </div>
            <div class="card bg-blue-50 border border-blue-100 flex-1">
              <p class="text-sm font-medium text-blue-700">Siswa Unik</p>
              <p class="text-2xl font-bold text-blue-900">{{ totalSiswaUnikKunjungan }} <span class="text-xs font-normal">Anak</span></p>
            </div>
          </div>
          
          <div class="flex gap-2">
            <button class="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" @click="handleDownloadExcelKunjungan">
              <FileSpreadsheet class="h-4 w-4" /> Export Excel
            </button>
            <button class="btn-primary flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white" @click="handleDownloadPdfKunjungan">
              <Download class="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>

        <div class="card">
          <div class="mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Library class="h-5 w-5 text-gray-500" />
            <h3 class="font-bold text-gray-800">Daftar Agregat Pengunjung</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600">
              <thead class="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th class="px-4 py-3">Peringkat</th>
                  <th class="px-4 py-3">Nama Siswa</th>
                  <th class="px-4 py-3">Kelas</th>
                  <th class="px-4 py-3">Frekuensi Kunjungan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(s, i) in paginatedStudentsVisits" :key="s.nisn" class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium">{{ (currentPageKunjungan - 1) * itemsPerPage + i + 1 }}</td>
                  <td class="px-4 py-3">{{ s.nama }}</td>
                  <td class="px-4 py-3">{{ s.kelas }}</td>
                  <td class="px-4 py-3 font-semibold text-emerald-600">{{ s.count }} Kali</td>
                </tr>
                <tr v-if="!topStudentsVisits.length">
                  <td colspan="4" class="px-4 py-8 text-center text-gray-500">Belum ada data kunjungan untuk periode ini.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination
            v-if="topStudentsVisits.length > 0"
            v-model="currentPageKunjungan"
            :total-items="topStudentsVisits.length"
            :items-per-page="itemsPerPage"
          />
        </div>
      </div>

      <!-- TAB SIRKULASI -->
      <div v-else class="space-y-6">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex gap-4">
            <div class="card bg-sky-50 border border-sky-100 flex-1">
              <p class="text-sm font-medium text-sky-700">Buku Dipinjam</p>
              <p class="text-2xl font-bold text-sky-900">{{ totalDipinjamPeriodeIni }} <span class="text-xs font-normal">Buku</span></p>
            </div>
            <div class="card bg-indigo-50 border border-indigo-100 flex-1">
              <p class="text-sm font-medium text-indigo-700">Peminjam Aktif</p>
              <p class="text-2xl font-bold text-indigo-900">{{ totalSiswaPeminjam }} <span class="text-xs font-normal">Anak</span></p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" @click="handleDownloadExcelSirkulasi">
              <FileSpreadsheet class="h-4 w-4" /> Export Excel
            </button>
            <button class="btn-primary flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white" @click="handleDownloadPdfSirkulasi">
              <Download class="h-4 w-4" /> Export PDF Laporan
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Buku Terlaris -->
          <div class="card space-y-4">
            <div class="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Trophy class="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 class="font-bold text-gray-800">Buku Terfavorit</h3>
              </div>
            </div>
            
            <ul class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              <li v-for="(b, i) in paginatedBooks" :key="b.id" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{{ (currentPageBooks - 1) * itemsPerPage + i + 1 }}</span>
                  <div class="font-medium text-gray-800">{{ b.judul }}</div>
                </div>
                <div class="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                  <BookOpen class="h-4 w-4" /> {{ b.count }}x
                </div>
              </li>
              <li v-if="!topBooks.length" class="text-center text-sm text-gray-500 py-4">Belum ada data peminjaman buku.</li>
            </ul>
            <Pagination
              v-if="topBooks.length > 0"
              v-model="currentPageBooks"
              :total-items="topBooks.length"
              :items-per-page="itemsPerPage"
            />
          </div>

          <!-- Siswa Peminjam Teraktif -->
          <div class="card space-y-4">
            <div class="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
                <UserCircle class="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h3 class="font-bold text-gray-800">Siswa Peminjam Aktif</h3>
              </div>
            </div>
            
            <ul class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              <li v-for="(s, i) in paginatedStudentsLoans" :key="s.nisn" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{{ (currentPageLoans - 1) * itemsPerPage + i + 1 }}</span>
                  <div>
                    <div class="font-medium text-gray-800">{{ s.nama }}</div>
                    <div class="text-xs text-gray-500">Kelas {{ s.kelas || '?' }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-1 text-sm font-semibold text-sky-600">
                  <BookOpen class="h-4 w-4" /> {{ s.count }} buku
                </div>
              </li>
              <li v-if="!topStudentsLoans.length" class="text-center text-sm text-gray-500 py-4">Belum ada data siswa meminjam.</li>
            </ul>
            <Pagination
              v-if="topStudentsLoans.length > 0"
              v-model="currentPageLoans"
              :total-items="topStudentsLoans.length"
              :items-per-page="itemsPerPage"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
