<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { Book, Plus, Edit, Trash2, Upload, Loader2, Download, ArrowUp, ArrowDown, ArrowUpDown, FileDown, FileUp, Info } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import Pagination from '@/components/Pagination.vue'

const books = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const showImportModal = ref(false)
const searchQuery = ref('')
const fileInput = ref(null)

const showHistoryModal = ref(false)
const loadingHistory = ref(false)
const selectedHistoryBookTitle = ref('')
const selectedBookHistory = ref([])
const historyCurrentPage = ref(1)
const historyItemsPerPage = 10

const form = ref({
  id: null,
  judul: '',
  pengarang: '',
  penerbit: '',
  tahun_terbit: '',
  isbn: '',
  stok: 1,
  kategori: ''
})

const sortKey = ref('judul')
const sortOrder = ref('asc')

function setSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const filteredBooks = computed(() => {
  let result = books.value
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(b => b.judul.toLowerCase().includes(q) || (b.pengarang && b.pengarang.toLowerCase().includes(q)))
  }
  
  result = [...result].sort((a, b) => {
    let valA = a[sortKey.value] || ''
    let valB = b[sortKey.value] || ''
    
    if (['stok', 'dipinjam', 'tersedia'].includes(sortKey.value)) {
      valA = Number(a[sortKey.value]) || 0
      valB = Number(b[sortKey.value]) || 0
    } else if (sortKey.value === 'judul') {
      valA = a.judul.toLowerCase()
      valB = b.judul.toLowerCase()
    } else if (sortKey.value === 'pengarang') {
      valA = (a.pengarang || '').toLowerCase()
      valB = (b.pengarang || '').toLowerCase()
    }
    
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
  
  return result
})

const currentPage = ref(1)
const itemsPerPage = 20

watch(searchQuery, () => {
  currentPage.value = 1
})

const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredBooks.value.slice(start, start + itemsPerPage)
})

const paginatedBookHistory = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyItemsPerPage
  return selectedBookHistory.value.slice(start, start + historyItemsPerPage)
})

async function fetchBooks() {
  loading.value = true
  try {
    const [{ data: b, error }, { data: l }] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase.from('book_loans').select('book_id').eq('status', 'dipinjam')
    ])
    
    if (error) throw error

    const borrowedCounts = {}
    if (l) {
      l.forEach(loan => {
        borrowedCounts[loan.book_id] = (borrowedCounts[loan.book_id] || 0) + 1
      })
    }

    books.value = (b || []).map(book => {
      const dipinjam = borrowedCounts[book.id] || 0
      return {
        ...book,
        dipinjam,
        tersedia: book.stok - dipinjam
      }
    })
  } catch (e) {
    toast.error('Gagal memuat data buku: ' + e.message)
  } finally {
    loading.value = false
  }
}

function openModal(book = null) {
  if (book) {
    form.value = { ...book }
  } else {
    form.value = {
      id: null,
      judul: '',
      pengarang: '',
      penerbit: '',
      tahun_terbit: '',
      isbn: '',
      stok: 1,
      kategori: ''
    }
  }
  showModal.value = true
}

