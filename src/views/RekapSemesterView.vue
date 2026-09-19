<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { FileDown, RefreshCw, Table2, CalendarRange } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { isWeekend } from '@/lib/dates'
import {
  AppPageHeader, AppFilterBar, AppSelect, AppInput, AppTable,
  AppEmptyState, AppSkeleton, AppButton,
} from '@/components/ui'

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

watch(kelas, (newKelas) => {
  if (!auth.isAdmin && auth.kelas && newKelas !== auth.kelas) {
    kelas.value = auth.kelas
  }
})

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
  const current = new Date(startISO)
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
    const today = new Date().toISOString().split('T')[0]
    const actualEnd = end > today ? today : end

    let allDays = []
    if (start <= actualEnd) allDays = getDatesInRange(start, actualEnd)

    const [{ data: siswa }, { data: logs }, { data: kal }, { data: acts }] = await Promise.all([
      supabase.from('students').select('nisn, nama').eq('kelas', kelas.value).eq('active', true).order('nama'),
      supabase.from('attendance_logs').select('student_nisn, status, date').eq('kelas', kelas.value).gte('date', start).lte('date', actualEnd),
      supabase.from('academic_calendar').select('date').gte('date', start).lte('date', actualEnd).eq('status', 'Libur'),
      supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi').like('record_id', `%:${kelas.value}`),
    ])

    students.value = siswa || []

    const liburSet = new Set((kal || []).map((c) => c.date))
    for (const d of allDays) if (isWeekend(d)) liburSet.add(d)

    const submittedDates = new Set()
    for (const a of acts || []) submittedDates.add(a.record_id.split(':')[0])
    for (const l of logs || []) submittedDates.add(l.date)

    const activeDaysCount = allDays.filter((d) => !liburSet.has(d) && submittedDates.has(d)).length
    totalActiveDays.value = activeDaysCount

    const agg = {}
    for (const s of students.value) agg[s.nisn] = { I: 0, S: 0, A: 0 }

    for (const l of logs || []) {
      if (!agg[l.student_nisn] || liburSet.has(l.date)) continue
      if (l.status === 'Izin') agg[l.student_nisn].I++
      else if (l.status === 'Sakit') agg[l.student_nisn].S++
      else if (l.status === 'Alfa') agg[l.student_nisn].A++
    }

    const out = {}
    for (const s of students.value) {
      const a = agg[s.nisn]
      const H = activeDaysCount - a.I - a.S - a.A
      const pct = (n) => (activeDaysCount ? Math.round((n / activeDaysCount) * 100) : 0)
      out[s.nisn] = { H, I: a.I, S: a.S, A: a.A, persenH: pct(H), persenI: pct(a.I), persenS: pct(a.S), persenA: pct(a.A) }
    }
    summary.value = out
  } catch (e) {
    toast.error('Gagal memuat rekap semester: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function resolveWali() {
  let namaWali = auth.isAdmin ? '' : auth.user?.nama
  let nipWali = ''
  try {
    const { data: guru } = await supabase.from('users').select('nama, nip').eq('kelas', kelas.value).limit(1)
    if (guru && guru.length > 0) {
      namaWali = guru[0].nama
      nipWali = guru[0].nip || ''
    }
  } catch { /* gunakan default */ }
  return { namaWali, nipWali }
}

async function exportPDF() {
  if (!students.value.length) {
    toast.error('Tidak ada data untuk diekspor')
    return
  }
  exportingPdf.value = true
  try {
    const { generateRekapSemesterPDF } = await import('@/lib/pdfRekapSemester')
    const { namaWali, nipWali } = await resolveWali()
    const fileName = await generateRekapSemesterPDF({
      settings: settingsStore.settings,
      kelas: kelas.value,
      waliKelas: namaWali,
      nipWaliKelas: nipWali,
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
    const { namaWali, nipWali } = await resolveWali()
    const { exportExcelSemester } = await import('@/lib/excelExport')
    await exportExcelSemester({
      kelas: kelas.value,
      semesterText: `${startDate.value} s.d ${endDate.value}`,
      students: students.value,
      summary: summary.value,
      waliKelas: namaWali,
      nipWaliKelas: nipWali,
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
  <div class="page-stack">
    <AppPageHeader
      title="Rekap Semester"
      :subtitle="`Kelas ${kelas} · ${startDate} s.d. ${endDate}`"
    >
      <template #actions>
        <AppButton variant="secondary" size="sm" :loading="exportingExcel" :disabled="!students.length" @click="exportExcel">
          <template #icon><Table2 class="h-4 w-4" aria-hidden="true" /></template>
          Excel
        </AppButton>
        <AppButton size="sm" :loading="exportingPdf" :disabled="!students.length" @click="exportPDF">
          <template #icon><FileDown class="h-4 w-4" aria-hidden="true" /></template>
          Cetak PDF
        </AppButton>
      </template>
    </AppPageHeader>

    <AppFilterBar columns="sm:grid-cols-2 lg:grid-cols-4">
      <AppSelect v-model="kelas" label="Kelas" :disabled="!auth.isAdmin" @change="loadRekap">
        <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
      </AppSelect>
      <AppInput v-model="startDate" type="date" label="Dari tanggal" @change="loadRekap" />
      <AppInput v-model="endDate" type="date" label="Sampai tanggal" @change="loadRekap" />
      <div class="flex items-end">
        <AppButton variant="secondary" class="w-full sm:w-auto" :loading="loading" @click="loadRekap">
          <template #icon><RefreshCw class="h-4 w-4" aria-hidden="true" /></template>
          Muat Ulang
        </AppButton>
      </div>
    </AppFilterBar>

    <div class="card-flat flex items-center gap-2.5 p-3.5" role="status">
      <CalendarRange class="h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
      <p class="text-sm text-slate-600">
        Total hari efektif pada rentang ini:
        <strong class="text-primary-800 tnum">{{ totalActiveDays }} hari</strong>
      </p>
    </div>

    <div v-if="loading" class="card-flat p-4">
      <AppSkeleton type="table" :rows="8" />
    </div>
    <div v-else-if="!students.length" class="card-flat p-4">
      <AppEmptyState
        title="Tidak ada siswa"
        :description="`Tidak ada siswa aktif di kelas ${kelas}.`"
        :icon="CalendarRange"
      />
    </div>
    <AppTable v-else sticky-header :caption="`Rekap semester kelas ${kelas}`">
      <thead>
        <tr>
          <th class="!text-center">No</th>
          <th>NISN</th>
          <th>Nama Siswa</th>
          <th class="!bg-emerald-700 !text-center !text-white">Hadir</th>
          <th class="!bg-sky-700 !text-center !text-white">Izin</th>
          <th class="!bg-amber-600 !text-center !text-white">Sakit</th>
          <th class="!bg-rose-700 !text-center !text-white">Alfa</th>
          <th class="!bg-emerald-700 !text-center !text-white">%H</th>
          <th class="!bg-sky-700 !text-center !text-white">%I</th>
          <th class="!bg-amber-600 !text-center !text-white">%S</th>
          <th class="!bg-rose-700 !text-center !text-white">%A</th>
        </tr>
      </thead>
      <tbody class="text-center">
        <tr v-for="(s, i) in students" :key="s.nisn">
          <td class="!text-center text-slate-400 tnum">{{ i + 1 }}</td>
          <td class="text-slate-500 tnum">{{ s.nisn }}</td>
          <td class="!text-left font-medium text-slate-800">{{ s.nama }}</td>
          <td class="!bg-emerald-50 font-semibold text-emerald-800 tnum">{{ summary[s.nisn]?.H ?? 0 }}</td>
          <td class="!bg-sky-50 text-sky-800 tnum">{{ summary[s.nisn]?.I ?? 0 }}</td>
          <td class="!bg-amber-50 text-amber-800 tnum">{{ summary[s.nisn]?.S ?? 0 }}</td>
          <td class="!bg-rose-50 text-rose-700 tnum">{{ summary[s.nisn]?.A ?? 0 }}</td>
          <td class="!bg-emerald-50 text-xs font-bold text-emerald-700 tnum">{{ summary[s.nisn]?.persenH ?? 0 }}%</td>
          <td class="!bg-sky-50 text-xs font-bold text-sky-700 tnum">{{ summary[s.nisn]?.persenI ?? 0 }}%</td>
          <td class="!bg-amber-50 text-xs font-bold text-amber-700 tnum">{{ summary[s.nisn]?.persenS ?? 0 }}%</td>
          <td class="!bg-rose-50 text-xs font-bold text-rose-700 tnum">{{ summary[s.nisn]?.persenA ?? 0 }}%</td>
        </tr>
      </tbody>
    </AppTable>
  </div>
</template>
