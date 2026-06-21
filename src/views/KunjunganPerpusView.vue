<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import { logActivity } from '@/lib/activityLog'
import { Users, Search, Plus, Trash2, CalendarDays, ScanLine } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)

const visits = ref([])
const students = ref([])

// Form
const todayStr = new Date().toISOString().split('T')[0]
const tanggalKunjungan = ref(todayStr)
const searchSiswa = ref('')
const selectedNisn = ref(null)

const saving = ref(false)

// Pagination
const itemsPerPage = 50
const currentPage = ref(1)

const filteredStudents = computed(() => {
  if (!searchSiswa.value) return []
  const q = searchSiswa.value.toLowerCase()
  return students.value
    .filter(s => s.nama.toLowerCase().includes(q) || s.kelas.toLowerCase().includes(q))
    .slice(0, 5) // Batasi hanya 5 hasil pencarian
})

function selectStudent(s) {
  selectedNisn.value = s.nisn
  searchSiswa.value = `${s.nama} (${s.kelas})`
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
  } catch (e) {
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

const totalPages = computed(() => Math.ceil(visits.value.length / itemsPerPage))

async function catatKunjungan() {
  if (!selectedNisn.value) {
    toast.error('Pilih siswa terlebih dahulu')
    return
  }

  saving.value = true
  try {
    const { error } = await supabase
      .from('library_visits')
      .insert({
        student_nisn: selectedNisn.value,
        tanggal: tanggalKunjungan.value
      })

    if (error) throw error

    toast.success('Kunjungan berhasil dicatat')
    logActivity({ aksi: 'catat_kunjungan_perpus', tabel_terkait: 'library_visits', detail: { nisn: selectedNisn.value } })
    
    // Reset form
    searchSiswa.value = ''
    selectedNisn.value = null
    
    await fetchVisits()
  } catch (e) {
    toast.error('Gagal mencatat: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function hapusKunjungan(id) {
  if (!confirm('Hapus rekam kunjungan ini?')) return
  
  try {
    const { error } = await supabase.from('library_visits').delete().eq('id', id)
    if (error) throw error
    toast.success('Berhasil dihapus')
    await fetchVisits()
  } catch(e) {
    toast.error('Gagal menghapus')
  }
}

onMounted(async () => {
  await fetchMaster()
  await fetchVisits()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Kunjungan Perpus" subtitle="Pencatatan data pengunjung perpustakaan harian">
      <template #actions>
        <button class="btn-primary flex items-center gap-2" @click="router.push({ name: 'scan-qr' })">
          <ScanLine class="w-4 h-4" /> Buka Scanner QR
        </button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Panel Input -->
      <div class="lg:col-span-1">
        <div class="card p-5">
          <h3 class="mb-4 font-semibold text-gray-800">Catat Pengunjung</h3>
          
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal Kunjungan</label>
              <input type="date" v-model="tanggalKunjungan" class="input-field" />
            </div>

            <div class="relative">
              <label class="mb-1 block text-xs font-medium text-gray-600">Cari Siswa</label>
              <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  v-model="searchSiswa" 
                  @input="selectedNisn = null"
                  placeholder="Ketik nama atau kelas..." 
                  class="input-field pl-9"
                />
              </div>

              <!-- Dropdown Search Siswa -->
              <div v-if="searchSiswa && !selectedNisn && filteredStudents.length" class="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
                <ul class="max-h-60 overflow-y-auto p-1 text-sm">
                  <li 
                    v-for="s in filteredStudents" 
                    :key="s.nisn"
                    @click="selectStudent(s)"
                    class="cursor-pointer rounded-lg px-3 py-2 hover:bg-emerald-50"
                  >
                    <div class="font-medium text-gray-800">{{ s.nama }}</div>
                    <div class="text-xs text-gray-500">Kelas {{ s.kelas }} • NISN: {{ s.nisn }}</div>
                  </li>
                </ul>
              </div>
              <div v-else-if="searchSiswa && !selectedNisn" class="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-center text-sm text-gray-500 shadow-lg">
                Tidak ada siswa yang cocok.
              </div>
            </div>

            <button 
              class="btn-primary w-full justify-center" 
              :disabled="saving || !selectedNisn"
              @click="catatKunjungan"
            >
              <Plus class="h-4 w-4" /> 
              {{ saving ? 'Menyimpan...' : 'Catat Kehadiran' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Panel Riwayat -->
      <div class="lg:col-span-2">
        <div class="card p-0">
          <div class="border-b border-gray-100 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="font-bold text-gray-800">Daftar Pengunjung</h3>
              <p class="text-sm text-gray-500">Menampilkan pengunjung pada {{ tanggalKunjungan }}</p>
            </div>
            <div class="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <Users class="h-4 w-4" />
              {{ visits.length }} Orang
            </div>
          </div>

          <div v-if="loading" class="flex justify-center p-8">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          </div>
          <div v-else-if="!visits.length" class="p-8 text-center text-gray-500">
            <CalendarDays class="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p>Belum ada kunjungan yang dicatat pada hari ini.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th class="px-5 py-3 font-medium">No</th>
                  <th class="px-5 py-3 font-medium">Waktu</th>
                  <th class="px-5 py-3 font-medium">Nama Siswa</th>
                  <th class="px-5 py-3 font-medium">Kelas</th>
                  <th class="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(v, i) in paginatedVisits" :key="v.id" class="hover:bg-gray-50/50">
                  <td class="px-5 py-3 text-gray-500">{{ (currentPage - 1) * itemsPerPage + i + 1 }}</td>
                  <td class="px-5 py-3 font-medium text-gray-700">
                    {{ new Date(v.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                  </td>
                  <td class="px-5 py-3 font-medium text-gray-800">{{ v.students?.nama }}</td>
                  <td class="px-5 py-3 text-gray-600">{{ v.students?.kelas }}</td>
                  <td class="px-5 py-3 text-right">
                    <button class="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" @click="hapusKunjungan(v.id)">
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <!-- Pagination Controls -->
            <div v-if="totalPages > 1" class="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
              <p class="text-xs text-gray-500">Halaman {{ currentPage }} dari {{ totalPages }}</p>
              <div class="flex items-center gap-2">
                <button 
                  class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  :disabled="currentPage === 1"
                  @click="currentPage--"
                >Prev</button>
                <button 
                  class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  :disabled="currentPage === totalPages"
                  @click="currentPage++"
                >Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
