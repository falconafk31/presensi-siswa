<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { toast } from 'vue-sonner'
import { logActivity } from '@/lib/activityLog'
import { Users, Search, Plus, Trash2, ScanLine, X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import {
  AppPageHeader, AppCard, AppInput, AppTable, AppBadge,
  AppConfirmDialog, AppEmptyState, AppSkeleton,
  AppButton, AppPagination,
} from '@/components/ui'

const router = useRouter()
const loading = ref(true)

const visits = ref([])
const students = ref([])

const todayStr = new Date().toISOString().split('T')[0]
const tanggalKunjungan = ref(todayStr)
const searchSiswa = ref('')
const selectedNisn = ref(null)

const saving = ref(false)
const showDeleteConfirm = ref(false)
const visitToDelete = ref(null)
const deleting = ref(false)

const itemsPerPage = 20
const currentPage = ref(1)

const filteredStudents = computed(() => {
  if (!searchSiswa.value) return []
  const q = searchSiswa.value.toLowerCase()
  return students.value
    .filter((s) => s.nama.toLowerCase().includes(q) || (s.kelas || '').toLowerCase().includes(q))
    .slice(0, 5)
})

function selectStudent(s) {
  selectedNisn.value = s.nisn
  searchSiswa.value = `${s.nama} (${s.kelas})`
}

function clearSelection() {
  selectedNisn.value = null
  searchSiswa.value = ''
}

async function fetchMaster() {
  const { data } = await supabase.from('students').select('nisn, nama, kelas').eq('active', true).order('nama')
  students.value = data || []
}

async function fetchVisits() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('library_visits')
      .select('id, tanggal, created_at, students(nama, kelas)')
      .eq('tanggal', tanggalKunjungan.value)
      .order('created_at', { ascending: false })

    if (error) throw error
    visits.value = data || []
  } catch {
    toast.error('Gagal memuat data kunjungan')
  } finally {
    loading.value = false
  }
}

watch(tanggalKunjungan, () => {
  currentPage.value = 1
  fetchVisits()
})

