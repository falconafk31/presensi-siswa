<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Pencil, LogOut, Search, UserPlus, Trash2, Users, FileUp, FileDown, X } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { todayISO } from '@/lib/dates'
import { useSettingsStore } from '@/stores/settings'
import {
  AppPageHeader, AppFilterBar, AppInput, AppSelect, AppTable,
  AppBadge, AppModal, AppConfirmDialog, AppEmptyState, AppErrorState,
  AppSkeleton, AppButton, AppPagination,
} from '@/components/ui'

const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])

const students = ref([])
const loading = ref(false)
const loadError = ref('')
const search = ref('')
const filterKelas = ref('')
const filterStatus = ref('aktif')

const showForm = ref(false)
const showMutasi = ref(false)
const showConfirmDelete = ref(false)
const showBulkConfirm = ref(false)
const siswaToDelete = ref(null)
const saving = ref(false)
const editing = ref(false)

const emptyForm = () => ({
  id: null,
  nisn: '',
  nism: '',
  nama: '',
  jk: 'L',
  tempat_lahir: '',
  tanggal_lahir: '',
  kelas: daftarKelas.value[0] || '1',
  tanggal_masuk: todayISO(),
  keterangan: '',
})
const form = ref(emptyForm())

const showUpload = ref(false)
const uploadingExcel = ref(false)
const selectedFile = ref(null)
const uploadError = ref(null)
const uploadPreview = ref(null)
const targetKelasUpload = ref('')

function openUpload() {
  selectedFile.value = null
  uploadError.value = null
  uploadPreview.value = null
  targetKelasUpload.value = ''
  showUpload.value = true
}

async function downloadTemplate() {
  const xlsx = await import('xlsx')
  const ws = xlsx.utils.json_to_sheet([
    { NISN: '1234567890', NISM: '12345', Nama: 'Ahmad Siswa', JK: 'L', TempatLahir: 'Blora', TanggalLahir: '2014-08-15', Kelas: '1A' },
    { NISN: '1234567891', NISM: '12346', Nama: 'Siti Siswi', JK: 'P', TempatLahir: 'Semarang', TanggalLahir: '2014-09-20', Kelas: '1A' },
  ])
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Template Siswa')
  xlsx.writeFile(wb, 'Template_Upload_Siswa.xlsx')
}

function onFileSelected(e) {
  selectedFile.value = e.target.files?.[0]
  uploadError.value = null
  uploadPreview.value = null
}

async function exportDataSiswa() {
  if (filtered.value.length === 0) {
    toast.error('Tidak ada data untuk diekspor')
    return
  }
  try {
    const xlsx = await import('xlsx')
    const wsData = filtered.value.map((s, idx) => ({
      No: idx + 1,
      NISN: s.nisn,
      NISM: s.nism || '-',
      Nama: s.nama,
      JK: s.jk,
      'Tempat Lahir': s.tempat_lahir || '-',
      'Tanggal Lahir': s.tanggal_lahir || '-',
      Kelas: s.kelas,
      Status: s.status,
    }))
    const ws = xlsx.utils.json_to_sheet(wsData)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Data Siswa')
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
    ]
    xlsx.writeFile(wb, `Data_Siswa_${todayISO()}.xlsx`)
    toast.success('Data siswa berhasil diekspor')
    logActivity({ aksi: 'export_siswa', tabel_terkait: 'students' })
  } catch (e) {
    toast.error('Gagal mengekspor data: ' + e.message)
  }
}

