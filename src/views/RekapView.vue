<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { FileDown, RefreshCw, Table2, CalendarDays } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePeriodStore } from '@/stores/period'
import { daysInMonth, dayNumber, isWeekend, namaBulan } from '@/lib/dates'
import {
  AppPageHeader, AppFilterBar, AppSelect, AppTable, AppBadge,
  AppEmptyState, AppSkeleton, AppButton,
} from '@/components/ui'

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

watch(kelas, (newKelas) => {
  if (!auth.isAdmin && auth.kelas && newKelas !== auth.kelas) {
    kelas.value = auth.kelas
  }
})
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())

const students = ref([])
const matrix = ref({})
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
  A: 'font-bold text-rose-600',
}

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const days = computed(() => daysInMonth(year.value, month.value))

const summary = computed(() => {
  const out = {}
  for (const s of students.value) {
    const row = matrix.value[s.nisn] || {}
    let H = 0, I = 0, S = 0, A = 0
    for (const d of days.value) {
      if (liburSet.value.has(d)) continue
      if (!submittedDatesSet.value.has(d)) continue
      const v = row[d] || 'H'
      if (v === 'H') H++
      else if (v === 'I') I++
      else if (v === 'S') S++
      else if (v === 'A') A++
    }
    const totalTercatat = H + I + S + A
    const pct = (n) => (totalTercatat ? Math.round((n / totalTercatat) * 100) : 0)
    out[s.nisn] = { H, I, S, A, persenH: pct(H), persenI: pct(I), persenS: pct(S), persenA: pct(A) }
  }
  return out
})

