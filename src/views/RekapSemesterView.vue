<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { FileDown, Loader2, RefreshCw, Table } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { isWeekend, daysInMonth } from '@/lib/dates'

const auth = useAuthStore()
const settingsStore = useSettingsStore()

const now = new Date()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const kelas = ref(auth.isAdmin ? (daftarKelas.value[0] || '1') : (auth.kelas || daftarKelas.value[0] || '1'))

watch(daftarKelas, (newDaftar) => {
  if (auth.isAdmin && newDaftar.length > 0 && !newDaftar.includes(kelas.value)) {
    kelas.value = newDaftar[0]
  }
}, { immediate: true })

const currentMonth = now.getMonth() + 1
const defaultStartYear = currentMonth > 6 ? now.getFullYear() : now.getFullYear() - 1
const defaultEndYear = currentMonth > 6 ? now.getFullYear() + 1 : now.getFullYear()

const startDate = ref(`${defaultStartYear}-07-01`)
const endDate = ref(`${defaultEndYear}-01-15`)

const students = ref([])
const loading = ref(false)
const exportingPdf = ref(false)
const exportingExcel = ref(false)

const summary = ref({})
const totalActiveDays = ref(0)

function getDatesInRange(startISO, endISO) {
  const dates = []
  let current = new Date(startISO)
  const end = new Date(endISO)
  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

async function loadRekap() {
  if (!startDate.value || !endDate.value) return
  if (startDate.value > endDate.value) {
    toast.error('Tanggal awal tidak boleh lebih dari tanggal akhir')
    return
  }
  loading.value = true
  try {
    const start = startDate.value
    const end = endDate.value
    // Jangan menghitung hari di masa depan
    const today = new Date().toISOString().split('T')[0]
    const actualEnd = end > today ? today : end
    
    let allDays = []
    if (start <= actualEnd) {
      allDays = getDatesInRange(start, actualEnd)
    }

    const [{ data: siswa }, { data: logs }, { data: kal }, { data: acts }] = await Promise.all([
      supabase
        .from('students')
        .select('nisn, nama')
        .eq('kelas', kelas.value)
        .eq('active', true)
        .order('nama'),
      supabase
        .from('attendance_logs')
        .select('student_nisn, status, date')
        .eq('kelas', kelas.value)
        .gte('date', start)
        .lte('date', actualEnd),
      supabase
        .from('academic_calendar')
        .select('date')
        .gte('date', start)
        .lte('date', actualEnd)
        .eq('status', 'Libur'),
      supabase
        .from('activity_logs')
        .select('record_id')
        .eq('aksi', 'input_presensi')
        .like('record_id', `%:${kelas.value}`)
    ])

    students.value = siswa || []

    const liburSet = new Set((kal || []).map((c) => c.date))
    for (const d of allDays) if (isWeekend(d)) liburSet.add(d)

    const submittedDates = new Set((acts || []).map(a => a.record_id.split(':')[0]))

    const activeDaysCount = allDays.filter(d => !liburSet.has(d) && submittedDates.has(d)).length
    totalActiveDays.value = activeDaysCount

    // agg: nisn -> { I, S, A }
    const agg = {}
    for (const s of students.value) {
      agg[s.nisn] = { I: 0, S: 0, A: 0 }
    }

    // Hitung hanya pada hari aktif
    for (const l of logs || []) {
      if (!agg[l.student_nisn] || liburSet.has(l.date)) continue
      if (l.status === 'Izin') agg[l.student_nisn].I++
      else if (l.status === 'Sakit') agg[l.student_nisn].S++
      else if (l.status === 'Alfa') agg[l.student_nisn].A++
    }

    const out = {}
    for (const s of students.value) {
      const a = agg[s.nisn]
      const totalExc = a.I + a.S + a.A
      const H = activeDaysCount - totalExc
      const persen = activeDaysCount ? Math.round((H / activeDaysCount) * 100) : 0
      out[s.nisn] = { H, I: a.I, S: a.S, A: a.A, persen }
    }
    summary.value = out

  } catch (e) {
    toast.error('Gagal memuat rekap semester: ' + e.message)
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
    const { generateRekapSemesterPDF } = await import('@/lib/pdfRekapSemester')
    const fileName = await generateRekapSemesterPDF({
      settings: settingsStore.settings,
      kelas: kelas.value,
      waliKelas: auth.isAdmin ? '' : auth.user?.nama,
      tahun: '',
      semester: `${startDate.value} s.d ${endDate.value}`,
      students: students.value,
      summary: summary.value,
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
    const { exportExcelSemester } = await import('@/lib/excelExport')
    exportExcelSemester({
      kelas: kelas.value,
      semesterText: `${startDate.value} s.d ${endDate.value}`,
      students: students.value,
      summary: summary.value,
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
  loadRekap()
})
</script>

<template>
  <div>
    <PageHeader title="Rekap Semester" subtitle="Agregasi kehadiran siswa selama 1 semester penuh">
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
        <label class="mb-1 block text-xs font-medium text-gray-600">Dari Tanggal</label>
        <input type="date" v-model="startDate" class="input-field" @change="loadRekap" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Sampai Tanggal</label>
        <input type="date" v-model="endDate" class="input-field" @change="loadRekap" />
      </div>
      <div class="flex items-end">
        <button class="btn-primary w-full" :disabled="loading" @click="loadRekap">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          Muat
        </button>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <div class="mb-3 text-sm font-medium text-gray-700">
        Total Hari Efektif Semester Ini: <span class="font-bold text-primary">{{ totalActiveDays }} Hari</span>
      </div>
      <table class="min-w-full border-collapse text-center text-sm">
        <thead>
          <tr class="bg-primary text-white">
            <th class="border border-emerald-900 bg-primary px-3 py-2">No</th>
            <th class="border border-emerald-900 bg-primary px-3 py-2">NISN</th>
            <th class="border border-emerald-900 bg-primary px-3 py-2 text-left">Nama Siswa</th>
            <th class="border border-emerald-900 bg-emerald-700 px-3 py-2">Hadir</th>
            <th class="border border-emerald-900 bg-emerald-700 px-3 py-2">Izin</th>
            <th class="border border-emerald-900 bg-emerald-700 px-3 py-2">Sakit</th>
            <th class="border border-emerald-900 bg-emerald-700 px-3 py-2">Alfa</th>
            <th class="border border-emerald-900 bg-emerald-700 px-3 py-2">% Hadir</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="py-6 text-gray-400">Memuat...</td>
          </tr>
          <tr v-else-if="!students.length">
            <td colspan="8" class="py-6 text-gray-400">
              Tidak ada siswa di kelas {{ kelas }}.
            </td>
          </tr>
          <tr v-for="(s, i) in students" :key="s.nisn" class="hover:bg-gray-50">
            <td class="border border-gray-200 px-3 py-2">{{ i + 1 }}</td>
            <td class="border border-gray-200 px-3 py-2 text-gray-500">{{ s.nisn }}</td>
            <td class="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
              {{ s.nama }}
            </td>
            <td class="border border-gray-200 bg-emerald-50 px-3 py-2 font-semibold">{{ summary[s.nisn].H }}</td>
            <td class="border border-gray-200 bg-sky-50 px-3 py-2">{{ summary[s.nisn].I }}</td>
            <td class="border border-gray-200 bg-amber-50 px-3 py-2">{{ summary[s.nisn].S }}</td>
            <td class="border border-gray-200 bg-rose-50 px-3 py-2">{{ summary[s.nisn].A }}</td>
            <td
              class="border border-gray-200 px-3 py-2 font-bold"
              :class="summary[s.nisn].persen < 75 ? 'bg-rose-100 text-rose-700' : 'text-emerald-700'"
            >
              {{ summary[s.nisn].persen }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
