<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { FileDown, Loader2, RefreshCw, Table } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePeriodStore } from '@/stores/period'
import { daysInMonth, dayNumber, isWeekend } from '@/lib/dates'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const periodStore = usePeriodStore()

const now = new Date()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const kelas = ref(auth.isAdmin ? (daftarKelas.value[0] || '1') : (auth.kelas || daftarKelas.value[0] || '1'))

watch(daftarKelas, (newDaftar) => {
  if (auth.isAdmin && newDaftar.length > 0 && !newDaftar.includes(kelas.value)) {
    kelas.value = newDaftar[0]
  }
}, { immediate: true })
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())

const students = ref([])
const matrix = ref({})        // nisn -> { date -> 'H'|'I'|'S'|'A' }
const liburSet = ref(new Set())
const submittedDatesSet = ref(new Set())
const loading = ref(false)
const exportingPdf = ref(false)
const exportingExcel = ref(false)

const STATUS_SHORT = { Hadir: 'H', Izin: 'I', Sakit: 'S', Alfa: 'A' }
const cellColor = {
  H: 'text-emerald-600',
  I: 'text-sky-600',
  S: 'text-amber-600',
  A: 'text-rose-600 font-semibold',
}

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

// Tampilkan SELURUH tanggal dalam bulan tersebut agar Libur/Tanggal Merah terlihat di tabel
const days = computed(() => daysInMonth(year.value, month.value))

const summary = computed(() => {
  const out = {}
  for (const s of students.value) {
    const row = matrix.value[s.nisn] || {}
    let H = 0, I = 0, S = 0, A = 0
    for (const d of days.value) {
      if (liburSet.value.has(d)) continue
      if (!submittedDatesSet.value.has(d)) continue // Jangan hitung hari yang belum diabsen
      
      const v = row[d] || 'H'
      if (v === 'H') H++
      else if (v === 'I') I++
      else if (v === 'S') S++
      else if (v === 'A') A++
    }
    const totalTercatat = H + I + S + A
    const persen = totalTercatat ? Math.round((H / totalTercatat) * 100) : 0
    out[s.nisn] = { H, I, S, A, persen }
  }
  return out
})

async function loadRekap() {
  loading.value = true
  try {
    const d = days.value
    const [{ data: siswa }, { data: logs }, { data: kal }, { data: acts }] = await Promise.all([
      supabase.from('students').select('nisn, nama').eq('kelas', kelas.value).eq('active', true).order('nama'),
      supabase
        .from('attendance_logs')
        .select('student_nisn, status, date')
        .eq('kelas', kelas.value)
        .gte('date', d[0])
        .lte('date', d[d.length - 1]),
      supabase
        .from('academic_calendar')
        .select('date')
        .gte('date', d[0])
        .lte('date', d[d.length - 1])
        .eq('status', 'Libur'),
      supabase
        .from('activity_logs')
        .select('record_id')
        .eq('aksi', 'input_presensi')
        .like('record_id', `%:${kelas.value}`)
    ])

    students.value = siswa || []

    const libur = new Set((kal || []).map((c) => c.date))
    for (const date of d) if (isWeekend(date)) libur.add(date)
    liburSet.value = libur

    const submittedDates = new Set((acts || []).map(a => a.record_id.split(':')[0]))
    submittedDatesSet.value = submittedDates

    const m = {}
    for (const l of logs || []) {
      if (!m[l.student_nisn]) m[l.student_nisn] = {}
      m[l.student_nisn][l.date] = STATUS_SHORT[l.status] || ''
    }
    matrix.value = m
  } catch (e) {
    toast.error('Gagal memuat rekap: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function exportPDF() {
  if (!students.value.length) {
    toast.error('Tidak ada data untuk diekspor')
    return
  }
  exportingPdf.value = true
  try {
    const { generateRekapPDF } = await import('@/lib/pdfRekap')
    const matrixForPdf = {}
    for (const s of students.value) matrixForPdf[s.nisn] = matrix.value[s.nisn] || {}
    const fileName = await generateRekapPDF({
      settings: settingsStore.settings,
      period: periodStore.activePeriod,
      kelas: kelas.value,
      waliKelas: auth.isAdmin ? '' : auth.user?.nama,
      year: year.value,
      month: month.value,
      days: days.value,
      students: students.value,
      matrix: matrixForPdf,
      summary: summary.value,
      liburSet: liburSet.value,
      submittedDatesSet: submittedDatesSet.value,
    })
    toast.success('PDF dibuat: ' + fileName)
  } catch (e) {
    toast.error('Gagal membuat PDF: ' + e.message)
  } finally {
    exportingPdf.value = false
  }
}

async function exportExcel() {
  if (!students.value.length) {
    toast.error('Tidak ada data untuk diekspor')
    return
  }
  exportingExcel.value = true
  try {
    const { exportExcelBulanan } = await import('@/lib/excelExport')
    exportExcelBulanan({
      kelas: kelas.value,
      year: year.value,
      month: month.value,
      days: days.value,
      students: students.value,
      matrix: matrix.value,
      summary: summary.value,
      liburSet: liburSet.value,
      submittedDatesSet: submittedDatesSet.value,
    })
    toast.success('Berhasil mengekspor Excel')
  } catch (e) {
    toast.error('Gagal mengekspor Excel: ' + e.message)
  } finally {
    exportingExcel.value = false
  }
}

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  if (!periodStore.activePeriod) periodStore.fetchActivePeriod()
  loadRekap()
})
</script>

