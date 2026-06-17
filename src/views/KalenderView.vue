<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { daysInMonth, toISODate, isWeekend, namaBulan } from '@/lib/dates'

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const calendarMap = ref({}) // date -> { status, keterangan }
const loading = ref(false)

const showModal = ref(false)
const targetIso = ref(null)
const keteranganLibur = ref('')

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

// Sel kalender termasuk offset awal bulan agar grid rapi.
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

async function toggle(iso) {
  if (!iso) return
  const sekarangLibur = isLibur(iso)
  const baru = sekarangLibur ? 'Masuk' : 'Libur'

  if (baru === 'Libur') {
    targetIso.value = iso
    keteranganLibur.value = ''
    showModal.value = true
    return
  }

  await prosesSimpan(iso, baru, null)
}

async function simpanLibur() {
  await prosesSimpan(targetIso.value, 'Libur', keteranganLibur.value)
  showModal.value = false
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
  <div>
    <PageHeader title="Kalender Akademik" subtitle="Klik tanggal untuk mengubah Masuk / Libur" />

    <div class="card mx-auto max-w-2xl">
      <div class="mb-4 flex items-center justify-between">
        <button class="rounded-lg p-2 hover:bg-gray-100" @click="prevMonth"><ChevronLeft class="h-5 w-5" /></button>
        <h3 class="text-base font-semibold text-gray-800">{{ namaBulan(month) }} {{ year }}</h3>
        <button class="rounded-lg p-2 hover:bg-gray-100" @click="nextMonth"><ChevronRight class="h-5 w-5" /></button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
        <div v-for="h in HARI" :key="h" class="py-1">{{ h }}</div>
      </div>
      <div class="mt-1 grid grid-cols-7 gap-1">
        <template v-for="(iso, i) in cells" :key="i">
          <div v-if="!iso" />
          <button
            v-else
            :title="calendarMap[iso]?.keterangan || ''"
            class="flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition"
            :class="isLibur(iso)
              ? 'border-rose-200 bg-rose-50 text-rose-600 font-semibold hover:bg-rose-100'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-primary-accent'"
            @click="toggle(iso)"
          >
            {{ Number(iso.slice(8, 10)) }}
            <span v-if="isLibur(iso)" class="mt-0.5 text-[9px] uppercase">Libur</span>
          </button>
        </template>
      </div>

      <div class="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-200" /> Libur</span>
        <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-white ring-1 ring-gray-200" /> Masuk</span>
        <span class="ml-auto italic">Akhir pekan otomatis Libur (bisa di-override).</span>
      </div>
    </div>

    <!-- Modal Input Keterangan Libur -->
    <BaseModal v-model="showModal" title="Keterangan Libur" max-width="max-w-sm">
      <div class="space-y-3">
        <p class="text-sm text-gray-600">
          Masukkan keterangan libur untuk tanggal <strong>{{ targetIso }}</strong> (opsional):
        </p>
        <input 
          v-model="keteranganLibur" 
          type="text" 
          class="input-field" 
          placeholder="Misal: Libur Nasional, Rapat, dll." 
          @keyup.enter="simpanLibur"
        />
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showModal = false">Batal</button>
        <button class="btn-primary" @click="simpanLibur">Simpan Libur</button>
      </template>
    </BaseModal>
  </div>
</template>