async function processUpload() {
  uploadError.value = null
  if (!selectedFile.value) return
  uploadingExcel.value = true
  try {
    const xlsx = await import('xlsx')
    const data = await selectedFile.value.arrayBuffer()
    const wb = xlsx.read(data)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(ws)

    if (!rows.length) throw new Error('File kosong atau format salah')

    const rawToInsert = rows.map((r, idx) => {
      let tglLahir = r.TanggalLahir || null
      if (typeof tglLahir === 'number') {
        const d = new Date((tglLahir - 25569) * 86400 * 1000)
        const yyyy = d.getUTCFullYear()
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(d.getUTCDate()).padStart(2, '0')
        tglLahir = `${yyyy}-${mm}-${dd}`
      } else if (tglLahir) {
        tglLahir = String(tglLahir).trim()
      }

      return {
        nisn: r.NISN ? String(r.NISN).trim() : `TMP${String(Date.now() + idx).slice(-7)}`,
        nism: r.NISM ? String(r.NISM).trim() : null,
        nama: String(r.Nama || '').trim(),
        jk: String(r.JK || 'L').trim().toUpperCase(),
        tempat_lahir: r.TempatLahir ? String(r.TempatLahir).trim() : null,
        tanggal_lahir: tglLahir,
        kelas: String(r.Kelas || '1').trim().toUpperCase(),
        status: 'aktif',
        active: true,
        tanggal_masuk: todayISO(),
      }
    }).filter((r) => r.nama)

    const uniqueMap = new Map()
    rawToInsert.forEach((item) => {
      uniqueMap.set(`${item.nama.toLowerCase()}_${item.tanggal_lahir || ''}`, item)
    })
    const excelStudents = Array.from(uniqueMap.values())

    if (!excelStudents.length) throw new Error('Tidak ada data valid (Nama wajib)')

    let query = supabase.from('students').select('id, nisn, nama, tanggal_lahir, kelas')
    if (targetKelasUpload.value) query = query.eq('kelas', targetKelasUpload.value)
    const { data: dbStudents, error: dbErr } = await query
    if (dbErr) throw dbErr

    const allUpserts = []
    let updateCount = 0
    let insertCount = 0

    excelStudents.forEach((ex) => {
      const keyEx = `${ex.nama.toLowerCase()}_${ex.tanggal_lahir || ''}`
      const match = dbStudents.find((db) => `${db.nama.toLowerCase()}_${db.tanggal_lahir || ''}` === keyEx)
      if (match) {
        allUpserts.push({ ...ex, id: match.id })
        updateCount++
      } else {
        allUpserts.push(ex)
        insertCount++
      }
    })

    const errors = []
    const nisnMap = new Map()
    allUpserts.forEach((s) => {
      if (s.nisn && !s.nisn.startsWith('TMP')) {
        if (nisnMap.has(s.nisn)) {
          errors.push(`NISN ${s.nisn} terdeteksi ganda di dalam file Excel (antara "${s.nama}" dengan "${nisnMap.get(s.nisn)}").`)
        } else {
          nisnMap.set(s.nisn, s.nama)
        }
      }
    })

    dbStudents.forEach((db) => {
      if (db.nisn && !db.nisn.startsWith('TMP')) {
        const found = allUpserts.find((u) => u.nisn === db.nisn && u.id !== db.id)
        if (found) {
          errors.push(`NISN ${db.nisn} di Excel diinput sebagai siswa baru ("${found.nama}"), tetapi sudah terdaftar atas nama "${db.nama}". Samakan Nama & Tanggal Lahir agar terupdate.`)
        }
      }
    })

    uploadPreview.value = { allUpserts, insertCount, updateCount, dbCount: dbStudents.length, errors }
  } catch (e) {
    uploadError.value = e.message
  } finally {
    uploadingExcel.value = false
  }
}

async function confirmUpload() {
  if (!uploadPreview.value || uploadPreview.value.errors.length > 0) return
  uploadingExcel.value = true
  uploadError.value = null
  try {
    const { allUpserts } = uploadPreview.value
    const toUpdate = allUpserts.filter((u) => u.id)
    const toInsert = allUpserts.filter((u) => !u.id)
    const checkErr = (err) => {
      if (err) {
        if (err.message?.includes('duplicate key') || err.code === '23505') {
          throw new Error('Gagal: Terdapat NISN ganda. Pastikan NISN di Excel tidak sama dengan siswa lain di database.')
        }
        throw err
      }
    }
    if (toUpdate.length > 0) {
      const { error } = await supabase.from('students').upsert(toUpdate)
      checkErr(error)
    }
    if (toInsert.length > 0) {
      const { error } = await supabase.from('students').insert(toInsert)
      checkErr(error)
    }
    await logActivity({ aksi: 'import_siswa', tabel_terkait: 'students', detail: { jumlah: allUpserts.length } })
    toast.success(`${allUpserts.length} siswa berhasil diproses`)
    showUpload.value = false
    uploadPreview.value = null
    await load()
  } catch (e) {
    uploadError.value = e.message
  } finally {
    uploadingExcel.value = false
  }
}