<template>
  <div>
    <PageHeader title="Rekap Absensi" subtitle="Matriks kehadiran bulanan & cetak PDF resmi">
      <template #actions>
        <div class="flex gap-2">
          <button class="btn-primary bg-emerald-600 hover:bg-emerald-700" :disabled="exportingExcel || !students.length" @click="exportExcel">
            <Loader2 v-if="exportingExcel" class="h-4 w-4 animate-spin" />
            <Table v-else class="h-4 w-4" />
            Cetak Excel
          </button>
          <button class="btn-primary" :disabled="exportingPdf || !students.length" @click="exportPDF">
            <Loader2 v-if="exportingPdf" class="h-4 w-4 animate-spin" />
            <FileDown v-else class="h-4 w-4" />
            Cetak PDF
          </button>
        </div>
      </template>
    </PageHeader>

    <div class="card mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Kelas</label>
        <select v-model="kelas" class="input-field" :disabled="!auth.isAdmin" @change="loadRekap">
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Bulan</label>
        <select v-model.number="month" class="input-field" @change="loadRekap">
          <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Tahun</label>
        <select v-model.number="year" class="input-field" @change="loadRekap">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="flex items-end">
        <button class="btn-primary w-full" :disabled="loading" @click="loadRekap">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          Muat
        </button>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="min-w-full border-collapse text-center text-xs">
        <thead>
          <tr class="bg-primary text-white">
            <th class="sticky left-0 z-10 border border-emerald-900 bg-primary px-2 py-1.5">No</th>
            <th class="sticky left-8 z-10 border border-emerald-900 bg-primary px-2 py-1.5 text-left">Nama</th>
            <th v-for="d in days" :key="d" class="border border-emerald-900 px-1.5 py-1.5">
              {{ dayNumber(d) }}
            </th>
            <th class="border border-emerald-900 bg-emerald-700 px-1.5 py-1.5">H</th>
            <th class="border border-emerald-900 bg-emerald-700 px-1.5 py-1.5">I</th>
            <th class="border border-emerald-900 bg-emerald-700 px-1.5 py-1.5">S</th>
            <th class="border border-emerald-900 bg-emerald-700 px-1.5 py-1.5">A</th>
            <th class="border border-emerald-900 bg-emerald-700 px-2 py-1.5">% Hadir</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="days.length + 7" class="py-6 text-gray-400">Memuat...</td>
          </tr>
          <tr v-else-if="!students.length">
            <td :colspan="days.length + 7" class="py-6 text-gray-400">
              Tidak ada siswa di kelas {{ kelas }}.
            </td>
          </tr>
          <tr v-for="(s, i) in students" :key="s.nisn" class="hover:bg-gray-50">
            <td class="sticky left-0 z-10 border border-gray-200 bg-white px-2 py-1">{{ i + 1 }}</td>
            <td class="sticky left-8 z-10 border border-gray-200 bg-white px-2 py-1 text-left font-medium text-gray-700 whitespace-nowrap">
              {{ s.nama }}
            </td>
            <td
              v-for="d in days"
              :key="d"
              class="border border-gray-200 px-1 py-1"
              :class="[
                liburSet.has(d) ? 'bg-rose-100 text-rose-700 font-semibold' : (!submittedDatesSet.has(d) ? 'bg-gray-100 text-gray-400' : 'bg-white'),
                (!liburSet.has(d) && submittedDatesSet.has(d)) ? (cellColor[(matrix[s.nisn] || {})[d] || 'H'] || 'text-gray-300') : ''
              ]"
            >
              {{ liburSet.has(d) ? 'L' : (!submittedDatesSet.has(d) ? '-' : ((matrix[s.nisn] || {})[d] || 'H')) }}
            </td>
            <td class="border border-gray-200 bg-emerald-50 px-1 py-1 font-semibold">{{ summary[s.nisn].H }}</td>
            <td class="border border-gray-200 bg-sky-50 px-1 py-1">{{ summary[s.nisn].I }}</td>
            <td class="border border-gray-200 bg-amber-50 px-1 py-1">{{ summary[s.nisn].S }}</td>
            <td class="border border-gray-200 bg-rose-50 px-1 py-1">{{ summary[s.nisn].A }}</td>
            <td
              class="border border-gray-200 px-2 py-1 font-bold"
              :class="summary[s.nisn].persen < 75 ? 'bg-rose-100 text-rose-700' : 'text-emerald-700'"
            >
              {{ summary[s.nisn].persen }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-2 text-xs text-gray-500">
      <span class="font-bold text-rose-700">L (Merah muda)</span> = Hari Libur/Akhir Pekan. 
      <span class="font-bold text-gray-500">- (Abu-abu)</span> = Belum Diabsen oleh guru (tidak dihitung).
      <span class="font-bold text-emerald-600">H</span> = Hadir.
    </p>
  </div>
</template>
