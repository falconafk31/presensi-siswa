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

const sorted = computed(() => [...rows.value].sort((a, b) => a.persen - b.persen))
const dibawah = computed(() => sorted.value.filter((r) => r.persen < threshold.value).length)

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

    const activeDaysPerKelas = {}
    for (const k of new Set((siswa || []).map(s => s.kelas))) {
      const submitted = submittedPerKelas[k] || new Set()
      activeDaysPerKelas[k] = allDays.filter(d => !liburSet.has(d) && submitted.has(d)).length
    }

    const activeDays = allDays.filter((d) => !liburSet.has(d))

    let lq = supabase.from('attendance_logs').select('student_nisn').in('student_nisn', nisnList).in('date', activeDays)
    const { data: logs, error: lErr } = await lq
    if (lErr) throw lErr

    const agg = {}
    for (const n of nisnList) agg[n] = 0 // Count of exceptions
    for (const l of logs || []) {
      if (agg[l.student_nisn] !== undefined) agg[l.student_nisn]++
    }

    rows.value = (siswa || []).map((s) => {
      const exceptions = agg[s.nisn] || 0
      const totalActive = activeDaysPerKelas[s.kelas] || 0
      const hadir = totalActive - exceptions
      const persen = totalActive ? Math.round((hadir / totalActive) * 100) : 0
      return { ...s, hadir, total: totalActive, persen }
    })
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
            <th class="px-3 py-2 text-center">Hadir</th>
            <th class="px-3 py-2 text-center">Tercatat</th>
            <th class="px-3 py-2 text-center">% Hadir</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading"><td colspan="6" class="py-6 text-center text-gray-400">Memuat...</td></tr>
          <tr v-else-if="!sorted.length"><td colspan="6" class="py-6 text-center text-gray-400">Belum ada data presensi.</td></tr>
          <tr v-for="(r, i) in sorted" :key="r.nisn" :class="r.persen < threshold ? 'bg-rose-50' : 'hover:bg-gray-50'">
            <td class="px-3 py-2 text-gray-400">{{ i + 1 }}</td>
            <td class="px-3 py-2 font-medium text-gray-800">{{ r.nama }}</td>
            <td class="px-3 py-2">{{ r.kelas }}</td>
            <td class="px-3 py-2 text-center">{{ r.hadir }}</td>
            <td class="px-3 py-2 text-center">{{ r.total }}</td>
            <td class="px-3 py-2 text-center font-bold" :class="r.persen < threshold ? 'text-rose-700' : 'text-emerald-700'">
              {{ r.persen }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