const mutasiForm = ref({ id: null, nama: '', nisn: '', status: 'pindah', tanggal_keluar: todayISO(), keterangan: '' })

const statusTone = { aktif: 'success', lulus: 'info', pindah: 'warning', keluar: 'danger' }

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return students.value.filter((s) => {
    const okSearch = !q || s.nama.toLowerCase().includes(q) || s.nisn.includes(q)
    const okKelas = !filterKelas.value || s.kelas === filterKelas.value
    const okStatus = !filterStatus.value || s.status === filterStatus.value
    return okSearch && okKelas && okStatus
  })
})

const hasActiveFilter = computed(() => search.value.trim() !== '' || filterKelas.value !== '' || filterStatus.value !== 'aktif')
function clearFilters() {
  search.value = ''
  filterKelas.value = ''
  filterStatus.value = 'aktif'
}

const itemsPerPage = 50
const currentPage = ref(1)
const selectedIds = ref([])

watch([search, filterKelas, filterStatus], () => {
  currentPage.value = 1
  selectedIds.value = []
})

const paginated = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filtered.value.slice(start, start + itemsPerPage)
})

const selectAll = computed({
  get: () => paginated.value.length > 0 && paginated.value.every((s) => selectedIds.value.includes(s.id)),
  set: (val) => {
    const pageIds = paginated.value.map((s) => s.id)
    if (val) selectedIds.value = [...new Set([...selectedIds.value, ...pageIds])]
    else selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
  },
})

function confirmHapusTerpilih() {
  if (!selectedIds.value.length) return
  showBulkConfirm.value = true
}

