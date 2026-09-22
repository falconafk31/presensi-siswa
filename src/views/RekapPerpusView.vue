<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { useSettingsStore } from '@/stores/settings'
import { exportPdfPerpus } from '@/lib/pdfPerpus'
import { exportPdfKunjungan } from '@/lib/pdfKunjungan'
import { exportExcelKunjungan, exportExcelSirkulasi } from '@/lib/excelExport'
import { namaBulan } from '@/lib/dates'
import { Trophy, BookOpen, UserCircle, Download, FileSpreadsheet, Users, Library, Medal } from 'lucide-vue-next'
import {
  AppPageHeader, AppCard, AppTabs, AppTable, AppStatCard,
  AppEmptyState, AppSkeleton, AppButton, AppPagination,
} from '@/components/ui'

const settingsStore = useSettingsStore()

const itemsPerPage = 20
const currentPageKunjungan = ref(1)
const currentPageBooks = ref(1)
const currentPageLoans = ref(1)

const loading = ref(false)
const activeTab = ref('kunjungan')

const topBooks = ref([])
const topStudentsLoans = ref([])
const totalDipinjamPeriodeIni = ref(0)
const totalSiswaPeminjam = ref(0)

const topStudentsVisits = ref([])
const totalKunjunganPeriodeIni = ref(0)
const totalSiswaUnikKunjungan = ref(0)

