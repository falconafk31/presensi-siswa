<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { Book, Plus, Edit, Trash2, Upload, ArrowUp, ArrowDown, ArrowUpDown, FileDown, FileUp, Info, Search, X, UserRound, CalendarPlus, CalendarClock, CalendarCheck2, Activity, BookOpen, CheckCircle2, AlarmClockOff, SearchX } from 'lucide-vue-next'
import {
  AppPageHeader, AppFilterBar, AppInput, AppTable, AppBadge,
  AppModal, AppConfirmDialog, AppEmptyState, AppSkeleton,
  AppButton, AppPagination,
} from '@/components/ui'

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

const showDeleteConfirm = ref(false)
const bookToDelete = ref(null)
const deleting = ref(false)

const form = ref({
  id: null,
  judul: '',
  pengarang: '',
  penerbit: '',
  tahun_terbit: '',
  isbn: '',
  stok: 1,
  kategori: '',
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
function ariaSort(key) {
  if (sortKey.value !== key) return 'none'
  return sortOrder.value === 'asc' ? 'ascending' : 'descending'
}

const filteredBooks = computed(() => {
  let result = books.value

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((b) => b.judul.toLowerCase().includes(q) || (b.pengarang && b.pengarang.toLowerCase().includes(q)))
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
      supabase.from('book_loans').select('book_id').eq('status', 'dipinjam'),
    ])

    if (error) throw error

    const borrowedCounts = {}
    if (l) {
      l.forEach((loan) => {
        borrowedCounts[loan.book_id] = (borrowedCounts[loan.book_id] || 0) + 1
      })
    }

    books.value = (b || []).map((book) => {
      const dipinjam = borrowedCounts[book.id] || 0
      return { ...book, dipinjam, tersedia: book.stok - dipinjam }
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
    form.value = { id: null, judul: '', pengarang: '', penerbit: '', tahun_terbit: '', isbn: '', stok: 1, kategori: '' }
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
      kategori: form.value.kategori,
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

function confirmDeleteBook(book) {
  bookToDelete.value = book
  showDeleteConfirm.value = true
}

async function deleteBook() {
  if (!bookToDelete.value) return
  deleting.value = true
  try {
    const { error } = await supabase.from('books').delete().eq('id', bookToDelete.value.id)
    if (error) throw error
    toast.success('Buku berhasil dihapus')
    logActivity({ aksi: 'hapus_buku', tabel_terkait: 'books', record_id: bookToDelete.value.id, detail: { judul: bookToDelete.value.judul } })
    showDeleteConfirm.value = false
    bookToDelete.value = null
    fetchBooks()
  } catch (e) {
    toast.error('Gagal menghapus buku: ' + e.message)
  } finally {
    deleting.value = false
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
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)

      if (!jsonData.length) {
        toast.error('File Excel kosong atau format salah')
        return
      }

      const payload = jsonData.map((row) => ({
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
      if (fileInput.value) fileInput.value.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

async function downloadTemplate() {
  const XLSX = await import('xlsx')
  const wsData = [
    ['Judul', 'Pengarang', 'Penerbit', 'Tahun', 'ISBN', 'Stok', 'Kategori'],
    ['Laskar Pelangi', 'Andrea Hirata', 'Bentang Pustaka', '2005', '978-979-3062-79-2', 5, 'Fiksi'],
    ['Buku Tema 1', 'Kemdikbud', 'Pusat Kurikulum', '2018', '', 30, 'Pelajaran'],
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 15 }]
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

const historyStatusTone = { dipinjam: 'info', dikembalikan: 'success', terlambat: 'danger', hilang: 'neutral' }
function formatDateID(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(fetchBooks)
</script>

<template>
  <div class="page-stack">
    <AppPageHeader title="Data Koleksi" :subtitle="`${filteredBooks.length} judul ditampilkan`">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="showImportModal = true">
          <template #icon><Upload class="h-4 w-4" aria-hidden="true" /></template>
          Import Excel
        </AppButton>
        <AppButton variant="library" size="sm" @click="openModal()">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Tambah Buku
        </AppButton>
      </template>
    </AppPageHeader>

    <AppFilterBar columns="sm:grid-cols-2">
      <AppInput v-model="searchQuery" placeholder="Cari judul atau pengarang…" aria-label="Cari buku">
        <template #leading><Search class="h-4 w-4" aria-hidden="true" /></template>
      </AppInput>
      <template v-if="searchQuery" #footer>
        <span class="text-[13px] text-slate-500">{{ filteredBooks.length }} hasil</span>
        <button class="link inline-flex items-center gap-1 text-[13px]" @click="searchQuery = ''">
          <X class="h-3.5 w-3.5" aria-hidden="true" /> Hapus pencarian
        </button>
      </template>
    </AppFilterBar>

    <div v-if="loading" class="card-flat p-4">
      <AppSkeleton type="table" :rows="6" />
    </div>
    <div v-else-if="!filteredBooks.length" class="card-flat p-4">
      <AppEmptyState
        title="Koleksi tidak ditemukan"
        description="Belum ada buku atau pencarian tidak cocok. Tambahkan buku baru atau impor dari Excel."
        :icon="Book"
      >
        <template #action>
          <AppButton size="sm" variant="secondary" @click="searchQuery = ''">Hapus Pencarian</AppButton>
          <AppButton size="sm" variant="library" @click="openModal()">Tambah Buku</AppButton>
        </template>
      </AppEmptyState>
    </div>
    <AppTable v-else sticky-header caption="Daftar koleksi buku">
      <thead>
        <tr>
          <th class="w-12 !text-center">No</th>
          <th class="cursor-pointer select-none" :aria-sort="ariaSort('judul')" @click="setSort('judul')">
            <span class="inline-flex items-center gap-1.5">
              Judul Buku
              <ArrowUp v-if="sortKey === 'judul' && sortOrder === 'asc'" class="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <ArrowDown v-else-if="sortKey === 'judul' && sortOrder === 'desc'" class="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <ArrowUpDown v-else class="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
            </span>
          </th>
          <th class="cursor-pointer select-none" :aria-sort="ariaSort('pengarang')" @click="setSort('pengarang')">
            <span class="inline-flex items-center gap-1.5">
              Pengarang & Penerbit
              <ArrowUp v-if="sortKey === 'pengarang' && sortOrder === 'asc'" class="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <ArrowDown v-else-if="sortKey === 'pengarang' && sortOrder === 'desc'" class="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <ArrowUpDown v-else class="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
            </span>
          </th>
          <th class="!text-center cursor-pointer select-none" :aria-sort="ariaSort('stok')" title="Total eksemplar" @click="setSort('stok')">Total</th>
          <th class="!text-center cursor-pointer select-none" :aria-sort="ariaSort('dipinjam')" title="Sedang dipinjam" @click="setSort('dipinjam')">Pinjam</th>
          <th class="!text-center cursor-pointer select-none" :aria-sort="ariaSort('tersedia')" title="Sisa tersedia" @click="setSort('tersedia')">Sisa</th>
          <th class="!text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(b, idx) in paginatedBooks" :key="b.id">
          <td class="!text-center text-slate-400">{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
          <td>
            <p class="cell-main">{{ b.judul }}</p>
            <p class="cell-sub">{{ b.kategori || 'Tanpa kategori' }} · ISBN {{ b.isbn || '–' }}</p>
          </td>
          <td>
            <p class="text-slate-700">{{ b.pengarang || '–' }}</p>
            <p class="cell-sub">{{ b.penerbit || '–' }} ({{ b.tahun_terbit || '–' }})</p>
          </td>
          <td class="cell-num">{{ b.stok }}</td>
          <td class="cell-num" :class="b.dipinjam > 0 ? 'text-sky-700' : 'text-slate-300'">{{ b.dipinjam }}</td>
          <td class="cell-num" :class="b.tersedia > 0 ? 'text-emerald-700' : 'text-rose-600'">{{ b.tersedia }}</td>
          <td>
            <div class="flex justify-end gap-0.5">
              <button class="btn-icon !h-8 !w-8 hover:!bg-blue-50 hover:!text-blue-600" title="Riwayat peminjaman" :aria-label="`Riwayat ${b.judul}`" @click="openHistoryModal(b)">
                <Info class="h-4 w-4" />
              </button>
              <button class="btn-icon !h-8 !w-8" title="Edit buku" :aria-label="`Edit ${b.judul}`" @click="openModal(b)">
                <Edit class="h-4 w-4" />
              </button>
              <button class="btn-icon !h-8 !w-8 hover:!bg-rose-50 hover:!text-rose-600" title="Hapus buku" :aria-label="`Hapus ${b.judul}`" @click="confirmDeleteBook(b)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
      <template #footer>
        <AppPagination v-model="currentPage" :total-items="filteredBooks.length" :items-per-page="itemsPerPage" />
      </template>
    </AppTable>

    <!-- Form buku -->
    <AppModal v-model="showModal" :title="form.id ? 'Edit Buku' : 'Tambah Buku'" subtitle="Lengkapi data bibliografi">
      <div class="flex flex-col gap-3">
        <div>
          <label class="input-label" for="buku-judul">Judul buku <span class="text-rose-500" aria-hidden="true">*</span></label>
          <input id="buku-judul" v-model="form.judul" class="input-field" placeholder="Masukkan judul buku" />
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="input-label" for="buku-pengarang">Pengarang</label>
            <input id="buku-pengarang" v-model="form.pengarang" class="input-field" placeholder="Nama pengarang" />
          </div>
          <div>
            <label class="input-label" for="buku-penerbit">Penerbit</label>
            <input id="buku-penerbit" v-model="form.penerbit" class="input-field" placeholder="Nama penerbit" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="input-label" for="buku-tahun">Tahun terbit</label>
            <input id="buku-tahun" v-model="form.tahun_terbit" class="input-field" placeholder="Contoh: 2023" inputmode="numeric" />
          </div>
          <div>
            <label class="input-label" for="buku-isbn">ISBN</label>
            <input id="buku-isbn" v-model="form.isbn" class="input-field" placeholder="Kode ISBN" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="input-label" for="buku-stok">Stok <span class="text-rose-500" aria-hidden="true">*</span></label>
            <input id="buku-stok" v-model.number="form.stok" type="number" min="0" class="input-field" />
          </div>
          <div>
            <label class="input-label" for="buku-kategori">Kategori</label>
            <input id="buku-kategori" v-model="form.kategori" class="input-field" placeholder="Fiksi, Pelajaran, dll" list="kategori-buku" />
            <datalist id="kategori-buku">
              <option value="Fiksi" />
              <option value="Pelajaran" />
              <option value="Referensi" />
              <option value="Keagamaan" />
            </datalist>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showModal = false">Batal</AppButton>
        <AppButton variant="library" :loading="saving" @click="saveBook">{{ saving ? 'Menyimpan…' : 'Simpan' }}</AppButton>
      </template>
    </AppModal>

    <!-- Hapus buku -->
    <AppConfirmDialog
      v-model="showDeleteConfirm"
      title="Hapus Buku?"
      tone="danger"
      confirm-label="Hapus Buku"
      :loading="deleting"
      @confirm="deleteBook"
    >
      <template v-if="bookToDelete">
        <strong>{{ bookToDelete.judul }}</strong> akan dihapus dari koleksi. Riwayat peminjaman terkait ikut terhapus.
      </template>
    </AppConfirmDialog>

    <!-- Import Excel -->
    <AppModal v-model="showImportModal" title="Import Buku via Excel" subtitle="Tambahkan banyak judul sekaligus">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
          <div>
            <p class="text-sm font-semibold text-blue-800">Template Excel</p>
            <p class="mt-0.5 text-xs text-blue-600">Kolom: Judul · Pengarang · Penerbit · Tahun · ISBN · Stok · Kategori</p>
          </div>
          <AppButton variant="library" size="sm" @click="downloadTemplate">
            <template #icon><FileDown class="h-4 w-4" aria-hidden="true" /></template>
            Template
          </AppButton>
        </div>
        <div class="group relative">
          <input ref="fileInput" type="file" accept=".xlsx,.xls" class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" aria-label="Pilih file Excel" :disabled="saving" @change="handleFileUpload" />
          <div class="rounded-xl border-2 border-dashed p-7 text-center transition-colors" :class="saving ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 bg-slate-50 group-hover:border-blue-300'">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-xs ring-1 ring-slate-200">
              <FileUp class="h-5 w-5" :class="saving ? 'animate-pulse' : ''" aria-hidden="true" />
            </div>
            <p class="text-sm font-medium text-slate-700">{{ saving ? 'Mengimpor data…' : 'Klik atau seret file Excel ke sini' }}</p>
            <p class="mt-1 text-xs text-slate-400">Mendukung .xlsx dan .xls</p>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showImportModal = false">Tutup</AppButton>
      </template>
    </AppModal>

    <!-- Riwayat peminjaman -->
    <AppModal v-model="showHistoryModal" :title="`Riwayat: ${selectedHistoryBookTitle}`" max-width="max-w-3xl">
      <div v-if="loadingHistory" class="py-10 text-center">
        <AppSkeleton type="table" :rows="3" />
      </div>
      <AppEmptyState
        v-else-if="!selectedBookHistory.length"
        title="Belum pernah dipinjam"
        description="Buku ini belum memiliki riwayat peminjaman."
        :icon="Book"
      />
      <div v-else class="table-scroll rounded-xl border border-slate-100">
        <!-- Compact: baris satu baris, padding rapat — muat tanpa scroll di desktop -->
        <table class="table whitespace-nowrap history-compact">
          <thead>
            <tr>
              <th>
                <span class="th-ico"><UserRound class="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />Peminjam</span>
              </th>
              <th class="!text-center">
                <span class="th-ico"><CalendarPlus class="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />Tgl Pinjam</span>
              </th>
              <th class="!text-center">
                <span class="th-ico"><CalendarClock class="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />Tenggat</span>
              </th>
              <th class="!text-center">
                <span class="th-ico"><CalendarCheck2 class="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />Tgl Kembali</span>
              </th>
              <th class="!text-center">
                <span class="th-ico"><Activity class="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />Status</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in paginatedBookHistory" :key="h.id">
              <td>
                <span class="text-[13px] font-medium text-slate-800">{{ h.students?.nama || h.student_nisn }}</span>
                <span class="ml-1.5 text-xs text-slate-400">· Kelas {{ h.students?.kelas || '–' }}</span>
              </td>
              <td class="!text-center !text-[13px]">{{ formatDateID(h.tanggal_pinjam) }}</td>
              <td class="!text-center !text-[13px]">{{ formatDateID(h.tanggal_kembali_seharusnya) }}</td>
              <td class="!text-center !text-[13px]">{{ h.tanggal_kembali_aktual ? formatDateID(h.tanggal_kembali_aktual) : '–' }}</td>
              <td class="!text-center">
                <AppBadge :label="historyMeta(h.status).label" :tone="historyMeta(h.status).tone" :icon="historyMeta(h.status).icon" />
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="selectedBookHistory.length > historyItemsPerPage" class="border-t border-slate-100">
          <AppPagination v-model="historyCurrentPage" :total-items="selectedBookHistory.length" :items-per-page="historyItemsPerPage" />
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showHistoryModal = false">Tutup</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
/* Tabel riwayat compact — muat 10 baris tanpa scroll pada modal desktop */
.th-ico {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}
.history-compact thead th {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.history-compact tbody td {
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
}
.history-compact tbody tr:last-child td {
  border-bottom: 0;
}
</style>
