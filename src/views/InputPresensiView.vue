<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { toast } from 'vue-sonner'
import { Save, Search, Users, CheckCheck, UserX } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { logActivity } from '@/lib/activityLog'
import { todayISO, formatTanggalPanjang, isWeekend } from '@/lib/dates'
import { ATTENDANCE_STATUS } from '@/config/designSystem'
import { useSettingsStore } from '@/stores/settings'
import {
  AppPageHeader, AppFilterBar, AppInput, AppSelect, AppAlert,
  AppSkeleton, AppEmptyState, AppSegmentedControl, AppButton,
  AppConfirmDialog, AppBadge,
} from '@/components/ui'

const auth = useAuthStore()
const settingsStore = useSettingsStore()

const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const kelas = ref(auth.isAdmin ? (daftarKelas.value[0] || '1') : (auth.kelas || daftarKelas.value[0] || '1'))
const students = ref([])
const presensi = ref({}) // nisn -> status
const presensiBaseline = ref({}) // snapshot after load/save for dirty tracking
const tanggal = ref(todayISO())
const isSubmitted = ref(false)

watch(daftarKelas, (newDaftar) => {
  if (auth.isAdmin && newDaftar.length > 0 && !newDaftar.includes(kelas.value)) {
    kelas.value = newDaftar[0]
  }
}, { immediate: true })

// Lock kelas for Guru role (frontend guard; RLS enforces server-side)
watch(kelas, (newKelas) => {
  if (!auth.isAdmin && auth.kelas && newKelas !== auth.kelas) kelas.value = auth.kelas
})

const hariLibur = ref(false)
const loading = ref(false)
const saving = ref(false)
const showConfirmModal = ref(false)

// Konfirmasi tinggalkan halaman (dirty route guard) — terpisah dari showConfirmModal.
const showLeaveConfirm = ref(false)
let pendingLeaveResolve = null

const statusOptions = computed(() => ATTENDANCE_STATUS.map((s) => ({
  value: s.code, label: s.code, short: s.code, tone: s.tone,
})))

// Tint kartu siswa mengikuti status terpilih — warna EXACT dari tabel Rekap:
// Hadir #047857 (emerald-700) · Izin #0369a1 (sky-700) · Sakit #d97706 (amber-600) · Alfa #be123c (rose-700)
const statusCardTone = {
  Hadir: '!border-emerald-700/40 !bg-emerald-50/60',
  Izin: '!border-sky-700/40 !bg-sky-50/60',
  Sakit: '!border-amber-600/40 !bg-amber-50/60',
  Alfa: '!border-rose-700/40 !bg-rose-50/60',
}

const ringkasan = computed(() => {
  const r = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
  for (const s of students.value) {
    const st = presensi.value[s.nisn] || 'Hadir'
    r[st] = (r[st] || 0) + 1
  }
  return r
})

// Unsaved-changes tracking
const isDirty = computed(() => {
  const a = presensi.value
  const b = presensiBaseline.value
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) if ((a[k] || 'Hadir') !== (b[k] || 'Hadir')) return true
  return false
})
const changedCount = computed(() => {
  let n = 0
  for (const s of students.value) {
    if ((presensi.value[s.nisn] || 'Hadir') !== (presensiBaseline.value[s.nisn] || 'Hadir')) n++
  }
  return n
})

const searchSiswa = ref('')
const filteredStudents = computed(() => {
  if (!searchSiswa.value.trim()) return students.value
  const q = searchSiswa.value.toLowerCase()
  return students.value.filter((s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q))
})