const paginatedVisits = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return visits.value.slice(start, start + itemsPerPage)
})

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function formatDateID(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

async function catatKunjungan() {
  if (!selectedNisn.value) {
    toast.error('Pilih siswa terlebih dahulu')
    return
  }

  saving.value = true
  try {
    const { error } = await supabase
      .from('library_visits')
      .insert({ student_nisn: selectedNisn.value, tanggal: tanggalKunjungan.value })

    if (error) throw error

    toast.success('Kunjungan berhasil dicatat')
    logActivity({ aksi: 'catat_kunjungan_perpus', tabel_terkait: 'library_visits', detail: { nisn: selectedNisn.value } })

    clearSelection()
    await fetchVisits()
  } catch (e) {
    toast.error('Gagal mencatat: ' + e.message)
  } finally {
    saving.value = false
  }
}

function confirmHapus(v) {
  visitToDelete.value = v
  showDeleteConfirm.value = true
}

async function hapusKunjungan() {
  if (!visitToDelete.value) return
  deleting.value = true
  try {
    const { error } = await supabase.from('library_visits').delete().eq('id', visitToDelete.value.id)
    if (error) throw error
    toast.success('Rekam kunjungan dihapus')
    showDeleteConfirm.value = false
    visitToDelete.value = null
    await fetchVisits()
  } catch {
    toast.error('Gagal menghapus')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await fetchMaster()
  await fetchVisits()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader
      title="Data Pengunjung"
      subtitle="Pencatatan kunjungan perpustakaan harian"
    >
      <template #actions>
        <AppButton variant="library" @click="router.push({ name: 'scan-qr' })">
          <template #icon><ScanLine class="h-4 w-4" aria-hidden="true" /></template>
          Buka Scanner QR
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Input panel -->
      <AppCard title="Catat Pengunjung" subtitle="Manual — atau gunakan scanner QR">
        <div class="flex flex-col gap-3.5">
          <AppInput v-model="tanggalKunjungan" type="date" label="Tanggal kunjungan" :max="todayStr" />

          <div class="relative">
            <label class="input-label" for="kunjungan-siswa">Cari siswa</label>
            <div class="relative">
              <input
                id="kunjungan-siswa"
                v-model="searchSiswa"
                type="text"
                placeholder="Ketik nama atau kelas…"
                class="input-field pl-9"
                autocomplete="off"
                role="combobox"
                @input="selectedNisn = null"
              />
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <button v-if="searchSiswa" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Hapus pencarian" @click="clearSelection">
                <X class="h-4 w-4" />
              </button>
            </div>

            <ul
              v-if="searchSiswa && !selectedNisn && filteredStudents.length"
              class="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-modal"
              role="listbox"
            >
              <li v-for="s in filteredStudents" :key="s.nisn">
                <button class="dropdown-item !min-h-[3rem] flex-col !items-start !gap-0.5" role="option" @click="selectStudent(s)">
                  <span class="font-medium text-slate-800">{{ s.nama }}</span>
                  <span class="text-xs text-slate-400">Kelas {{ s.kelas }} · {{ s.nisn }}</span>
                </button>
              </li>
            </ul>
            <p v-else-if="searchSiswa && !selectedNisn" class="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-center text-[13px] text-slate-500 shadow-modal">
              Tidak ada siswa yang cocok.
            </p>
          </div>

          <AppButton variant="library" block :loading="saving" :disabled="!selectedNisn" @click="catatKunjungan">
            <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
            {{ saving ? 'Menyimpan…' : 'Catat Kunjungan' }}
          </AppButton>
        </div>
      </AppCard>

      <!-- History panel -->
      <AppCard
        class="lg:col-span-2"
        title="Daftar Pengunjung"
        :subtitle="formatDateID(tanggalKunjungan)"
        :padded="false"
      >
        <template #actions>
          <AppBadge :label="`${visits.length} orang`" tone="library" :icon="Users" />
        </template>

        <div v-if="loading" class="p-4">
          <AppSkeleton type="table" :rows="5" />
        </div>
        <div v-else-if="!visits.length" class="p-4">
          <AppEmptyState
            title="Belum ada kunjungan"
            description="Belum ada kunjungan yang dicatat pada tanggal ini."
            :icon="Users"
          >
            <template #action>
              <AppButton size="sm" variant="library" @click="router.push({ name: 'scan-qr' })">
                <template #icon><ScanLine class="h-4 w-4" aria-hidden="true" /></template>
                Scan QR Pengunjung
              </AppButton>
            </template>
          </AppEmptyState>
        </div>
        <AppTable v-else caption="Daftar pengunjung perpustakaan">
          <thead>
            <tr>
              <th class="w-12 !text-center">No</th>
              <th>Waktu</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th class="!text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in paginatedVisits" :key="v.id">
              <td class="!text-center text-slate-400">{{ (currentPage - 1) * itemsPerPage + i + 1 }}</td>
              <td class="font-medium tnum">{{ formatTime(v.created_at) }}</td>
              <td class="cell-main">{{ v.students?.nama }}</td>
              <td>{{ v.students?.kelas }}</td>
              <td class="!text-right">
                <button class="btn-icon !h-8 !w-8 hover:!bg-rose-50 hover:!text-rose-600" title="Hapus rekam" :aria-label="`Hapus kunjungan ${v.students?.nama}`" @click="confirmHapus(v)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
          <template #footer>
            <AppPagination v-model="currentPage" :total-items="visits.length" :items-per-page="itemsPerPage" />
          </template>
        </AppTable>
      </AppCard>
    </div>

    <AppConfirmDialog
      v-model="showDeleteConfirm"
      title="Hapus Rekam Kunjungan?"
      tone="danger"
      confirm-label="Hapus"
      :loading="deleting"
      @confirm="hapusKunjungan"
    >
      <template v-if="visitToDelete">
        Kunjungan <strong>{{ visitToDelete.students?.nama }}</strong> pada
        {{ formatTime(visitToDelete.created_at) }} akan dihapus.
      </template>
    </AppConfirmDialog>
  </div>
</template>
