<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Pencil, LogOut, Search, UserPlus, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { todayISO } from '@/lib/dates'
import { useSettingsStore } from '@/stores/settings'
import * as xlsx from 'xlsx'
import { FileUp } from 'lucide-vue-next'

const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])

const students = ref([])
const loading = ref(false)
const search = ref('')
const filterKelas = ref('')
const filterStatus = ref('aktif')

const showForm = ref(false)
const showMutasi = ref(false)
const saving = ref(false)
const editing = ref(false)

const emptyForm = () => ({
  id: null,
  nisn: '',
  nama: '',
  jk: 'L',
  kelas: daftarKelas.value[0] || '1',
  tanggal_masuk: todayISO(),
  keterangan: '',
})
const form = ref(emptyForm())

const showUpload = ref(false)
const uploadingExcel = ref(false)
const selectedFile = ref(null)

function openUpload() {
  selectedFile.value = null
  showUpload.value = true
}

function downloadTemplate() {
  const ws = xlsx.utils.json_to_sheet([
    { NISN: '1234567890', Nama: 'Fulan', JK: 'L', Kelas: '1A' }
  ])
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Template Siswa')
  xlsx.writeFile(wb, 'Template_Upload_Siswa.xlsx')
}

function onFileSelected(e) {
  selectedFile.value = e.target.files?.[0]
}

async function processUpload() {
  if (!selectedFile.value) return
  uploadingExcel.value = true
  try {
    const data = await selectedFile.value.arrayBuffer()
    const wb = xlsx.read(data)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(ws)
    
    if (!rows.length) throw new Error('File kosong atau format salah')

    const toInsert = rows.map(r => ({
      nisn: String(r.NISN || '').trim(),
      nama: String(r.Nama || '').trim(),
      jk: String(r.JK || 'L').trim().toUpperCase(),
      kelas: String(r.Kelas || '1').trim().toUpperCase(),
      status: 'aktif',
      active: true,
      tanggal_masuk: todayISO()
    })).filter(r => r.nisn && r.nama)

    if (!toInsert.length) throw new Error('Tidak ada data valid (NISN dan Nama wajib)')

    const { error } = await supabase.from('students').upsert(toInsert, { onConflict: 'nisn' })
    if (error) throw error

    toast.success(`${toInsert.length} siswa berhasil diupload`)
    showUpload.value = false
    await load()
  } catch(e) {
    toast.error('Gagal upload: ' + e.message)
  } finally {
    uploadingExcel.value = false
  }
}

const mutasiForm = ref({ id: null, nama: '', nisn: '', status: 'pindah', tanggal_keluar: todayISO(), keterangan: '' })

const statusColor = { aktif: 'green', lulus: 'sky', pindah: 'amber', keluar: 'rose' }

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return students.value.filter((s) => {
    const okSearch = !q || s.nama.toLowerCase().includes(q) || s.nisn.includes(q)
    const okKelas = !filterKelas.value || s.kelas === filterKelas.value
    const okStatus = !filterStatus.value || s.status === filterStatus.value
    return okSearch && okKelas && okStatus
  })
})

const itemsPerPage = 50
const currentPage = ref(1)

// Reset halaman ke 1 setiap kali filter berubah
watch([search, filterKelas, filterStatus], () => {
  currentPage.value = 1
})

const totalPages = computed(() => Math.ceil(filtered.value.length / itemsPerPage))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filtered.value.slice(start, start + itemsPerPage)
})

