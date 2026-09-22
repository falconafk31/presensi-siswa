<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { TriangleAlert, RefreshCw, ChartColumn } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { DEFAULT_THRESHOLD } from '@/config/constants'
import { todayISO, daysInMonth, isWeekend } from '@/lib/dates'
import {
  AppPageHeader, AppFilterBar, AppSelect, AppInput, AppTable,
  AppEmptyState, AppSkeleton, AppButton, AppPagination,
} from '@/components/ui'

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

const currentPage = ref(1)
const itemsPerPage = 25
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return sorted.value.slice(start, start + itemsPerPage)
})

async function load() {
  loading.value = true
  try {
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
      rows.value = (siswa || []).map((s) => ({ ...s, hadir: 0, total: 0, persen: 0 }))
      return
    }

    const [{ data: kal }, { data: acts }] = await Promise.all([
      supabase.from('academic_calendar').select('date').in('date', allDays).eq('status', 'Libur'),
      supabase.from('activity_logs').select('record_id').eq('aksi', 'input_presensi'),
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

    const lq = supabase.from('attendance_logs').select('student_nisn, date, status').in('student_nisn', nisnList).in('date', activeDays)
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
    for (const k of new Set((siswa || []).map((s) => s.kelas))) {
      const submitted = submittedPerKelas[k] || new Set()
      activeDaysPerKelas[k] = allDays.filter((d) => !liburSet.has(d) && submitted.has(d)).length
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
      const hadirHitungan = totalActive - stats.A
      const persen = totalActive ? Math.round((hadirHitungan / totalActive) * 100) : 0
      return { ...s, hadir, total: totalActive, persen, i: stats.I, s: stats.S, a: stats.A }
    })
    currentPage.value = 1
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
  <div class="page-stack">
    <AppPageHeader
      title="Statistik Kehadiran"
      subtitle="Bulan berjalan — urut dari kehadiran terendah untuk intervensi dini"
    >
      <template #actions>
        <AppButton size="sm" :loading="loading" @click="load">
          <template #icon><RefreshCw class="h-4 w-4" aria-hidden="true" /></template>
          Muat Ulang
        </AppButton>
      </template>
    </AppPageHeader>

    <AppFilterBar columns="sm:grid-cols-3">
      <AppSelect v-model="filterKelas" label="Kelas" :disabled="!auth.isAdmin" @change="load">
        <option v-if="auth.isAdmin" value="">Semua Kelas</option>
        <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
      </AppSelect>
      <AppInput v-model.number="threshold" type="number" label="Ambang batas (%)" :min="0" :max="100" />
      <div class="flex items-end">
        <div class="flex w-full items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="status">
          <TriangleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong class="tnum">{{ dibawah }}</strong> siswa di bawah {{ threshold }}%</span>
        </div>
      </div>
    </AppFilterBar>

    <div v-if="loading" class="card-flat p-4">
      <AppSkeleton type="table" :rows="8" />
    </div>
    <div v-else-if="!paginatedRows.length" class="card-flat p-4">
      <AppEmptyState
        title="Belum ada data presensi"
        description="Data statistik akan muncul setelah ada presensi yang diisi pada bulan berjalan."
        :icon="ChartColumn"
      />
    </div>
    <AppTable v-else sticky-header caption="Statistik kehadiran bulan berjalan">
      <thead>
        <tr>
          <th class="!text-center">#</th>
          <th>Nama</th>
          <th>Kelas</th>
          <th class="!text-center" title="Izin">I</th>
          <th class="!text-center" title="Sakit">S</th>
          <th class="!text-center" title="Alfa">A</th>
          <th class="!text-center" title="Kehadiran aktual">Hadir</th>
          <th class="!text-center" title="Total hari efektif">Tercatat</th>
          <th class="!text-center" title="Persentase bebas alfa">% (Bebas Alfa)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, idx) in paginatedRows" :key="r.nisn" :class="r.persen < threshold ? 'row-alert' : ''">
          <td class="!text-center text-slate-400">{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
          <td class="cell-main">{{ r.nama }}</td>
          <td>{{ r.kelas }}</td>
          <td class="cell-num text-sky-700">{{ r.i || '–' }}</td>
          <td class="cell-num text-amber-600">{{ r.s || '–' }}</td>
          <td class="cell-num text-rose-600">{{ r.a || '–' }}</td>
          <td class="cell-num">{{ r.hadir }}</td>
          <td class="cell-num !font-normal text-slate-500">{{ r.total }}</td>
          <td class="cell-num" :class="r.persen < threshold ? 'text-rose-700' : 'text-emerald-700'">
            {{ r.persen }}%
          </td>
        </tr>
      </tbody>
      <template #footer>
        <AppPagination v-model="currentPage" :total-items="sorted.length" :items-per-page="itemsPerPage" />
      </template>
    </AppTable>
  </div>
</template>
