<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Save, CalendarOff, Loader2, CheckCheck, TriangleAlert, Search } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { logActivity } from '@/lib/activityLog'
import { todayISO, formatTanggalPanjang, isWeekend } from '@/lib/dates'
import { STATUS_PRESENSI } from '@/config/constants'
import { useSettingsStore } from '@/stores/settings'
import BaseModal from '@/components/BaseModal.vue'

const auth = useAuthStore()
const settingsStore = useSettingsStore()

const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const kelas = ref(auth.isAdmin ? (daftarKelas.value[0] || '1') : (auth.kelas || daftarKelas.value[0] || '1'))
const students = ref([])
const presensi = ref({}) // nisn -> status
const tanggal = ref(todayISO())
const isSubmitted = ref(false)

watch(daftarKelas, (newDaftar) => {
  if (auth.isAdmin && newDaftar.length > 0 && !newDaftar.includes(kelas.value)) {
    kelas.value = newDaftar[0]
  }
}, { immediate: true })

// Kunci kelas agar tidak bisa diretas lewat frontend untuk Guru
watch(kelas, (newKelas) => {
  if (!auth.isAdmin && auth.kelas && newKelas !== auth.kelas) {
    kelas.value = auth.kelas
  }
})
const hariLibur = ref(false)
const loading = ref(false)
const saving = ref(false)
const showConfirmModal = ref(false)

const segColor = {
  Hadir: 'bg-emerald-600',
  Izin: 'bg-sky-600',
  Sakit: 'bg-amber-500',
  Alfa: 'bg-rose-500',
}

const ringkasan = computed(() => {
  const r = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
  for (const s of students.value) r[presensi.value[s.nisn]] = (r[presensi.value[s.nisn]] || 0) + 1
  return r
})

const searchSiswa = ref('')
const filteredStudents = computed(() => {
  if (!searchSiswa.value.trim()) return students.value
  const q = searchSiswa.value.toLowerCase()
  return students.value.filter(s => s.nama.toLowerCase().includes(q) || s.nisn.includes(q))
})

async function cekKalender() {
  const { data } = await supabase
    .from('academic_calendar')
    .select('status')
    .eq('date', tanggal.value)
    .maybeSingle()
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

    // Default semua 'Hadir', lalu timpa dengan data yang sudah tersimpan.
    const map = {}
    for (const s of students.value) map[s.nisn] = 'Hadir'

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('student_nisn, status')
      .eq('date', tanggal.value)
      .eq('kelas', kelas.value)
    for (const l of logs || []) map[l.student_nisn] = l.status
    presensi.value = map

    const { data: act } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('aksi', 'input_presensi')
      .eq('record_id', `${tanggal.value}:${kelas.value}`)
      .limit(1)
    isSubmitted.value = (act && act.length > 0)
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
}

function triggerSimpan() {
  if (isSubmitted.value) {
    showConfirmModal.value = true
  } else {
    simpan()
  }
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
    const exceptions = students.value
      .map((s) => ({
        date: tanggal.value,
        student_nisn: s.nisn,
        status: presensi.value[s.nisn] || 'Hadir',
        kelas: kelas.value,
        guru_input: auth.user?.nama || null,
      }))
      .filter((r) => r.status !== 'Hadir')

    // Hapus semua log kelas ini di tanggal ini agar jika diubah ke Hadir, record lamanya hilang
    const { error: delErr } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('date', tanggal.value)
      .eq('kelas', kelas.value)
    if (delErr) throw delErr

    if (exceptions.length > 0) {
      const { error: insErr } = await supabase
        .from('attendance_logs')
        .insert(exceptions)
      if (insErr) throw insErr
    }

    await logActivity({
      aksi: 'input_presensi',
      tabel_terkait: 'attendance_logs',
      record_id: `${tanggal.value}:${kelas.value}`,
      detail: { tanggal: tanggal.value, kelas: kelas.value, jumlah_siswa: students.value.length, ringkasan: ringkasan.value },
    })
    isSubmitted.value = true
    toast.success(`Presensi kelas ${kelas.value} tersimpan (hanya mencatat pengecualian)`)
  } catch (e) {
    toast.error('Gagal menyimpan: ' + e.message)
  } finally {
    saving.value = false
  }
}

watch([tanggal, kelas], loadStudents)
onMounted(loadStudents)
</script>

