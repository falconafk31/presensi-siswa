<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { TriangleAlert, RefreshCw } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { DEFAULT_THRESHOLD } from '@/config/constants'
import { todayISO, daysInMonth, isWeekend } from '@/lib/dates'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const threshold = useStorage('presensi.threshold', DEFAULT_THRESHOLD)
const filterKelas = ref(auth.isAdmin ? '' : auth.kelas || '')
const rows = ref([])
const loading = ref(false)

const sorted = computed(() => [...rows.value].sort((a, b) => {
  if (a.persen !== b.persen) return a.persen - b.persen
  return (a.nama || '').localeCompare(b.nama || '')
}))
const dibawah = computed(() => sorted.value.filter((r) => r.persen < threshold.value).length)

// Pagination logic
const currentPage = ref(1)
const itemsPerPage = 25
const totalPages = computed(() => Math.ceil(sorted.value.length / itemsPerPage) || 1)
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return sorted.value.slice(start, start + itemsPerPage)
})

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

async function load() {
  loading.value = true
  try {
    // Ambil siswa aktif (sesuai filter), lalu agregasi attendance_logs.
    let sq = supabase.from('students').select('nisn, nama, kelas').eq('active', true)
    if (filterKelas.value) sq = sq.eq('kelas', filterKelas.value)
    const { data: siswa, error: sErr } = await sq
    if (sErr) throw sErr

    const nisnList = (siswa || []).map((s) => s.nisn)
    if (!nisnList.length) {
      rows.value = []
      currentPage.value = 1
      return
    }

    const now = new Date()
    const allDays = daysInMonth(now.getFullYear(), now.getMonth() + 1).filter((d) => d <= todayISO())
    if (!allDays.length) {
      rows.value = (siswa || []).map(s => ({ ...s, hadir: 0, total: 0, persen: 0 }))
      return
    }
    
    const [{ data: kal }, { data: acts }] = await Promise.all([
      supabase.from('academic_calendar').select('date').in('date', allDays).eq('status', 'Libur'),
      supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi')
    ])

    const liburSet = new Set((kal || []).map((k) => k.date))
    for (const d of allDays) if (isWeekend(d)) liburSet.add(d)
    
    const submittedPerKelas = {}
    for (const a of acts || []) {
      const [d, k] = a.record_id.split(':')
      if (!submittedPerKelas[k]) submittedPerKelas[k] = new Set()
      submittedPerKelas[k].add(d)
    }

    const activeDays = allDays.filter((d) => !liburSet.has(d))

    let lq = supabase.from('attendance_logs').select('student_nisn, date, status').in('student_nisn', nisnList).in('date', activeDays)
    const { data: logs, error: lErr } = await lq
    if (lErr) throw lErr

    const nisnToKelas = {}
    for (const s of siswa || []) nisnToKelas[s.nisn] = s.kelas

    for (const l of logs || []) {
      const k = nisnToKelas[l.student_nisn]
      if (k) {
        if (!submittedPerKelas[k]) submittedPerKelas[k] = new Set()
        submittedPerKelas[k].add(l.date)
      }
    }

    const activeDaysPerKelas = {}
    for (const k of new Set((siswa || []).map(s => s.kelas))) {
      const submitted = submittedPerKelas[k] || new Set()
      activeDaysPerKelas[k] = allDays.filter(d => !liburSet.has(d) && submitted.has(d)).length
    }

    const agg = {}
    for (const n of nisnList) agg[n] = { I: 0, S: 0, A: 0 }
    for (const l of logs || []) {
      if (l.status !== 'Hadir' && agg[l.student_nisn] !== undefined) {
        if (l.status === 'Izin') agg[l.student_nisn].I++
        else if (l.status === 'Sakit') agg[l.student_nisn].S++
        else if (l.status === 'Alfa') agg[l.student_nisn].A++
      }
    }

    rows.value = (siswa || []).map((s) => {
      const stats = agg[s.nisn] || { I: 0, S: 0, A: 0 }
      const totalActive = activeDaysPerKelas[s.kelas] || 0
      
      const hadir = totalActive - (stats.I + stats.S + stats.A)
      
      // Persentase hanya memperhitungkan Alfa sebagai pengurangan
      const hadirHitungan = totalActive - stats.A
      const persen = totalActive ? Math.round((hadirHitungan / totalActive) * 100) : 0
      
      return { ...s, hadir, total: totalActive, persen, i: stats.I, s: stats.S, a: stats.A }
    })
    currentPage.value = 1 // Reset ke halaman 1 setiap data dimuat ulang
  } catch (e) {
    toast.error('Gagal memuat statistik: ' + e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  load()
})
</script>

<template>
  <div>
    <PageHeader title="Statistik & Peringatan Kehadiran" subtitle="Bulan ini: Siswa dengan kehadiran terendah untuk intervensi dini">
      <template #actions>
        <button class="btn-primary" :disabled="loading" @click="load">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" /> Muat Ulang
        </button>
      </template>
    </PageHeader>

    <div class="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Kelas</label>
        <select v-model="filterKelas" class="input-field" :disabled="!auth.isAdmin" @change="load">
          <option v-if="auth.isAdmin" value="">Semua Kelas</option>
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Ambang Batas (%)</label>
        <input v-model.number="threshold" type="number" min="0" max="100" class="input-field" />
      </div>
      <div class="flex items-end">
        <div class="flex w-full items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <TriangleAlert class="h-4 w-4" />
          {{ dibawah }} siswa di bawah {{ threshold }}%
        </div>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th class="px-3 py-2">#</th>
            <th class="px-3 py-2">Nama</th>
            <th class="px-3 py-2">Kelas</th>
            <th class="px-3 py-2 text-center" title="Izin">I</th>
            <th class="px-3 py-2 text-center" title="Sakit">S</th>
            <th class="px-3 py-2 text-center" title="Alfa">A</th>
            <th class="px-3 py-2 text-center" title="Kehadiran Aktual">Hadir</th>
            <th class="px-3 py-2 text-center" title="Total Hari Efektif">Tercatat</th>
            <th class="px-3 py-2 text-center" title="Persentase Bebas Alfa">% (Bebas Alfa)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading"><td colspan="9" class="py-6 text-center text-gray-400">Memuat...</td></tr>
          <tr v-else-if="!paginatedRows.length"><td colspan="9" class="py-6 text-center text-gray-400">Belum ada data presensi.</td></tr>
          <tr v-for="(r, idx) in paginatedRows" :key="r.nisn" :class="r.persen < threshold ? 'bg-rose-50' : 'hover:bg-gray-50'">
            <td class="px-3 py-2 text-gray-400">{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
            <td class="px-3 py-2 font-medium text-gray-800">{{ r.nama }}</td>
            <td class="px-3 py-2">{{ r.kelas }}</td>
            <td class="px-3 py-2 text-center font-semibold text-blue-600">{{ r.i || '-' }}</td>
            <td class="px-3 py-2 text-center font-semibold text-amber-500">{{ r.s || '-' }}</td>
            <td class="px-3 py-2 text-center font-semibold text-rose-600">{{ r.a || '-' }}</td>
            <td class="px-3 py-2 text-center font-medium">{{ r.hadir }}</td>
            <td class="px-3 py-2 text-center text-gray-500">{{ r.total }}</td>
            <td class="px-3 py-2 text-center font-bold" :class="r.persen < threshold ? 'text-rose-700' : 'text-emerald-700'">
              {{ r.persen }}%
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Pagination Controls -->
      <div v-if="!loading && totalPages > 1" class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Menampilkan <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> s.d 
              <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, sorted.length) }}</span> dari 
              <span class="font-medium">{{ sorted.length }}</span> data
            </p>
          </div>
          <div>
            <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button @click="prevPage" :disabled="currentPage === 1" class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                <span class="sr-only">Previous</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
                </svg>
              </button>
              <span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                Hal {{ currentPage }} dari {{ totalPages }}
              </span>
              <button @click="nextPage" :disabled="currentPage === totalPages" class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                <span class="sr-only">Next</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