const filterMode = ref('monthly')
const now = new Date()
const selectedDate = ref(now.toISOString().slice(0, 10))
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const reportTabs = [
  { value: 'kunjungan', label: 'Laporan Kunjungan' },
  { value: 'sirkulasi', label: 'Laporan Sirkulasi' },
]
const filterModes = [
  { value: 'all', label: 'Sepanjang Waktu' },
  { value: 'yearly', label: 'Tahunan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'daily', label: 'Harian' },
]

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

watch([filterMode, selectedDate, selectedMonth, selectedYear], () => {
  currentPageKunjungan.value = 1
  currentPageBooks.value = 1
  currentPageLoans.value = 1
  fetchRekap()
})

async function handleDownloadPdfSirkulasi() {
  await exportPdfPerpus({
    topBooks: topBooks.value,
    topStudents: topStudentsLoans.value,
    totalDipinjamBulanIni: totalDipinjamPeriodeIni.value,
    totalSiswaPeminjam: totalSiswaPeminjam.value,
    periodeText: periodeText.value,
    settings: settingsStore.settings,
  })
}

async function handleDownloadPdfKunjungan() {
  await exportPdfKunjungan({
    topStudents: topStudentsVisits.value,
    totalKunjungan: totalKunjunganPeriodeIni.value,
    totalSiswaUnik: totalSiswaUnikKunjungan.value,
    periodeText: periodeText.value,
    settings: settingsStore.settings,
  })
}

async function handleDownloadExcelKunjungan() {
  await exportExcelKunjungan({ topStudents: topStudentsVisits.value, periodeText: periodeText.value })
}

async function handleDownloadExcelSirkulasi() {
  await exportExcelSirkulasi({ topBooks: topBooks.value, topStudents: topStudentsLoans.value, periodeText: periodeText.value })
}

onMounted(() => {
  fetchRekap()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader
      title="Laporan Perpustakaan"
      :subtitle="`Periode: ${periodeText}`"
    >
      <template #actions>
        <template v-if="activeTab === 'kunjungan'">
          <AppButton variant="secondary" size="sm" @click="handleDownloadExcelKunjungan">
            <template #icon><FileSpreadsheet class="h-4 w-4" aria-hidden="true" /></template>
            Excel
          </AppButton>
          <AppButton variant="library" size="sm" @click="handleDownloadPdfKunjungan">
            <template #icon><Download class="h-4 w-4" aria-hidden="true" /></template>
            PDF
          </AppButton>
        </template>
        <template v-else>
          <AppButton variant="secondary" size="sm" @click="handleDownloadExcelSirkulasi">
            <template #icon><FileSpreadsheet class="h-4 w-4" aria-hidden="true" /></template>
            Excel
          </AppButton>
          <AppButton variant="library" size="sm" @click="handleDownloadPdfSirkulasi">
            <template #icon><Download class="h-4 w-4" aria-hidden="true" /></template>
            PDF
          </AppButton>
        </template>
      </template>
    </AppPageHeader>

    <AppTabs v-model="activeTab" :options="reportTabs" ariaLabel="Jenis laporan" />

    <AppCard>
      <div class="flex flex-wrap items-center gap-2">
        <AppTabs v-model="filterMode" :options="filterModes" ariaLabel="Filter waktu" />
      </div>
      <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
        <template v-if="filterMode === 'monthly'">
          <select v-model.number="selectedMonth" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih bulan">
            <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
          </select>
          <select v-model.number="selectedYear" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih tahun">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </template>
        <select v-if="filterMode === 'yearly'" v-model.number="selectedYear" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih tahun">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
        <input v-if="filterMode === 'daily'" v-model="selectedDate" type="date" class="input-field !w-auto !py-1.5 !text-xs" aria-label="Pilih tanggal" />
      </div>
    </AppCard>

    <div v-if="loading">
      <AppSkeleton type="table" :rows="6" />
    </div>

    <template v-else>
      <!-- Kunjungan -->
      <template v-if="activeTab === 'kunjungan'">
        <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
          <AppStatCard label="Total Kunjungan" :value="totalKunjunganPeriodeIni" :icon="Users" tone="library" sub="kali kunjungan" />
          <AppStatCard label="Siswa Unik" :value="totalSiswaUnikKunjungan" :icon="UserCircle" tone="neutral" sub="anak berbeda" />
        </div>

        <AppCard title="Peringkat Pengunjung Teraktif" :subtitle="periodeText" :padded="false">
          <div v-if="!topStudentsVisits.length" class="p-4">
            <AppEmptyState title="Belum ada data kunjungan" description="Tidak ada kunjungan tercatat pada periode ini." :icon="Users" />
          </div>
          <AppTable v-else caption="Peringkat pengunjung perpustakaan">
            <thead>
              <tr>
                <th class="w-16 !text-center">Peringkat</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th class="!text-center">Frekuensi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in paginatedStudentsVisits" :key="s.nisn">
                <td class="!text-center">
                  <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" :class="(currentPageKunjungan - 1) * itemsPerPage + i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'">
                    {{ (currentPageKunjungan - 1) * itemsPerPage + i + 1 }}
                  </span>
                </td>
                <td class="cell-main">{{ s.nama }}</td>
                <td>{{ s.kelas }}</td>
                <td class="cell-num text-blue-700">{{ s.count }}×</td>
              </tr>
            </tbody>
            <template v-if="topStudentsVisits.length > itemsPerPage" #footer>
              <AppPagination v-model="currentPageKunjungan" :total-items="topStudentsVisits.length" :items-per-page="itemsPerPage" />
            </template>
          </AppTable>
        </AppCard>
      </template>

      <!-- Sirkulasi -->
      <template v-else>
        <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
          <AppStatCard label="Buku Dipinjam" :value="totalDipinjamPeriodeIni" :icon="BookOpen" tone="library" sub="eksemplar" />
          <AppStatCard label="Peminjam Aktif" :value="totalSiswaPeminjam" :icon="UserCircle" tone="neutral" sub="anak berbeda" />
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AppCard title="Buku Terfavorit" subtitle="Paling sering dipinjam">
            <template #actions><Trophy class="h-5 w-5 text-amber-500" aria-hidden="true" /></template>
            <AppEmptyState
              v-if="!topBooks.length"
              title="Belum ada data"
              description="Belum ada peminjaman buku pada periode ini."
              :icon="Library"
            />
            <ol v-else class="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              <li v-for="(b, i) in paginatedBooks" :key="b.id" class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-2.5">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="(currentPageBooks - 1) * itemsPerPage + i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'">
                    {{ (currentPageBooks - 1) * itemsPerPage + i + 1 }}
                  </span>
                  <p class="truncate text-sm font-medium text-slate-800">{{ b.judul }}</p>
                </div>
                <span class="shrink-0 text-[13px] font-semibold text-blue-700 tnum">{{ b.count }}×</span>
              </li>
            </ol>
            <template v-if="topBooks.length > itemsPerPage" #footer>
              <AppPagination v-model="currentPageBooks" :total-items="topBooks.length" :items-per-page="itemsPerPage" />
            </template>
          </AppCard>

          <AppCard title="Peminjam Teraktif" subtitle="Siswa paling sering meminjam">
            <template #actions><Medal class="h-5 w-5 text-blue-500" aria-hidden="true" /></template>
            <AppEmptyState
              v-if="!topStudentsLoans.length"
              title="Belum ada data"
              description="Belum ada siswa meminjam pada periode ini."
              :icon="UserCircle"
            />
            <ol v-else class="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              <li v-for="(s, i) in paginatedStudentsLoans" :key="s.nisn" class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-2.5">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="(currentPageLoans - 1) * itemsPerPage + i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'">
                    {{ (currentPageLoans - 1) * itemsPerPage + i + 1 }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-slate-800">{{ s.nama }}</p>
                    <p class="text-xs text-slate-400">Kelas {{ s.kelas || '?' }}</p>
                  </div>
                </div>
                <span class="shrink-0 text-[13px] font-semibold text-blue-700 tnum">{{ s.count }} buku</span>
              </li>
            </ol>
            <template v-if="topStudentsLoans.length > itemsPerPage" #footer>
              <AppPagination v-model="currentPageLoans" :total-items="topStudentsLoans.length" :items-per-page="itemsPerPage" />
            </template>
          </AppCard>
        </div>
      </template>
    </template>
  </div>
</template>
