<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { useSettingsStore } from '@/stores/settings'
import { exportPdfPerpus } from '@/lib/pdfPerpus'
import { exportPdfKunjungan } from '@/lib/pdfKunjungan'
import { exportExcelKunjungan } from '@/lib/excelExport'
import { namaBulan } from '@/lib/dates'
import { Trophy, BookOpen, UserCircle, Loader2, Download, Library, FileSpreadsheet } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'

const settingsStore = useSettingsStore()

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
      .slice(0, 50) // Ambil top 50

    topStudentsLoans.value = Object.entries(loanStudentCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([nisn, count]) => ({ nisn, ...loanStudentData[nisn], count }))
      .slice(0, 50)

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

watch([filterMode, selectedDate, selectedMonth, selectedYear], () => {
  fetchRekap()
})

// Export Handlers
function handleDownloadPdfSirkulasi() {
  exportPdfPerpus({
    topBooks: topBooks.value.slice(0, 10), // Hanya top 10 untuk PDF
    topStudents: topStudentsLoans.value.slice(0, 10),
    totalDipinjamBulanIni: totalDipinjamPeriodeIni.value,
    totalSiswaPeminjam: totalSiswaPeminjam.value,
    periodeText: periodeText.value,
    settings: settingsStore.settings
  })
}

function handleDownloadPdfKunjungan() {
  exportPdfKunjungan({
    topStudents: topStudentsVisits.value, // Semua siswa dikirim
    totalKunjungan: totalKunjunganPeriodeIni.value,
    totalSiswaUnik: totalSiswaUnikKunjungan.value,
    periodeText: periodeText.value,
    settings: settingsStore.settings
  })
}

function handleDownloadExcelKunjungan() {
  exportExcelKunjungan({
    topStudents: topStudentsVisits.value,
    periodeText: periodeText.value
  })
}

onMounted(() => {
  fetchRekap()
})
</script>

<template>
  <div>
    <PageHeader title="Laporan Perpustakaan" subtitle="Rekapitulasi komprehensif kunjungan dan sirkulasi peminjaman">
    </PageHeader>

    <div class="mb-6 flex space-x-1 rounded-xl bg-gray-100 p-1">
      <button
        @click="activeTab = 'kunjungan'"
        class="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors"
        :class="activeTab === 'kunjungan' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        Laporan Kunjungan
      </button>
      <button
        @click="activeTab = 'sirkulasi'"
        class="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors"
        :class="activeTab === 'sirkulasi' ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        Laporan Sirkulasi Buku
      </button>
    </div>

    <!-- Filter Controls -->
    <div class="card mb-6 flex flex-wrap items-center gap-4 bg-white/60 backdrop-blur-sm">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700">Filter:</label>
        <select v-model="filterMode" class="input w-36 py-1.5 text-sm">
          <option value="all">Sepanjang Waktu</option>
          <option value="yearly">Tahunan</option>
          <option value="monthly">Bulanan</option>
          <option value="daily">Harian</option>
        </select>
      </div>

      <div v-if="filterMode === 'monthly'" class="flex items-center gap-2">
        <select v-model="selectedMonth" class="input w-32 py-1.5 text-sm">
          <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
        </select>
        <select v-model="selectedYear" class="input w-24 py-1.5 text-sm">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div v-if="filterMode === 'yearly'" class="flex items-center gap-2">
        <select v-model="selectedYear" class="input w-24 py-1.5 text-sm">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div v-if="filterMode === 'daily'" class="flex items-center gap-2">
        <input type="date" v-model="selectedDate" class="input py-1.5 text-sm" />
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
                <tr v-for="(s, i) in topStudentsVisits" :key="s.nisn" class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium">{{ i + 1 }}</td>
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
          
          <button class="btn-primary flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white" @click="handleDownloadPdfSirkulasi">
            <Download class="h-4 w-4" /> Export PDF Laporan
          </button>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Buku Terlaris -->
          <div class="card space-y-4">
            <div class="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Trophy class="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 class="font-bold text-gray-800">Top 50 Buku Terfavorit</h3>
              </div>
            </div>
            
            <ul class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              <li v-for="(b, i) in topBooks" :key="b.id" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{{ i + 1 }}</span>
                  <div class="font-medium text-gray-800">{{ b.judul }}</div>
                </div>
                <div class="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                  <BookOpen class="h-4 w-4" /> {{ b.count }}x
                </div>
              </li>
              <li v-if="!topBooks.length" class="text-center text-sm text-gray-500 py-4">Belum ada data peminjaman buku.</li>
            </ul>
          </div>

          <!-- Siswa Peminjam Teraktif -->
          <div class="card space-y-4">
            <div class="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
                <UserCircle class="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h3 class="font-bold text-gray-800">Top 50 Peminjam Aktif</h3>
              </div>
            </div>
            
            <ul class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              <li v-for="(s, i) in topStudentsLoans" :key="s.nisn" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                <div class="flex items-center gap-3">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{{ i + 1 }}</span>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
