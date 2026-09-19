<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { daysInMonth, isWeekend, namaBulan } from '@/lib/dates'
import {
  AppPageHeader, AppCard, AppModal, AppInput, AppButton, AppSkeleton,
} from '@/components/ui'

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const calendarMap = ref({})
const loading = ref(false)

const showModal = ref(false)
const targetIso = ref(null)
const keteranganLibur = ref('')

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const cells = computed(() => {
  const days = daysInMonth(year.value, month.value)
  const firstDow = new Date(year.value, month.value - 1, 1).getDay()
  const blanks = Array.from({ length: firstDow }, () => null)
  return [...blanks, ...days]
})

async function load() {
  loading.value = true
  try {
    const days = daysInMonth(year.value, month.value)
    const { data, error } = await supabase
      .from('academic_calendar')
      .select('date, status, keterangan')
      .gte('date', days[0])
      .lte('date', days[days.length - 1])
    if (error) throw error
    const map = {}
    for (const r of data || []) map[r.date] = r
    calendarMap.value = map
  } catch (e) {
    toast.error('Gagal memuat kalender: ' + e.message)
  } finally {
    loading.value = false
  }
}

function isLibur(iso) {
  const record = calendarMap.value[iso]
  return record?.status === 'Libur' || (!record && isWeekend(iso))
}

function targetLabel() {
  if (!targetIso.value) return ''
  return new Date(targetIso.value + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

async function toggle(iso) {
  if (!iso) return
  const sekarangLibur = isLibur(iso)
  const baru = sekarangLibur ? 'Masuk' : 'Libur'

  if (baru === 'Libur') {
    targetIso.value = iso
    keteranganLibur.value = calendarMap.value[iso]?.keterangan || ''
    showModal.value = true
    return
  }

  await prosesSimpan(iso, baru, null)
  toast.success(`${iso} ditandai hari masuk`)
}

async function simpanLibur() {
  await prosesSimpan(targetIso.value, 'Libur', keteranganLibur.value || null)
  showModal.value = false
  toast.success('Hari libur disimpan')
}

async function prosesSimpan(iso, baru, keterangan) {
  try {
    const { error } = await supabase
      .from('academic_calendar')
      .upsert({ date: iso, status: baru, keterangan }, { onConflict: 'date' })
    if (error) throw error

    calendarMap.value = { ...calendarMap.value, [iso]: { status: baru, keterangan } }
    await logActivity({ aksi: 'update_kalender', tabel_terkait: 'academic_calendar', record_id: iso, detail: { status: baru, keterangan } })
  } catch (e) {
    toast.error('Gagal: ' + e.message)
  }
}

function prevMonth() {
  if (month.value === 1) { month.value = 12; year.value-- } else month.value--
}
function nextMonth() {
  if (month.value === 12) { month.value = 1; year.value++ } else month.value++
}

watch([month, year], load)
onMounted(load)
</script>

<template>
  <div class="page-stack">
    <AppPageHeader title="Kalender Akademik" subtitle="Ketuk tanggal untuk mengubah status Masuk / Libur" />

    <AppCard class="mx-auto w-full max-w-2xl">
      <div class="mb-3 flex items-center justify-between">
        <button class="btn-icon" aria-label="Bulan sebelumnya" @click="prevMonth">
          <ChevronLeft class="h-5 w-5" />
        </button>
        <h3 class="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
          <CalendarDays class="h-4 w-4 text-primary-600" aria-hidden="true" />
          {{ namaBulan(month) }} {{ year }}
        </h3>
        <button class="btn-icon" aria-label="Bulan berikutnya" @click="nextMonth">
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>

      <div v-if="loading" class="py-4">
        <AppSkeleton type="card" :rows="2" />
      </div>
      <template v-else>
        <div class="grid grid-cols-7 gap-1 text-center" role="row">
          <div v-for="h in HARI" :key="h" class="py-1 text-xs font-medium text-slate-400" role="columnheader">{{ h }}</div>
        </div>
        <div class="mt-1 grid grid-cols-7 gap-1" role="grid" :aria-label="`Kalender ${namaBulan(month)} ${year}`">
          <template v-for="(iso, i) in cells" :key="i">
            <div v-if="!iso" aria-hidden="true" />
            <button
              v-else
              :title="calendarMap[iso]?.keterangan || (isLibur(iso) ? 'Libur' : 'Masuk')"
              :aria-pressed="isLibur(iso) ? 'true' : 'false'"
              :aria-label="`${iso} — ${isLibur(iso) ? 'Libur' : 'Masuk'}`"
              class="flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-lg border text-sm transition-colors"
              :class="isLibur(iso)
                ? 'border-rose-200 bg-rose-50 font-semibold text-rose-600 hover:bg-rose-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50'"
              @click="toggle(iso)"
            >
              <span class="tnum">{{ Number(iso.slice(8, 10)) }}</span>
              <span v-if="isLibur(iso)" class="mt-0.5 text-[9px] font-semibold uppercase tracking-wide">Libur</span>
            </button>
          </template>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-200" aria-hidden="true" /> Libur
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-3 w-3 rounded bg-white ring-1 ring-slate-200" aria-hidden="true" /> Masuk
          </span>
          <span class="ml-auto italic text-slate-400">Akhir pekan otomatis libur (dapat diubah).</span>
        </div>
      </template>
    </AppCard>

    <AppModal v-model="showModal" title="Tandai Hari Libur" :subtitle="targetLabel()" max-width="max-w-sm">
      <AppInput
        v-model="keteranganLibur"
        label="Keterangan (opsional)"
        placeholder="Misal: Libur nasional, rapat, dll."
        @keyup.enter="simpanLibur"
      />
      <template #footer>
        <AppButton variant="secondary" @click="showModal = false">Batal</AppButton>
        <AppButton @click="simpanLibur">Simpan Libur</AppButton>
      </template>
    </AppModal>
  </div>
</template>
