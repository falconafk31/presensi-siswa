<script setup>
import { ref, onMounted, computed } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { useSettingsStore } from '@/stores/settings'
import { exportPdfPerpus } from '@/lib/pdfPerpus'
import { namaBulan } from '@/lib/dates'
import { Trophy, BookOpen, UserCircle, Loader2, Download } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'

const settingsStore = useSettingsStore()

const loading = ref(false)
const topBooks = ref([])
const topStudents = ref([])

const filterMode = ref('all') // 'all', 'monthly', 'daily'
const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())
const selectedDate = ref(now.toISOString().slice(0, 10))

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const totalDipinjamBulanIni = ref(0)
const totalSiswaPeminjam = ref(0)

const periodeText = computed(() => {
  if (filterMode.value === 'monthly') return `Bulan ${namaBulan(selectedMonth.value)} ${selectedYear.value}`
  if (filterMode.value === 'daily') return `Tanggal ${new Date(selectedDate.value).toLocaleDateString('id-ID')}`
  return 'Keseluruhan'
})

async function fetchRekap() {
  loading.value = true
  try {
    let query = supabase
      .from('book_loans')
      .select('tanggal_pinjam, book_id, student_nisn, books(judul), students(nama, kelas)')

    if (filterMode.value === 'monthly') {
      const monthStr = String(selectedMonth.value).padStart(2, '0')
      const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
      const endStr = String(lastDay).padStart(2, '0')
      const start = `${selectedYear.value}-${monthStr}-01`
      const end = `${selectedYear.value}-${monthStr}-${endStr}`
      query = query.gte('tanggal_pinjam', start).lte('tanggal_pinjam', end)
    } else if (filterMode.value === 'daily') {
      query = query.eq('tanggal_pinjam', selectedDate.value)
    }

    const { data: loans, error } = await query
      
    if (error) throw error

    // Agregasi Buku Terlaris
    const bookCounts = {}
    const bookNames = {}
    
    // Agregasi Siswa Teraktif
    const studentCounts = {}
    const studentNames = {}

    for (const l of loans || []) {
      if (l.book_id) {
        bookCounts[l.book_id] = (bookCounts[l.book_id] || 0) + 1
        bookNames[l.book_id] = l.books?.judul || 'Buku Dihapus'
      }
      if (l.student_nisn) {
        studentCounts[l.student_nisn] = (studentCounts[l.student_nisn] || 0) + 1
        studentNames[l.student_nisn] = { nama: l.students?.nama, kelas: l.students?.kelas }
      }
    }

    topBooks.value = Object.entries(bookCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, judul: bookNames[id], count }))

    topStudents.value = Object.entries(studentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nisn, count]) => ({ nisn, ...studentNames[nisn], count }))

    // Additional Stats
    totalDipinjamBulanIni.value = (loans || []).length
    totalSiswaPeminjam.value = Object.keys(studentCounts).length

  } catch (e) {
    toast.error('Gagal memuat laporan perpus: ' + e.message)
  } finally {
    loading.value = false
  }
}

function handleDownloadPdf() {
  exportPdfPerpus({
    topBooks: topBooks.value,
    topStudents: topStudents.value,
    totalDipinjamBulanIni: totalDipinjamBulanIni.value,
    totalSiswaPeminjam: totalSiswaPeminjam.value,
    periodeText: periodeText.value,
    settings: settingsStore.settings
  })
}

onMounted(() => {
  fetchRekap()
})
</script>

<template>
  <div>
    <PageHeader title="Laporan Perpustakaan" subtitle="Rekapitulasi sirkulasi dan keaktifan membaca">
      <template #actions>
        <button class="btn-primary flex items-center gap-2" @click="handleDownloadPdf">
          <Download class="h-4 w-4" /> Download Laporan PDF
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-emerald-500" />
    </div>

    <div v-else class="space-y-6">
      <!-- Filter Controls -->
      <div class="card flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700">Periode:</label>
          <select v-model="filterMode" @change="fetchRekap" class="input w-36 py-1.5 text-sm">
            <option value="all">Keseluruhan</option>
            <option value="monthly">Bulanan</option>
            <option value="daily">Harian</option>
          </select>
        </div>

        <div v-if="filterMode === 'monthly'" class="flex items-center gap-2">
          <select v-model="selectedMonth" @change="fetchRekap" class="input w-32 py-1.5 text-sm">
            <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
          </select>
          <select v-model="selectedYear" @change="fetchRekap" class="input w-24 py-1.5 text-sm">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <div v-if="filterMode === 'daily'" class="flex items-center gap-2">
          <input type="date" v-model="selectedDate" @change="fetchRekap" class="input py-1.5 text-sm" />
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="card flex items-center gap-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <BookOpen class="h-6 w-6 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-emerald-100">Buku Dipinjam (Periode Ini)</p>
            <p class="text-2xl font-bold">{{ totalDipinjamBulanIni }} <span class="text-xs font-normal text-emerald-100">Buku</span></p>
          </div>
        </div>

        <div class="card flex items-center gap-4 bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/30">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <UserCircle class="h-6 w-6 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-sky-100">Total Siswa Pernah Meminjam</p>
            <p class="text-2xl font-bold">{{ totalSiswaPeminjam }} <span class="text-xs font-normal text-sky-100">Anak</span></p>
          </div>
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
            <h3 class="font-bold text-gray-800">10 Buku Paling Sering Dipinjam</h3>
            <p class="text-xs text-gray-500">Koleksi terfavorit siswa</p>
          </div>
        </div>
        
        <ul class="space-y-3">
          <li v-for="(b, i) in topBooks" :key="b.id" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
            <div class="flex items-center gap-3">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                {{ i + 1 }}
              </span>
              <div class="font-medium text-gray-800">{{ b.judul }}</div>
            </div>
            <div class="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <BookOpen class="h-4 w-4" /> {{ b.count }} kali
            </div>
          </li>
          <li v-if="!topBooks.length" class="text-center text-sm text-gray-500 py-4">Belum ada data peminjaman buku.</li>
        </ul>
      </div>

      <!-- Siswa Teraktif -->
      <div class="card space-y-4">
        <div class="flex items-center gap-2 border-b border-gray-100 pb-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
            <UserCircle class="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h3 class="font-bold text-gray-800">10 Siswa Teraktif Membaca</h3>
            <p class="text-xs text-gray-500">Peringkat peminjam buku terbanyak</p>
          </div>
        </div>
        
        <ul class="space-y-3">
          <li v-for="(s, i) in topStudents" :key="s.nisn" class="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
            <div class="flex items-center gap-3">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                {{ i + 1 }}
              </span>
              <div>
                <div class="font-medium text-gray-800">{{ s.nama }}</div>
                <div class="text-xs text-gray-500">Kelas {{ s.kelas || '?' }}</div>
              </div>
            </div>
            <div class="flex items-center gap-1 text-sm font-semibold text-sky-600">
              <BookOpen class="h-4 w-4" /> {{ s.count }} buku
            </div>
          </li>
          <li v-if="!topStudents.length" class="text-center text-sm text-gray-500 py-4">Belum ada data siswa meminjam buku.</li>
        </ul>
      </div>
    </div>
  </div>
</div>
</template>