async function saveBook() {
  if (!form.value.judul) {
    toast.error('Judul buku wajib diisi')
    return
  }
  saving.value = true
  try {
    const payload = {
      judul: form.value.judul,
      pengarang: form.value.pengarang,
      penerbit: form.value.penerbit,
      tahun_terbit: form.value.tahun_terbit,
      isbn: form.value.isbn,
      stok: form.value.stok,
      kategori: form.value.kategori
    }

    if (form.value.id) {
      const { error } = await supabase.from('books').update(payload).eq('id', form.value.id)
      if (error) throw error
      toast.success('Buku berhasil diperbarui')
      logActivity({ aksi: 'edit_buku', tabel_terkait: 'books', record_id: form.value.id, detail: { judul: payload.judul } })
    } else {
      const { error } = await supabase.from('books').insert(payload)
      if (error) throw error
      toast.success('Buku baru berhasil ditambahkan')
      logActivity({ aksi: 'tambah_buku', tabel_terkait: 'books', detail: { judul: payload.judul } })
    }
    showModal.value = false
    fetchBooks()
  } catch (e) {
    toast.error('Gagal menyimpan: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function deleteBook(id, judul) {
  if (!confirm(`Yakin ingin menghapus buku "${judul}"?`)) return
  try {
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) throw error
    toast.success('Buku berhasil dihapus')
    logActivity({ aksi: 'hapus_buku', tabel_terkait: 'books', record_id: id, detail: { judul } })
    fetchBooks()
  } catch (e) {
    toast.error('Gagal menghapus buku: ' + e.message)
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const XLSX = await import('xlsx')
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      // Header harus: Judul | Pengarang | Penerbit | Tahun | ISBN | Stok | Kategori
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)
      
      if (!jsonData.length) {
        toast.error('File Excel kosong atau format salah')
        return
      }

      const payload = jsonData.map(row => ({
        judul: row['Judul'] || row['judul'] || 'Tanpa Judul',
        pengarang: row['Pengarang'] || row['pengarang'] || null,
        penerbit: row['Penerbit'] || row['penerbit'] || null,
        tahun_terbit: String(row['Tahun'] || row['tahun_terbit'] || ''),
        isbn: String(row['ISBN'] || row['isbn'] || ''),
        stok: parseInt(row['Stok'] || row['stok'] || 1),
        kategori: row['Kategori'] || row['kategori'] || null,
      }))

      saving.value = true
      const { error } = await supabase.from('books').insert(payload)
      if (error) throw error

      toast.success(`${payload.length} buku berhasil diimpor`)
      logActivity({ aksi: 'import_buku', tabel_terkait: 'books', detail: { jumlah: payload.length } })
      showImportModal.value = false
      fetchBooks()
    } catch (err) {
      toast.error('Gagal membaca file: ' + err.message)
    } finally {
      saving.value = false
      fileInput.value.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

async function downloadTemplate() {
  const XLSX = await import('xlsx')
  const wsData = [
    ['Judul', 'Pengarang', 'Penerbit', 'Tahun', 'ISBN', 'Stok', 'Kategori'],
    ['Laskar Pelangi', 'Andrea Hirata', 'Bentang Pustaka', '2005', '978-979-3062-79-2', 5, 'Fiksi'],
    ['Buku Tema 1', 'Kemdikbud', 'Pusat Kurikulum', '2018', '', 30, 'Pelajaran']
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{wch:30},{wch:20},{wch:20},{wch:10},{wch:20},{wch:10},{wch:15}]
  XLSX.utils.book_append_sheet(wb, ws, 'Data Buku')
  XLSX.writeFile(wb, 'Template_Import_Buku.xlsx')
}

async function openHistoryModal(book) {
  selectedHistoryBookTitle.value = book.judul
  showHistoryModal.value = true
  loadingHistory.value = true
  selectedBookHistory.value = []
  historyCurrentPage.value = 1
  
  try {
    const { data, error } = await supabase
      .from('book_loans')
      .select('*, students!book_loans_student_nisn_fkey(nama, kelas)')
      .eq('book_id', book.id)
      .order('created_at', { ascending: false })
      
    if (error) {
      // Jika terjadi error foreign key name (kadang Supabase otomatis generate nama fkey), coba nama lain atau table langsung
      const { data: data2, error: err2 } = await supabase
        .from('book_loans')
        .select('*, students(nama, kelas)')
        .eq('book_id', book.id)
        .order('created_at', { ascending: false })
      if (err2) throw err2
      selectedBookHistory.value = data2 || []
    } else {
      selectedBookHistory.value = data || []
    }
  } catch (err) {
    toast.error('Gagal mengambil riwayat: ' + err.message)
  } finally {
    loadingHistory.value = false
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'dipinjam': return 'bg-sky-100 text-sky-700'
    case 'dikembalikan': return 'bg-emerald-100 text-emerald-700'
    case 'terlambat': return 'bg-rose-100 text-rose-700'
    case 'hilang': return 'bg-gray-100 text-gray-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

onMounted(fetchBooks)
</script>

<template>
  <div>
    <PageHeader title="Data Koleksi" subtitle="Manajemen bibliografi dan inventaris perpustakaan">
      <template #actions>
        <div class="flex gap-2">
          <button class="btn-primary bg-sky-600 hover:bg-sky-700" @click="showImportModal = true">
            <Upload class="h-4 w-4" /> Import Excel
          </button>
          <button class="btn-primary" @click="openModal()">
            <Plus class="h-4 w-4" /> Tambah Buku
          </button>
        </div>
      </template>
    </PageHeader>

    <div class="card mb-4 flex items-center justify-between gap-4">
      <div class="relative w-full max-w-md">
        <input v-model="searchQuery" class="input-field pl-10" placeholder="Cari judul atau pengarang..." />
        <Book class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="min-w-full table-fixed text-left text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-gray-500">
            <th class="px-4 py-3 font-semibold w-16 text-center">No</th>
            <th class="px-4 py-3 font-semibold w-[35%] cursor-pointer select-none hover:bg-gray-50 group" @click="setSort('judul')">
              <div class="flex items-center gap-2">
                Judul Buku
                <ArrowUp v-if="sortKey === 'judul' && sortOrder === 'asc'" class="w-4 h-4 text-emerald-600" />
                <ArrowDown v-else-if="sortKey === 'judul' && sortOrder === 'desc'" class="w-4 h-4 text-emerald-600" />
                <ArrowUpDown v-else class="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </th>
            <th class="px-4 py-3 font-semibold w-[20%] cursor-pointer select-none hover:bg-gray-50 group" @click="setSort('pengarang')">
              <div class="flex items-center gap-2">
                Pengarang & Penerbit
                <ArrowUp v-if="sortKey === 'pengarang' && sortOrder === 'asc'" class="w-4 h-4 text-emerald-600" />
                <ArrowDown v-else-if="sortKey === 'pengarang' && sortOrder === 'desc'" class="w-4 h-4 text-emerald-600" />
                <ArrowUpDown v-else class="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </th>
            <th class="px-2 py-3 font-semibold w-[8%] text-center cursor-pointer select-none hover:bg-gray-50 group" @click="setSort('stok')">
              <div class="flex items-center justify-center gap-1">
                Total
                <ArrowUp v-if="sortKey === 'stok' && sortOrder === 'asc'" class="w-3 h-3 text-emerald-600" />
                <ArrowDown v-else-if="sortKey === 'stok' && sortOrder === 'desc'" class="w-3 h-3 text-emerald-600" />
                <ArrowUpDown v-else class="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </th>
            <th class="px-2 py-3 font-semibold w-[8%] text-center cursor-pointer select-none hover:bg-gray-50 group" @click="setSort('dipinjam')">
              <div class="flex items-center justify-center gap-1">
                Pinjam
                <ArrowUp v-if="sortKey === 'dipinjam' && sortOrder === 'asc'" class="w-3 h-3 text-emerald-600" />
                <ArrowDown v-else-if="sortKey === 'dipinjam' && sortOrder === 'desc'" class="w-3 h-3 text-emerald-600" />
                <ArrowUpDown v-else class="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </th>
            <th class="px-2 py-3 font-semibold w-[8%] text-center cursor-pointer select-none hover:bg-gray-50 group" @click="setSort('tersedia')">
              <div class="flex items-center justify-center gap-1">
                Sisa
                <ArrowUp v-if="sortKey === 'tersedia' && sortOrder === 'asc'" class="w-3 h-3 text-emerald-600" />
                <ArrowDown v-else-if="sortKey === 'tersedia' && sortOrder === 'desc'" class="w-3 h-3 text-emerald-600" />
                <ArrowUpDown v-else class="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </th>
            <th class="px-4 py-3 font-semibold w-[15%] text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="px-4 py-8 text-center text-gray-500">
              <Loader2 class="mx-auto h-6 w-6 animate-spin text-emerald-500" />
              <p class="mt-2">Memuat buku...</p>
            </td>
          </tr>
          <tr v-else-if="!filteredBooks.length">
            <td colspan="7" class="px-4 py-8 text-center text-gray-500">
              Belum ada buku atau pencarian tidak ditemukan.
            </td>
          </tr>
          <tr v-for="(b, idx) in paginatedBooks" :key="b.id" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3 text-center text-sm font-medium text-gray-500">{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
            <td class="px-4 py-3">
              <div class="font-semibold text-gray-800">{{ b.judul }}</div>
              <div class="text-xs text-gray-500">Kategori: {{ b.kategori || '-' }} | ISBN: {{ b.isbn || '-' }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="text-gray-700">{{ b.pengarang || '-' }}</div>
              <div class="text-xs text-gray-500">{{ b.penerbit || '-' }} ({{ b.tahun_terbit || '-' }})</div>
            </td>
            <td class="px-2 py-3 text-center align-middle">
              <div class="text-sm font-bold text-gray-800">{{ b.stok }}</div>
            </td>
            <td class="px-2 py-3 text-center align-middle">
              <div class="text-sm font-medium text-rose-600">{{ b.dipinjam }}</div>
            </td>
            <td class="px-2 py-3 text-center align-middle">
              <div class="text-sm font-semibold text-emerald-600">{{ b.tersedia }}</div>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button class="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Riwayat Peminjaman" @click="openHistoryModal(b)">
                  <Info class="h-4 w-4" />
                </button>
                <button class="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Edit Buku" @click="openModal(b)">
                  <Edit class="h-4 w-4" />
                </button>
                <button class="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Hapus Buku" @click="deleteBook(b.id, b.judul)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      v-if="!loading && filteredBooks.length > 0"
      v-model="currentPage"
      :total-items="filteredBooks.length"
      :items-per-page="itemsPerPage"
      class="mt-4 rounded-2xl shadow-sm border border-gray-100"
    />

    <!-- Modal Form Buku -->
    <BaseModal v-model="showModal" :title="form.id ? 'Edit Buku' : 'Tambah Buku'">
      <div class="space-y-4 p-5">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Judul Buku <span class="text-rose-500">*</span></label>
          <input v-model="form.judul" class="input-field" placeholder="Masukkan judul buku" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Pengarang</label>
            <input v-model="form.pengarang" class="input-field" placeholder="Nama pengarang" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Penerbit</label>
            <input v-model="form.penerbit" class="input-field" placeholder="Nama penerbit" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Tahun Terbit</label>
            <input v-model="form.tahun_terbit" class="input-field" placeholder="Contoh: 2023" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">ISBN</label>
            <input v-model="form.isbn" class="input-field" placeholder="Kode ISBN" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Stok <span class="text-rose-500">*</span></label>
            <input v-model.number="form.stok" type="number" min="1" class="input-field" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Kategori</label>
            <input v-model="form.kategori" class="input-field" placeholder="Fiksi, Pelajaran, dll" />
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 p-4">
        <button class="btn-secondary" @click="showModal = false">Batal</button>
        <button class="btn-primary" :disabled="saving" @click="saveBook">
          <Save class="h-4 w-4" /> {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </div>
    </BaseModal>

    <!-- Modal Import Excel -->
    <BaseModal v-model="showImportModal" title="Import Buku via Excel">
      <div class="space-y-4">
        <!-- Template Area -->
        <div class="flex items-center justify-between rounded-xl bg-blue-50/50 p-4 border border-blue-100">
          <div>
            <h4 class="text-sm font-semibold text-blue-800">Template Excel</h4>
            <p class="text-xs text-blue-600 mt-1">Gunakan template ini agar format data sesuai.</p>
          </div>
          <button class="btn-primary flex items-center gap-2 text-xs py-2 px-3 shrink-0" @click="downloadTemplate">
            <FileDown class="h-4 w-4" /> Template
          </button>
        </div>

        <!-- Dropzone Area -->
        <div class="relative group mt-2">
          <input type="file" accept=".xlsx, .xls" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" @change="handleFileUpload" />
          <div class="rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 border-gray-200 bg-gray-50 group-hover:border-emerald-300 group-hover:bg-emerald-50/30">
            <div v-if="!saving" class="animate-in fade-in zoom-in duration-300">
              <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                <FileUp class="h-6 w-6" />
              </div>
              <p class="text-sm font-medium text-gray-700">Klik atau seret file Excel ke sini</p>
              <p class="mt-1 text-xs text-gray-500">Mendukung format .xlsx dan .xls</p>
            </div>
            <div v-else class="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
              <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-4 ring-emerald-100">
                <Loader2 class="h-6 w-6 animate-spin" />
              </div>
              <p class="text-sm font-bold text-emerald-800">Mengimpor Data...</p>
              <p class="mt-1 text-xs text-emerald-600 font-medium">Mohon tunggu sebentar</p>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- Modal Riwayat Peminjaman -->
    <BaseModal v-model="showHistoryModal" :title="`Riwayat: ${selectedHistoryBookTitle}`" maxWidth="3xl">
      <div class="p-5">
        <div v-if="loadingHistory" class="py-12 text-center text-gray-500">
          <Loader2 class="mx-auto h-8 w-8 animate-spin text-emerald-500" />
          <p class="mt-2 text-sm">Memuat riwayat peminjaman...</p>
        </div>
        
        <div v-else-if="!selectedBookHistory.length" class="py-12 text-center text-gray-500">
          Buku ini belum pernah dipinjam.
        </div>
        
        <div v-else class="space-y-4">
          <!-- Tampilan Tabel Responsif (Bisa digeser ke kanan-kiri di Mobile) -->
          <div class="overflow-x-auto rounded-xl border border-gray-100">
            <table class="min-w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-500">
                  <th class="px-4 py-3 font-semibold w-12 text-center">No</th>
                  <th class="px-4 py-3 font-semibold">Peminjam</th>
                  <th class="px-4 py-3 font-semibold text-center">Tgl Pinjam</th>
                  <th class="px-4 py-3 font-semibold text-center">Tenggat</th>
                  <th class="px-4 py-3 font-semibold text-center">Tgl Kembali</th>
                  <th class="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(h, idx) in paginatedBookHistory" :key="h.id" class="border-b border-gray-50 hover:bg-gray-50/50">
                  <td class="px-4 py-3 text-center text-gray-500">{{ (historyCurrentPage - 1) * historyItemsPerPage + idx + 1 }}</td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-800">{{ h.students?.nama || h.student_nisn }}</div>
                    <div class="text-xs text-gray-500">Kelas Saat Ini: {{ h.students?.kelas || '-' }}</div>
                  </td>
                  <td class="px-4 py-3 text-center text-gray-600">{{ new Date(h.tanggal_pinjam).toLocaleDateString('id-ID') }}</td>
                  <td class="px-4 py-3 text-center text-gray-600">{{ new Date(h.tanggal_kembali_seharusnya).toLocaleDateString('id-ID') }}</td>
                  <td class="px-4 py-3 text-center text-gray-600">
                    {{ h.tanggal_kembali_aktual ? new Date(h.tanggal_kembali_aktual).toLocaleDateString('id-ID') : '-' }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span :class="['inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold capitalize', getStatusBadge(h.status)]">
                      {{ h.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <Pagination
            v-if="selectedBookHistory.length > historyItemsPerPage"
            v-model="historyCurrentPage"
            :total-items="selectedBookHistory.length"
            :items-per-page="historyItemsPerPage"
            class="mt-2 rounded-2xl border border-gray-100"
          />
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 p-4">
        <button class="btn-secondary" @click="showHistoryModal = false">Tutup</button>
      </div>
    </BaseModal>
  </div>
</template>