async function hapusTerpilih() {
  if (!selectedIds.value.length) return
  saving.value = true
  try {
    const { error } = await supabase.from('students').delete().in('id', selectedIds.value)
    if (error) throw error
    toast.success(`${selectedIds.value.length} siswa berhasil dihapus`)
    logActivity({ aksi: 'hapus_siswa_masal', tabel_terkait: 'students', detail: { jumlah: selectedIds.value.length } })
    selectedIds.value = []
    showBulkConfirm.value = false
    await load()
  } catch (e) {
    toast.error('Gagal menghapus siswa: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data, error } = await supabase.from('students').select('*').order('kelas').order('nama')
    if (error) throw error
    students.value = data || []
  } catch (e) {
    loadError.value = e.message
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
    nism: s.nism || '',
    nama: s.nama,
    jk: s.jk || 'L',
    tempat_lahir: s.tempat_lahir || '',
    tanggal_lahir: s.tanggal_lahir || '',
    kelas: s.kelas || daftarKelas.value[0] || '1',
    tanggal_masuk: s.tanggal_masuk || todayISO(),
    keterangan: s.keterangan || '',
  }
  showForm.value = true
}

async function save() {
  if (!form.value.nama) {
    toast.error('Nama lengkap wajib diisi')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      const { error } = await supabase
        .from('students')
        .update({
          nism: form.value.nism || null,
          nama: form.value.nama,
          jk: form.value.jk,
          tempat_lahir: form.value.tempat_lahir || null,
          tanggal_lahir: form.value.tanggal_lahir || null,
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
          nisn: form.value.nisn || `TMP${String(Date.now()).slice(-7)}`,
          nism: form.value.nism || null,
          nama: form.value.nama,
          jk: form.value.jk,
          tempat_lahir: form.value.tempat_lahir || null,
          tanggal_lahir: form.value.tanggal_lahir || null,
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

function confirmHapus(s) {
  siswaToDelete.value = s
  showConfirmDelete.value = true
}

async function hapus() {
  if (!siswaToDelete.value) return
  saving.value = true
  try {
    const { error } = await supabase.from('students').delete().eq('id', siswaToDelete.value.id)
    if (error) throw error
    await logActivity({ aksi: 'hapus_siswa', tabel_terkait: 'students', record_id: siswaToDelete.value.id, detail: { nisn: siswaToDelete.value.nisn, nama: siswaToDelete.value.nama } })
    toast.success('Siswa berhasil dihapus')
    showConfirmDelete.value = false
    await load()
  } catch (e) {
    toast.error('Gagal menghapus: ' + e.message)
  } finally {
    saving.value = false
    siswaToDelete.value = null
  }
}

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  load()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader title="Data Siswa" :subtitle="`${filtered.length} siswa ditampilkan`">
      <template #actions>
        <AppButton v-if="selectedIds.length > 0" variant="danger-soft" size="sm" @click="confirmHapusTerpilih">
          <template #icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
          Hapus ({{ selectedIds.length }})
        </AppButton>
        <AppButton variant="secondary" size="sm" @click="exportDataSiswa">
          <template #icon><FileDown class="h-4 w-4" aria-hidden="true" /></template>
          <span class="hidden sm:inline">Download Data</span><span class="sm:hidden">Unduh</span>
        </AppButton>
        <AppButton variant="secondary" size="sm" @click="openUpload">
          <template #icon><FileUp class="h-4 w-4" aria-hidden="true" /></template>
          Upload Excel
        </AppButton>
        <AppButton size="sm" @click="openCreate">
          <template #icon><UserPlus class="h-4 w-4" aria-hidden="true" /></template>
          Siswa Baru
        </AppButton>
      </template>
    </AppPageHeader>

    <AppFilterBar columns="sm:grid-cols-3">
      <AppInput v-model="search" placeholder="Cari nama / NISN…" aria-label="Cari siswa">
        <template #leading><Search class="h-4 w-4" aria-hidden="true" /></template>
      </AppInput>
      <AppSelect v-model="filterKelas" aria-label="Filter kelas">
        <option value="">Semua Kelas</option>
        <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
      </AppSelect>
      <AppSelect v-model="filterStatus" aria-label="Filter status">
        <option value="">Semua Status</option>
        <option value="aktif">Aktif</option>
        <option value="lulus">Lulus</option>
        <option value="pindah">Pindah</option>
        <option value="keluar">Keluar</option>
      </AppSelect>
      <template v-if="hasActiveFilter" #footer>
        <span class="text-[13px] text-slate-500">{{ filtered.length }} hasil</span>
        <button class="link inline-flex items-center gap-1 text-[13px]" @click="clearFilters">
          <X class="h-3.5 w-3.5" aria-hidden="true" /> Hapus filter
        </button>
      </template>
    </AppFilterBar>

    <!-- Bulk selection bar -->
    <div v-if="selectedIds.length > 0" class="alert-warning !items-center !py-2.5" role="status">
      <p class="text-[13px]"><strong>{{ selectedIds.length }}</strong> siswa dipilih</p>
      <div class="ml-auto flex items-center gap-2">
        <button class="link text-[13px]" @click="selectedIds = []">Batalkan</button>
        <AppButton variant="danger" size="sm" :loading="saving" @click="confirmHapusTerpilih">Hapus Terpilih</AppButton>
      </div>
    </div>

    <!-- Error -->
    <AppErrorState v-if="!loading && loadError" description="Periksa koneksi atau coba lagi." @retry="load" />

    <!-- Desktop table -->
    <template v-else>
      <div v-if="loading" class="card-flat hidden p-4 md:block">
        <AppSkeleton type="table" :rows="6" />
      </div>
      <div v-else-if="!paginated.length" class="card-flat hidden p-4 md:block">
        <AppEmptyState
          title="Tidak ada siswa"
          description="Data siswa kosong atau tidak cocok dengan filter yang dipilih."
          :icon="Users"
        >
          <template #action>
            <AppButton size="sm" variant="secondary" @click="clearFilters">Hapus Filter</AppButton>
            <AppButton size="sm" @click="openCreate">Tambah Siswa</AppButton>
          </template>
        </AppEmptyState>
      </div>
      <AppTable v-else class="hidden md:block" caption="Daftar siswa">
        <thead>
          <tr>
            <th class="w-10 !text-center"><input v-model="selectAll" type="checkbox" class="checkbox" aria-label="Pilih semua di halaman ini" /></th>
            <th class="w-12 !text-center">No</th>
            <th>NISN</th>
            <th>Nama</th>
            <th>JK</th>
            <th>Kelas</th>
            <th>Status</th>
            <th class="!text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, idx) in paginated" :key="s.id" :class="selectedIds.includes(s.id) ? 'row-selected' : ''">
            <td class="!text-center"><input v-model="selectedIds" :value="s.id" type="checkbox" class="checkbox" :aria-label="`Pilih ${s.nama}`" /></td>
            <td class="!text-center text-slate-400">{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
            <td class="text-slate-500 tnum">{{ s.nisn }}</td>
            <td class="cell-main">{{ s.nama }}</td>
            <td>{{ s.jk }}</td>
            <td>{{ s.kelas || '—' }}</td>
            <td><AppBadge :label="s.status" :tone="statusTone[s.status] || 'neutral'" dot /></td>
            <td>
              <div class="flex justify-end gap-0.5">
                <button class="btn-icon !h-8 !w-8" title="Edit" :aria-label="`Edit ${s.nama}`" @click="openEdit(s)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button v-if="s.active" class="btn-icon !h-8 !w-8 hover:!bg-amber-50 hover:!text-amber-600" title="Mutasi keluar" :aria-label="`Mutasi ${s.nama}`" @click="openMutasi(s)">
                  <LogOut class="h-4 w-4" />
                </button>
                <button class="btn-icon !h-8 !w-8 hover:!bg-rose-50 hover:!text-rose-600" title="Hapus permanen" :aria-label="`Hapus ${s.nama}`" @click="confirmHapus(s)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
        <template #footer>
          <AppPagination v-model="currentPage" :total-items="filtered.length" :items-per-page="itemsPerPage" />
        </template>
      </AppTable>

      <!-- Mobile cards -->
      <div class="md:hidden">
        <AppSkeleton v-if="loading" type="card" :rows="4" />
        <AppEmptyState
          v-else-if="!paginated.length"
          title="Tidak ada siswa"
          description="Data siswa kosong atau tidak cocok dengan filter yang dipilih."
          :icon="Users"
        >
          <template #action>
            <AppButton size="sm" variant="secondary" @click="clearFilters">Hapus Filter</AppButton>
            <AppButton size="sm" @click="openCreate">Tambah Siswa</AppButton>
          </template>
        </AppEmptyState>
        <div v-else class="flex flex-col gap-2.5">
          <label class="flex cursor-pointer items-center gap-2 px-1 text-[13px] font-medium text-slate-600">
            <input v-model="selectAll" type="checkbox" class="checkbox" /> Pilih semua di halaman ini
          </label>
          <article
            v-for="(s, idx) in paginated"
            :key="s.id"
            class="card-flat p-3.5"
            :class="selectedIds.includes(s.id) ? 'ring-1 ring-primary-300' : ''"
          >
            <div class="mb-2 flex items-start justify-between gap-2">
              <div class="flex min-w-0 items-start gap-2.5">
                <input v-model="selectedIds" :value="s.id" type="checkbox" class="checkbox mt-1" :aria-label="`Pilih ${s.nama}`" />
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">{{ s.nama }}</p>
                  <p class="text-xs text-slate-400 tnum">#{{ (currentPage - 1) * itemsPerPage + idx + 1 }} · {{ s.nisn }}</p>
                </div>
              </div>
              <AppBadge :label="s.status" :tone="statusTone[s.status] || 'neutral'" dot />
            </div>
            <dl class="mb-3 grid grid-cols-2 gap-1.5 text-xs text-slate-500">
              <div>Kelas: <span class="font-medium text-slate-700">{{ s.kelas || '—' }}</span></div>
              <div>JK: <span class="font-medium text-slate-700">{{ s.jk === 'L' ? 'Laki-laki' : 'Perempuan' }}</span></div>
            </dl>
            <div class="flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
              <AppButton variant="secondary" size="sm" class="flex-1" @click="openEdit(s)">Edit</AppButton>
              <AppButton v-if="s.active" variant="secondary" size="sm" class="flex-1 !text-amber-700" @click="openMutasi(s)">Mutasi</AppButton>
              <AppButton variant="danger-soft" size="sm" class="flex-1" @click="confirmHapus(s)">Hapus</AppButton>
            </div>
          </article>
          <div class="card-flat">
            <AppPagination v-model="currentPage" :total-items="filtered.length" :items-per-page="itemsPerPage" />
          </div>
        </div>
      </div>
    </template>

    <!-- Form tambah/edit -->
    <AppModal v-model="showForm" :title="editing ? 'Edit Siswa' : 'Siswa Baru / Pindahan'" subtitle="Lengkapi data siswa dengan benar">
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppInput v-model="form.nisn" label="NISN (opsional)" placeholder="10 digit" :disabled="editing && !!form.nisn" />
          <AppInput v-model="form.nism" label="NISM (opsional)" placeholder="18 digit" />
        </div>
        <AppInput v-model="form.nama" label="Nama lengkap" placeholder="Nama siswa" required />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppInput v-model="form.tempat_lahir" label="Tempat lahir" placeholder="Kota" />
          <AppInput v-model="form.tanggal_lahir" type="date" label="Tanggal lahir" />
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppSelect v-model="form.jk" label="Jenis kelamin">
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </AppSelect>
          <AppSelect v-model="form.kelas" label="Kelas">
            <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
          </AppSelect>
        </div>
        <AppInput v-model="form.tanggal_masuk" type="date" label="Tanggal masuk" />
        <AppInput v-model="form.keterangan" label="Keterangan" placeholder="mis. pindahan dari SD …" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showForm = false">Batal</AppButton>
        <AppButton :loading="saving" @click="save">{{ saving ? 'Menyimpan…' : 'Simpan' }}</AppButton>
      </template>
    </AppModal>

    <!-- Mutasi -->
    <AppModal v-model="showMutasi" title="Mutasi Siswa Keluar" max-width="max-w-md">
      <p class="mb-3 text-sm text-slate-600">
        Siswa <strong class="text-slate-900">{{ mutasiForm.nama }}</strong>
        <span class="text-slate-400">({{ mutasiForm.nisn }})</span> akan dinonaktifkan.
      </p>
      <div class="flex flex-col gap-3">
        <AppSelect v-model="mutasiForm.status" label="Jenis mutasi">
          <option value="pindah">Pindah</option>
          <option value="keluar">Keluar</option>
        </AppSelect>
        <AppInput v-model="mutasiForm.tanggal_keluar" type="date" label="Tanggal keluar" />
        <AppInput v-model="mutasiForm.keterangan" label="Keterangan" placeholder="Alasan / tujuan" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showMutasi = false">Batal</AppButton>
        <AppButton variant="warning" :loading="saving" @click="prosesMutasi">{{ saving ? 'Memproses…' : 'Proses Mutasi' }}</AppButton>
      </template>
    </AppModal>

    <!-- Hapus tunggal -->
    <AppConfirmDialog
      v-model="showConfirmDelete"
      title="Hapus Siswa Permanen?"
      tone="danger"
      confirm-label="Hapus Permanen"
      :loading="saving"
      @confirm="hapus"
    >
      <template v-if="siswaToDelete">
        <strong>{{ siswaToDelete.nama }}</strong> ({{ siswaToDelete.nisn }}) akan dihapus permanen
        beserta seluruh rekam presensinya. Tindakan ini tidak dapat dibatalkan.
      </template>
    </AppConfirmDialog>

    <!-- Hapus massal -->
    <AppConfirmDialog
      v-model="showBulkConfirm"
      title="Hapus Massal?"
      tone="danger"
      :confirm-label="`Hapus ${selectedIds.length} Siswa`"
      :loading="saving"
      @confirm="hapusTerpilih"
    >
      <strong>{{ selectedIds.length }} siswa terpilih</strong> akan dihapus permanen beserta rekam presensinya.
      Tindakan ini tidak dapat dibatalkan.
    </AppConfirmDialog>

    <!-- Upload Excel -->
    <AppModal v-model="showUpload" title="Upload Siswa via Excel" subtitle="Impor banyak siswa sekaligus">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
          <div>
            <p class="text-sm font-semibold text-blue-800">Template Excel</p>
            <p class="mt-0.5 text-xs text-blue-600">Gunakan template agar format data sesuai.</p>
          </div>
          <AppButton variant="library" size="sm" @click="downloadTemplate">
            <template #icon><FileDown class="h-4 w-4" aria-hidden="true" /></template>
            Template
          </AppButton>
        </div>

        <AppSelect v-if="!uploadPreview" v-model="targetKelasUpload" label="Target kelas (opsional)" hint="Jika dipilih, duplikasi hanya dicek terhadap kelas tersebut.">
          <option value="">Deteksi otomatis semua kelas</option>
          <option v-for="k in daftarKelas" :key="k" :value="k">Validasi khusus kelas {{ k }}</option>
        </AppSelect>

        <div v-if="!uploadPreview" class="group relative">
          <input type="file" accept=".xlsx,.xls" class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" aria-label="Pilih file Excel" @change="onFileSelected" />
          <div class="rounded-xl border-2 border-dashed p-7 text-center transition-colors" :class="selectedFile ? 'border-primary-400 bg-primary-50/60' : 'border-slate-200 bg-slate-50 group-hover:border-primary-300'">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary-600 shadow-xs ring-1 ring-slate-200">
              <FileUp class="h-5 w-5" aria-hidden="true" />
            </div>
            <template v-if="!selectedFile">
              <p class="text-sm font-medium text-slate-700">Klik atau seret file Excel ke sini</p>
              <p class="mt-1 text-xs text-slate-400">Mendukung .xlsx dan .xls</p>
            </template>
            <template v-else>
              <p class="text-sm font-semibold text-primary-800">{{ selectedFile.name }}</p>
              <p class="mt-1 text-xs text-primary-600">{{ (selectedFile.size / 1024).toFixed(1) }} KB · klik untuk mengganti</p>
            </template>
          </div>
        </div>

        <template v-else>
          <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p class="text-xl font-bold text-slate-700 tnum">{{ uploadPreview.dbCount }}</p>
              <p class="tiny mt-0.5 uppercase tracking-wider text-slate-400">Total awal</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p class="text-xl font-bold text-emerald-700 tnum">+{{ uploadPreview.insertCount }}</p>
              <p class="tiny mt-0.5 uppercase tracking-wider text-emerald-600">Data baru</p>
            </div>
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
              <p class="text-xl font-bold text-sky-700 tnum">{{ uploadPreview.updateCount }}</p>
              <p class="tiny mt-0.5 uppercase tracking-wider text-sky-600">Di-update</p>
            </div>
            <div class="rounded-xl border border-primary-300 bg-primary-50 p-3 text-center">
              <p class="text-xl font-bold text-primary-700 tnum">{{ uploadPreview.dbCount + uploadPreview.insertCount }}</p>
              <p class="tiny mt-0.5 uppercase tracking-wider text-primary-600">Total akhir</p>
            </div>
          </div>
          <div v-if="uploadPreview.errors.length > 0" class="alert-danger">
            <div>
              <p class="font-semibold">Ditemukan {{ uploadPreview.errors.length }} masalah validasi</p>
              <ul class="mt-1.5 list-disc space-y-1 pl-4 text-[13px]">
                <li v-for="(err, i) in uploadPreview.errors" :key="i">{{ err }}</li>
              </ul>
              <p class="mt-2 text-xs font-medium">Perbaiki file Excel sebelum menyimpan.</p>
            </div>
          </div>
          <div v-else class="alert-success !items-center">
            <p class="font-medium">Data valid dan siap disimpan.</p>
          </div>
        </template>

        <div v-if="uploadError" class="alert-danger">
          <div>
            <p class="font-semibold">Gagal mengimpor data</p>
            <p class="mt-1 whitespace-pre-line text-[13px]">{{ uploadError }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showUpload = false; uploadPreview = null; uploadError = null; selectedFile = null">Batal</AppButton>
        <AppButton v-if="!uploadPreview" :loading="uploadingExcel" :disabled="!selectedFile" @click="processUpload">
          {{ uploadingExcel ? 'Memeriksa…' : 'Lanjutkan' }}
        </AppButton>
        <AppButton v-else :loading="uploadingExcel" :disabled="uploadPreview.errors.length > 0" @click="confirmUpload">
          {{ uploadingExcel ? 'Menyimpan…' : 'Simpan Data' }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