async function loadRekap() {
  loading.value = true
  try {
    const d = days.value
    const [{ data: siswa }, { data: logs }, { data: kal }, { data: acts }] = await Promise.all([
      supabase.from('students').select('nisn, nama').eq('kelas', kelas.value).eq('active', true).order('nama'),
      supabase.from('attendance_logs').select('student_nisn, status, date').eq('kelas', kelas.value).gte('date', d[0]).lte('date', d[d.length - 1]),
      supabase.from('academic_calendar').select('date').gte('date', d[0]).lte('date', d[d.length - 1]).eq('status', 'Libur'),
      supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi').like('record_id', `%:${kelas.value}`),
    ])

    students.value = siswa || []

    const libur = new Set((kal || []).map((c) => c.date))
    for (const date of d) if (isWeekend(date)) libur.add(date)
    liburSet.value = libur

    const submittedDates = new Set()
    for (const a of acts || []) submittedDates.add(a.record_id.split(':')[0])
    for (const l of logs || []) submittedDates.add(l.date)
    submittedDatesSet.value = submittedDates

    const m = {}
    for (const l of logs || []) {
      if (l.status !== 'Hadir') {
        if (!m[l.student_nisn]) m[l.student_nisn] = {}
        m[l.student_nisn][l.date] = STATUS_SHORT[l.status] || ''
      }
    }
    matrix.value = m
  } catch (e) {
    toast.error('Gagal memuat rekap: ' + e.message)
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
    const { generateRekapPDF } = await import('@/lib/pdfRekap')
    const matrixForPdf = {}
    for (const s of students.value) matrixForPdf[s.nisn] = matrix.value[s.nisn] || {}
    const { namaWali, nipWali } = await resolveWali()
    const fileName = await generateRekapPDF({
      settings: settingsStore.settings,
      period: periodStore.activePeriod,
      kelas: kelas.value,
      waliKelas: namaWali,
      nipWaliKelas: nipWali,
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
    const { namaWali, nipWali } = await resolveWali()
    const { exportExcelBulanan } = await import('@/lib/excelExport')
    await exportExcelBulanan({
      kelas: kelas.value,
      year: year.value,
      month: month.value,
      days: days.value,
      students: students.value,
      matrix: matrix.value,
      summary: summary.value,
      liburSet: liburSet.value,
      submittedDatesSet: submittedDatesSet.value,
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
  if (!periodStore.activePeriod) periodStore.fetchActivePeriod()
  loadRekap()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader
      title="Rekap Bulanan"
      :subtitle="`Kelas ${kelas} · ${namaBulan(month)} ${year}`"
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
      <AppSelect v-model.number="month" label="Bulan" @change="loadRekap">
        <option v-for="m in monthOptions" :key="m" :value="m">{{ namaBulan(m) }}</option>
      </AppSelect>
      <AppSelect v-model.number="year" label="Tahun" @change="loadRekap">
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
      </AppSelect>
      <div class="flex items-end">
        <AppButton variant="secondary" class="w-full sm:w-auto" :loading="loading" @click="loadRekap">
          <template #icon><RefreshCw class="h-4 w-4" aria-hidden="true" /></template>
          Muat Ulang
        </AppButton>
      </div>
    </AppFilterBar>

    <div v-if="loading" class="card-flat p-4">
      <AppSkeleton type="table" :rows="6" />
    </div>
    <div v-else-if="!students.length" class="card-flat p-4">
      <AppEmptyState
        title="Tidak ada siswa"
        :description="`Tidak ada siswa aktif di kelas ${kelas}.`"
        :icon="CalendarDays"
      />
    </div>
    <AppTable v-else sticky-header :caption="`Rekap kehadiran kelas ${kelas} bulan ${namaBulan(month)} ${year}`">
      <thead>
        <tr class="!bg-primary-800">
          <th class="sticky left-0 z-20 w-10 !border-primary-900 !bg-primary-800 !text-center !text-white">No</th>
          <th class="sticky left-10 z-20 !border-primary-900 !bg-primary-800 !text-left !text-white">Nama</th>
          <th v-for="d in days" :key="d" class="!border-primary-900 !bg-primary-800 !px-1.5 !text-center !text-white tnum">
            {{ dayNumber(d) }}
          </th>
          <th class="!border-primary-900 !bg-emerald-700 !text-center !text-white">H</th>
          <th class="!border-primary-900 !bg-sky-700 !text-center !text-white">I</th>
          <th class="!border-primary-900 !bg-amber-600 !text-center !text-white">S</th>
          <th class="!border-primary-900 !bg-rose-700 !text-center !text-white">A</th>
          <th class="!border-primary-900 !bg-emerald-700 !text-center !text-[10px] !text-white">%H</th>
          <th class="!border-primary-900 !bg-sky-700 !text-center !text-[10px] !text-white">%I</th>
          <th class="!border-primary-900 !bg-amber-600 !text-center !text-[10px] !text-white">%S</th>
          <th class="!border-primary-900 !bg-rose-700 !text-center !text-[10px] !text-white">%A</th>
        </tr>
      </thead>
      <tbody class="text-center text-xs">
        <tr v-for="(s, i) in students" :key="s.nisn">
          <td class="sticky left-0 z-10 !border-slate-200 !bg-white !text-center text-slate-400 tnum">{{ i + 1 }}</td>
          <td class="sticky left-10 z-10 whitespace-nowrap !border-slate-200 !bg-white !text-left font-medium text-slate-800">
            {{ s.nama }}
          </td>
          <td
            v-for="d in days"
            :key="d"
            class="!border-slate-200 !px-1 tnum"
            :class="[
              liburSet.has(d) ? '!bg-rose-100 font-bold text-rose-700' : !submittedDatesSet.has(d) ? '!bg-slate-100 text-slate-300' : '!bg-white',
              !liburSet.has(d) && submittedDatesSet.has(d) ? cellColor[(matrix[s.nisn] || {})[d] || 'H'] : '',
            ]"
          >
            {{ liburSet.has(d) ? 'L' : !submittedDatesSet.has(d) ? '–' : (matrix[s.nisn] || {})[d] || 'H' }}
          </td>
          <td class="!border-slate-200 !bg-emerald-50 font-semibold text-emerald-800 tnum">{{ summary[s.nisn].H }}</td>
          <td class="!border-slate-200 !bg-sky-50 text-sky-800 tnum">{{ summary[s.nisn].I }}</td>
          <td class="!border-slate-200 !bg-amber-50 text-amber-800 tnum">{{ summary[s.nisn].S }}</td>
          <td class="!border-slate-200 !bg-rose-50 text-rose-700 tnum">{{ summary[s.nisn].A }}</td>
          <td class="!border-slate-200 !bg-emerald-50 !text-[10px] font-bold text-emerald-700 tnum">{{ summary[s.nisn].persenH }}%</td>
          <td class="!border-slate-200 !bg-sky-50 !text-[10px] font-bold text-sky-700 tnum">{{ summary[s.nisn].persenI }}%</td>
          <td class="!border-slate-200 !bg-amber-50 !text-[10px] font-bold text-amber-700 tnum">{{ summary[s.nisn].persenS }}%</td>
          <td class="!border-slate-200 !bg-rose-50 !text-[10px] font-bold text-rose-700 tnum">{{ summary[s.nisn].persenA }}%</td>
        </tr>
      </tbody>
    </AppTable>

    <div class="flex flex-wrap items-center gap-1.5" aria-label="Keterangan simbol rekap">
      <AppBadge label="H = Hadir" tone="success" dot />
      <AppBadge label="I = Izin" tone="info" dot />
      <AppBadge label="S = Sakit" tone="warning" dot />
      <AppBadge label="A = Alfa" tone="danger" dot />
      <AppBadge label="L = Libur" tone="danger" dot />
      <AppBadge label="– = Belum diabsen" tone="neutral" dot />
    </div>
  </div>
</template>