// Warn on browser/tab close with unsaved changes
function onBeforeUnload(e) {
  if (isDirty.value && !saving.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
// SPA route guard: dirty -> tampilkan AppConfirmDialog dan TUNGGU keputusan user
// via Promise (kompatibel dengan async guard Vue Router 4).
onBeforeRouteLeave(() => {
  if (!isDirty.value || saving.value) return true

  // Jika masih ada keputusan menggantung (user klik menu lain saat dialog terbuka),
  // batalkan navigasi sebelumnya dulu agar tidak ada promise yang menggantung.
  if (pendingLeaveResolve) {
    pendingLeaveResolve(false)
    pendingLeaveResolve = null
  }
  showLeaveConfirm.value = true
  return new Promise((resolve) => { pendingLeaveResolve = resolve })
})

function resolveLeave(allowed) {
  const resolve = pendingLeaveResolve
  pendingLeaveResolve = null
  showLeaveConfirm.value = false
  resolve?.(allowed)
}

// "Tinggalkan": HANYA mengizinkan navigasi — tidak pernah memanggil simpan()/logActivity.
function confirmLeave() { resolveLeave(true) }

// ESC / klik overlay / tombol "Tetap di Halaman" menutup dialog via v-model:
// watcher ini menjamin promise SELALU di-resolve(false) (tidak ada promise menggantung).
watch(showLeaveConfirm, (open) => {
  if (!open && pendingLeaveResolve) {
    pendingLeaveResolve(false)
    pendingLeaveResolve = null
  }
})

onBeforeUnmount(() => {
  if (pendingLeaveResolve) {
    pendingLeaveResolve(false)
    pendingLeaveResolve = null
  }
})

async function cekKalender() {
  const { data } = await supabase.from('academic_calendar').select('status').eq('date', tanggal.value).maybeSingle()
  hariLibur.value = data?.status === 'Libur' || isWeekend(tanggal.value)
}

async function loadStudents() {
  loading.value = true
  try {
    await cekKalender()
    const { data: siswa, error } = await supabase
      .from('students')
      .select('nisn, nama, jk, kelas')
      .eq('kelas', kelas.value)
      .eq('active', true)
      .order('nama')
    if (error) throw error
    students.value = siswa || []

    const map = {}
    for (const s of students.value) map[s.nisn] = 'Hadir'

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('student_nisn, status')
      .eq('date', tanggal.value)
      .eq('kelas', kelas.value)
    for (const l of logs || []) map[l.student_nisn] = l.status
    presensi.value = map
    presensiBaseline.value = { ...map }

    const [{ data: act }, { data: attLog }] = await Promise.all([
      supabase.from('activity_logs').select('id').eq('aksi', 'input_presensi').eq('record_id', `${tanggal.value}:${kelas.value}`).limit(1),
      supabase.from('attendance_logs').select('id').eq('date', tanggal.value).eq('kelas', kelas.value).limit(1),
    ])
    isSubmitted.value = (act && act.length > 0) || (attLog && attLog.length > 0)
  } catch (e) {
    toast.error('Gagal memuat siswa: ' + e.message)
  } finally {
    loading.value = false
  }
}

function setSemua(status) {
  const map = { ...presensi.value }
  for (const s of students.value) map[s.nisn] = status
  presensi.value = map
  toast.success(`Semua siswa ditandai ${status}`)
}

function setStatus(nisn, status) {
  presensi.value = { ...presensi.value, [nisn]: status }
}

function triggerSimpan() {
  if (isSubmitted.value) showConfirmModal.value = true
  else simpan()
}

async function simpan() {
  showConfirmModal.value = false
  if (hariLibur.value) return
  if (!students.value.length) {
    toast.error('Tidak ada siswa untuk disimpan')
    return
  }
  saving.value = true
  try {
    const rows = students.value.map((s) => ({
      date: tanggal.value,
      student_nisn: s.nisn,
      status: presensi.value[s.nisn] || 'Hadir',
      kelas: kelas.value,
      guru_input: auth.user?.nama || null,
    }))

    const { error: delErr } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('date', tanggal.value)
      .eq('kelas', kelas.value)
    if (delErr) throw delErr

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('attendance_logs').insert(rows)
      if (insErr) throw insErr
    }

    await logActivity({
      aksi: 'input_presensi',
      tabel_terkait: 'attendance_logs',
      record_id: `${tanggal.value}:${kelas.value}`,
      detail: { tanggal: tanggal.value, kelas: kelas.value, jumlah_siswa: students.value.length, ringkasan: ringkasan.value },
    })
    isSubmitted.value = true
    presensiBaseline.value = { ...presensi.value }
    toast.success(`Presensi kelas ${kelas.value} tersimpan — H:${ringkasan.value.Hadir} I:${ringkasan.value.Izin} S:${ringkasan.value.Sakit} A:${ringkasan.value.Alfa}`)
  } catch (e) {
    toast.error('Gagal menyimpan: ' + e.message)
  } finally {
    saving.value = false
  }
}

watch([tanggal, kelas], loadStudents)
onMounted(() => {
  loadStudents()
  window.addEventListener('beforeunload', onBeforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader title="Input Presensi" :subtitle="formatTanggalPanjang(tanggal)">
      <template #actions>
        <AppBadge v-if="!loading && !hariLibur && students.length" :label="isDirty ? `${changedCount} perubahan belum disimpan` : isSubmitted ? 'Tersimpan' : 'Belum ada perubahan'" :tone="isDirty ? 'warning' : isSubmitted ? 'success' : 'neutral'" dot />
      </template>
    </AppPageHeader>

    <!-- Step 1: pilih tanggal & kelas -->
    <AppFilterBar columns="sm:grid-cols-2 lg:grid-cols-3">
      <AppInput v-model="tanggal" type="date" label="Tanggal" :max="todayISO()" />
      <AppSelect v-model="kelas" label="Kelas" :disabled="!auth.isAdmin">
        <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
      </AppSelect>
      <AppInput v-model="searchSiswa" label="Cari siswa" placeholder="Nama atau NISN…">
        <template #leading><Search class="h-4 w-4" aria-hidden="true" /></template>
      </AppInput>
    </AppFilterBar>

    <!-- Status banners -->
    <AppAlert v-if="hariLibur" tone="danger" title="Hari libur">
      Tanggal ini ditandai libur di kalender akademik. Input presensi dinonaktifkan.
    </AppAlert>
    <AppAlert v-else-if="!loading && isSubmitted && !isDirty" tone="success" title="Sudah presensi">
      Kelas {{ kelas }} sudah mengisi presensi pada tanggal ini. Perubahan akan menimpa data sebelumnya.
    </AppAlert>
    <AppAlert v-else-if="!loading && !isSubmitted && students.length > 0" tone="warning" title="Belum presensi">
      Tandai kehadiran setiap siswa, lalu tekan <strong>Simpan Presensi</strong> di bagian bawah.
    </AppAlert>

    <template v-if="!hariLibur">
      <!-- Step 2: bulk actions + live summary -->
      <div v-if="!loading && students.length > 0" class="card-flat flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="secondary mr-1 font-medium">Tandai semua:</span>
          <button
            v-for="s in statusOptions"
            :key="s.value"
            type="button"
            class="chip-tab !min-h-[2.25rem] !px-3 !py-1.5 !text-[13px]"
            :aria-label="`Tandai semua ${s.label}`"
            @click="setSemua(s.value)"
          >
            {{ s.label }}
          </button>
        </div>
        <div class="flex items-center gap-2 border-t border-slate-100 pt-2.5 sm:ml-auto sm:border-0 sm:pt-0" aria-live="polite">
          <CheckCheck class="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <p class="text-[13px] font-medium text-slate-600 tnum">
            H <span class="font-bold text-emerald-700">{{ ringkasan.Hadir }}</span>
            · I <span class="font-bold text-sky-700">{{ ringkasan.Izin }}</span>
            · S <span class="font-bold text-amber-600">{{ ringkasan.Sakit }}</span>
            · A <span class="font-bold text-rose-700">{{ ringkasan.Alfa }}</span>
          </p>
        </div>
      </div>

      <!-- Loading -->
      <AppSkeleton v-if="loading" type="card" :rows="5" />

      <!-- Empty: no students -->
      <AppEmptyState
        v-else-if="!students.length"
        title="Belum ada siswa aktif"
        :description="`Tidak ada siswa aktif di kelas ${kelas}. Tambahkan data siswa terlebih dahulu.`"
        :icon="Users"
      >
        <template v-if="auth.isAdmin" #action>
          <AppButton size="sm" :to="{ name: 'siswa' }">Kelola Data Siswa</AppButton>
        </template>
      </AppEmptyState>

      <!-- Empty: search no match -->
      <AppEmptyState
        v-else-if="!filteredStudents.length"
        title="Siswa tidak ditemukan"
        :description="`Tidak ada hasil untuk “${searchSiswa}”. Coba kata kunci lain.`"
        :icon="Search"
      >
        <template #action>
          <AppButton size="sm" variant="secondary" @click="searchSiswa = ''">Hapus Pencarian</AppButton>
        </template>
      </AppEmptyState>

      <!-- Step 3: student list with segmented status -->
      <ol v-else class="flex flex-col gap-2" aria-label="Daftar siswa">
        <li
          v-for="(s, i) in filteredStudents"
          :key="s.nisn"
          class="card-flat flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-3.5"
          :class="[
            (presensi[s.nisn] || 'Hadir') !== (presensiBaseline[s.nisn] || 'Hadir') ? 'ring-1 ring-amber-300' : '',
            statusCardTone[presensi[s.nisn] || 'Hadir'] || '',
          ]"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span class="hidden w-6 shrink-0 text-right text-xs text-slate-300 tnum sm:inline" aria-hidden="true">{{ i + 1 }}</span>
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :class="s.jk === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'"
              aria-hidden="true"
            >
              {{ (s.nama || '?').charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-900">{{ s.nama }}</p>
              <p class="truncate text-xs text-slate-400 tnum">{{ s.nisn }} · {{ s.jk === 'L' ? 'Laki-laki' : 'Perempuan' }}</p>
            </div>
          </div>
          <AppSegmentedControl
            :model-value="presensi[s.nisn] || 'Hadir'"
            :options="statusOptions"
            :ariaLabel="`Status kehadiran ${s.nama}`"
            @update:model-value="setStatus(s.nisn, $event)"
          />
        </li>
      </ol>

      <p v-if="!loading && students.length" class="caption flex items-center gap-1.5">
        <UserX class="h-3.5 w-3.5" aria-hidden="true" />
        {{ filteredStudents.length }} dari {{ students.length }} siswa ditampilkan
        <span v-if="isDirty" class="font-medium text-amber-600">· {{ changedCount }} belum disimpan</span>
      </p>
    </template>

    <!-- Sticky save bar -->
    <div
      v-if="!hariLibur && students.length"
      class="sticky bottom-[calc(69px_+_env(safe-area-inset-bottom,0px))] z-10 -mx-4 mb-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-5 sm:px-5 lg:bottom-2 lg:mx-0 lg:mb-0 lg:rounded-xl lg:border lg:px-5 lg:shadow-card"
    >
      <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p class="hidden text-[13px] text-slate-500 sm:block">
          Pastikan semua kehadiran sudah sesuai sebelum menyimpan.
        </p>
        <p class="text-[13px] font-medium text-slate-600 tnum sm:hidden" aria-live="polite">
          H {{ ringkasan.Hadir }} · I {{ ringkasan.Izin }} · S {{ ringkasan.Sakit }} · A {{ ringkasan.Alfa }}
        </p>
        <AppButton :loading="saving" size="lg" class="w-full sm:w-auto" @click="triggerSimpan">
          <template #icon><Save class="h-5 w-5" aria-hidden="true" /></template>
          {{ saving ? 'Menyimpan…' : isSubmitted ? 'Perbarui Presensi' : 'Simpan Presensi' }}
        </AppButton>
      </div>
    </div>

    <AppConfirmDialog
      v-model="showConfirmModal"
      title="Perbarui Data Presensi?"
      tone="warning"
      confirm-label="Ya, Perbarui"
      :loading="saving"
      @confirm="simpan"
    >
      Data presensi kelas <strong>{{ kelas }}</strong> pada tanggal ini sudah disubmit sebelumnya.
      Pembaruan akan menimpa data lama.
    </AppConfirmDialog>

    <!-- Konfirmasi tinggalkan halaman saat ada perubahan belum disimpan -->
    <AppConfirmDialog
      v-model="showLeaveConfirm"
      title="Tinggalkan halaman?"
      tone="warning"
      confirm-label="Tinggalkan"
      cancel-label="Tetap di Halaman"
      @confirm="confirmLeave"
    >
      Ada perubahan presensi yang belum disimpan. Jika Anda meninggalkan halaman, perubahan tersebut akan hilang.
    </AppConfirmDialog>
  </div>
</template>