async function load() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('kelas')
      .order('nama')
    if (error) throw error
    students.value = data || []
  } catch (e) {
    toast.error('Gagal memuat: ' + e.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = false
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(s) {
  editing.value = true
  form.value = {
    id: s.id,
    nisn: s.nisn,
    nama: s.nama,
    jk: s.jk || 'L',
    kelas: s.kelas || daftarKelas.value[0] || '1',
    tanggal_masuk: s.tanggal_masuk || todayISO(),
    keterangan: s.keterangan || '',
  }
  showForm.value = true
}

async function save() {
  if (!form.value.nisn || !form.value.nama) {
    toast.error('NISN dan Nama wajib diisi')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      const { error } = await supabase
        .from('students')
        .update({
          nama: form.value.nama,
          jk: form.value.jk,
          kelas: form.value.kelas,
          tanggal_masuk: form.value.tanggal_masuk,
          keterangan: form.value.keterangan,
        })
        .eq('id', form.value.id)
      if (error) throw error
      await logActivity({ aksi: 'update_siswa', tabel_terkait: 'students', record_id: form.value.id, detail: { nisn: form.value.nisn } })
      toast.success('Data siswa diperbarui')
    } else {
      const { data, error } = await supabase
        .from('students')
        .insert({
          nisn: form.value.nisn,
          nama: form.value.nama,
          jk: form.value.jk,
          kelas: form.value.kelas,
          status: 'aktif',
          active: true,
          tanggal_masuk: form.value.tanggal_masuk,
          keterangan: form.value.keterangan,
        })
        .select()
        .single()
      if (error) throw error
      await logActivity({ aksi: 'tambah_siswa', tabel_terkait: 'students', record_id: data.id, detail: { nisn: form.value.nisn, nama: form.value.nama } })
      toast.success('Siswa baru ditambahkan')
    }
    showForm.value = false
    await load()
  } catch (e) {
    toast.error('Gagal menyimpan: ' + (e.message?.includes('duplicate') ? 'NISN sudah terdaftar' : e.message))
  } finally {
    saving.value = false
  }
}

function openMutasi(s) {
  mutasiForm.value = { id: s.id, nama: s.nama, nisn: s.nisn, status: 'pindah', tanggal_keluar: todayISO(), keterangan: '' }
  showMutasi.value = true
}

async function prosesMutasi() {
  saving.value = true
  try {
    const { error } = await supabase
      .from('students')
      .update({
        status: mutasiForm.value.status,
        active: false,
        tanggal_keluar: mutasiForm.value.tanggal_keluar,
        keterangan: mutasiForm.value.keterangan,
      })
      .eq('id', mutasiForm.value.id)
    if (error) throw error
    await logActivity({
      aksi: 'mutasi_siswa',
      tabel_terkait: 'students',
      record_id: mutasiForm.value.id,
      detail: { nisn: mutasiForm.value.nisn, status: mutasiForm.value.status },
    })
    toast.success(`${mutasiForm.value.nama} ditandai ${mutasiForm.value.status}`)
    showMutasi.value = false
    await load()
  } catch (e) {
    toast.error('Gagal: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function hapus(s) {
  if (!confirm(`Yakin ingin MENGHAPUS PERMANEN siswa ${s.nama} (${s.nisn})?\nSeluruh data presensinya juga akan terhapus!`)) return
  try {
    const { error } = await supabase.from('students').delete().eq('id', s.id)
    if (error) throw error
    await logActivity({ aksi: 'hapus_siswa', tabel_terkait: 'students', record_id: s.id, detail: { nisn: s.nisn, nama: s.nama } })
    toast.success('Siswa berhasil dihapus')
    await load()
  } catch (e) {
    toast.error('Gagal menghapus: ' + e.message)
  }
}

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  load()
})
</script>

<template>
  <div>
    <PageHeader title="Data Siswa" subtitle="Kelola data siswa, siswa baru/pindahan, dan mutasi keluar">
      <template #actions>
        <button class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50" @click="openUpload">
          <FileUp class="h-4 w-4" /> Upload Excel
        </button>
        <button class="btn-primary" @click="openCreate">
          <UserPlus class="h-4 w-4" /> Siswa Baru
        </button>
      </template>
    </PageHeader>

    <div class="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="relative">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input v-model="search" class="input-field pl-9" placeholder="Cari nama / NISN" />
      </div>
      <select v-model="filterKelas" class="input-field">
        <option value="">Semua Kelas</option>
        <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
      </select>
      <select v-model="filterStatus" class="input-field">
        <option value="">Semua Status</option>
        <option value="aktif">Aktif</option>
        <option value="lulus">Lulus</option>
        <option value="pindah">Pindah</option>
        <option value="keluar">Keluar</option>
      </select>
    </div>

    <div class="card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th class="px-3 py-2">NISN</th>
            <th class="px-3 py-2">Nama</th>
            <th class="px-3 py-2">JK</th>
            <th class="px-3 py-2">Kelas</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading"><td colspan="6" class="py-6 text-center text-gray-400">Memuat...</td></tr>
          <tr v-else-if="!paginated.length"><td colspan="6" class="py-6 text-center text-gray-400">Tidak ada data.</td></tr>
          <tr v-for="s in paginated" :key="s.id" class="hover:bg-gray-50">
            <td class="px-3 py-2 text-gray-500">{{ s.nisn }}</td>
            <td class="px-3 py-2 font-medium text-gray-800">{{ s.nama }}</td>
            <td class="px-3 py-2">{{ s.jk }}</td>
            <td class="px-3 py-2">{{ s.kelas || '-' }}</td>
            <td class="px-3 py-2"><StatusBadge :label="s.status" :color="statusColor[s.status]" /></td>
            <td class="px-3 py-2">
              <div class="flex justify-end gap-1">
                <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Edit" @click="openEdit(s)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  v-if="s.active"
                  class="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50"
                  title="Mutasi keluar"
                  @click="openMutasi(s)"
                >
                  <LogOut class="h-4 w-4" />
                </button>
                <button
                  class="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  title="Hapus Permanen"
                  @click="hapus(s)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between text-sm text-gray-600">
      <div>
        Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filtered.length) }} dari {{ filtered.length }} siswa
      </div>
      <div class="flex gap-2">
        <button 
          class="rounded-lg border border-gray-200 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          Sebelumnya
        </button>
        <div class="flex items-center px-2 font-medium">{{ currentPage }} / {{ totalPages }}</div>
        <button 
          class="rounded-lg border border-gray-200 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          Selanjutnya
        </button>
      </div>
    </div>

    <!-- Form tambah/edit -->
    <BaseModal v-model="showForm" :title="editing ? 'Edit Siswa' : 'Siswa Baru / Pindahan Masuk'">
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">NISN</label>
          <input v-model="form.nisn" class="input-field" :disabled="editing" placeholder="10 digit" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Nama Lengkap</label>
          <input v-model="form.nama" class="input-field" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Jenis Kelamin</label>
            <select v-model="form.jk" class="input-field">
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Kelas</label>
            <select v-model="form.kelas" class="input-field">
              <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal Masuk</label>
          <input v-model="form.tanggal_masuk" type="date" class="input-field" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Keterangan</label>
          <input v-model="form.keterangan" class="input-field" placeholder="mis. pindahan dari SD ..." />
        </div>
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showForm = false">Batal</button>
        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
      </template>
    </BaseModal>

    <!-- Mutasi keluar -->
    <BaseModal v-model="showMutasi" title="Mutasi Siswa Keluar" max-width="max-w-md">
      <p class="mb-3 text-sm text-gray-600">
        Siswa <strong>{{ mutasiForm.nama }}</strong> ({{ mutasiForm.nisn }}) akan dinonaktifkan.
      </p>
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Jenis Mutasi</label>
          <select v-model="mutasiForm.status" class="input-field">
            <option value="pindah">Pindah</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal Keluar</label>
          <input v-model="mutasiForm.tanggal_keluar" type="date" class="input-field" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Keterangan</label>
          <input v-model="mutasiForm.keterangan" class="input-field" placeholder="alasan / tujuan" />
        </div>
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showMutasi = false">Batal</button>
        <button class="btn-primary" :disabled="saving" @click="prosesMutasi">{{ saving ? 'Memproses...' : 'Proses Mutasi' }}</button>
      </template>
    </BaseModal>

    <!-- Modal Upload Excel -->
    <BaseModal v-model="showUpload" title="Upload Siswa (Excel)">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Gunakan template excel ini untuk menginput banyak siswa sekaligus.
          <br />
          <button class="text-primary hover:underline font-medium" @click="downloadTemplate">Download Template</button>
        </p>
        <input type="file" accept=".xlsx, .xls" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" @change="onFileSelected" />
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showUpload = false">Batal</button>
        <button class="btn-primary" :disabled="uploadingExcel || !selectedFile" @click="processUpload">
          {{ uploadingExcel ? 'Memproses...' : 'Upload' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