<template>
  <div>
    <PageHeader title="Input Presensi" :subtitle="formatTanggalPanjang(tanggal)" />

    <div class="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal</label>
        <input v-model="tanggal" type="date" class="input-field" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Kelas</label>
        <select v-model="kelas" class="input-field" :disabled="!auth.isAdmin">
          <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
        </select>
      </div>
      <div class="flex items-end">
        <!-- Spasi kosong karena tombol simpan dipindah ke bawah -->
      </div>
    </div>

    <div v-if="hariLibur" class="card mb-4 flex items-center gap-3 border border-rose-200 bg-rose-50">
      <CalendarOff class="h-6 w-6 text-rose-500" />
      <div>
        <p class="font-semibold text-rose-700">Hari Libur</p>
        <p class="text-sm text-rose-600">Tanggal ini ditandai Libur di kalender akademik. Input dinonaktifkan.</p>
      </div>
    </div>
    
    <div v-else-if="isSubmitted" class="card mb-4 flex items-center gap-3 border border-emerald-200 bg-emerald-50">
      <CheckCheck class="h-6 w-6 text-emerald-600" />
      <div>
        <p class="font-semibold text-emerald-800">Sudah Presensi</p>
        <p class="text-sm text-emerald-700">Kelas ini sudah di-submit absensinya pada tanggal ini.</p>
      </div>
    </div>

    <div v-else-if="!loading && students.length > 0" class="card mb-4 flex items-center gap-3 border border-amber-200 bg-amber-50">
      <div class="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
      <div>
        <p class="font-semibold text-amber-800">Belum Presensi</p>
        <p class="text-sm text-amber-700">Silakan cek kehadiran dan klik tombol Simpan Presensi di bagian bawah.</p>
      </div>
    </div>

    <template v-if="!hariLibur">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs text-gray-500">Tandai semua:</span>
        <button
          v-for="s in STATUS_PRESENSI"
          :key="s.code"
          class="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          @click="setSemua(s.code)"
        >
          {{ s.code }}
        </button>
        <div class="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <CheckCheck class="h-4 w-4 text-emerald-600" />
          H {{ ringkasan.Hadir }} · I {{ ringkasan.Izin }} · S {{ ringkasan.Sakit }} · A {{ ringkasan.Alfa }}
        </div>
      </div>

      <div v-if="loading" class="card text-center text-sm text-gray-400">Memuat siswa...</div>
      <div v-else-if="!students.length" class="card text-center text-sm text-gray-400">
        Belum ada siswa aktif di kelas {{ kelas }}.
      </div>

      <template v-else>
        <!-- Search siswa -->
        <div class="relative mb-3">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input v-model="searchSiswa" class="input-field pl-9" placeholder="Cari nama siswa..." />
        </div>

        <div v-if="!filteredStudents.length" class="card text-center text-sm text-gray-400">
          Tidak ditemukan siswa dengan nama "{{ searchSiswa }}".
        </div>

      <div v-else class="space-y-2">
        <div
          v-for="(s, i) in filteredStudents"
          :key="s.nisn"
          class="card flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              :class="s.jk === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'"
              class="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0"
            >
              {{ s.nama.charAt(0) }}
            </div>
            <div>
              <p class="font-medium text-gray-800">{{ s.nama }}</p>
              <p class="text-xs text-gray-400">{{ s.nisn }} · {{ s.jk === 'L' ? 'Laki-laki' : 'Perempuan' }}</p>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-1 sm:flex">
            <button
              v-for="st in STATUS_PRESENSI"
              :key="st.code"
              class="rounded-lg px-3 py-2 text-sm font-semibold transition"
              :class="presensi[s.nisn] === st.code
                ? `${segColor[st.code]} text-white shadow-sm`
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
              @click="presensi[s.nisn] = st.code"
            >
              {{ st.short }}
            </button>
          </div>
        </div>
      </div>
      </template>
    </template>

    <!-- Sticky Footer for Save Button -->
    <div v-if="!hariLibur && students.length" class="sticky bottom-0 z-10 -mx-4 -mb-4 mt-8 border-t border-gray-200 bg-white/90 p-4 backdrop-blur-md sm:-mx-6 sm:-mb-6 sm:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-gray-600">Pastikan semua kehadiran sudah sesuai sebelum menyimpan.</p>
        <button
          class="btn-primary px-8 py-3 text-base shadow-emerald-500/30 shadow-lg"
          :disabled="saving"
          @click="triggerSimpan"
        >
          <Save v-if="!saving" class="h-5 w-5" />
          <Loader2 v-else class="h-5 w-5 animate-spin" />
          {{ saving ? 'Menyimpan...' : (isSubmitted ? 'Perbarui Presensi' : 'Simpan Presensi') }}
        </button>
      </div>
    </div>

    <!-- Confirm Update Modal -->
    <BaseModal v-model="showConfirmModal" title="Perbarui Presensi">
      <div class="p-6 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <TriangleAlert class="h-6 w-6 text-amber-600" />
        </div>
        <h3 class="mb-2 text-lg font-bold text-gray-800">Perbarui Data Presensi?</h3>
        <p class="text-sm text-gray-600">
          Data presensi untuk kelas <strong>{{ kelas }}</strong> pada tanggal ini sudah disubmit sebelumnya. Apakah Anda yakin ingin memperbarui data dengan inputan terbaru?
        </p>
      </div>
      <div class="flex items-center gap-3 border-t border-gray-100 p-4 bg-gray-50/50">
        <button class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100" @click="showConfirmModal = false">
          Batal
        </button>
        <button class="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600" :disabled="saving" @click="simpan">
          Ya, Perbarui
        </button>
      </div>
    </BaseModal>
  </div>
</template>
