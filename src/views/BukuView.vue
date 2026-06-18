<script setup>
import { ref, onMounted, computed } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { Plus, Edit, Trash2, Save, Upload, Loader2, Book, FileDown } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import * as XLSX from 'xlsx'

const books = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const showImportModal = ref(false)
const searchQuery = ref('')
const fileInput = ref(null)

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

const filteredBooks = computed(() => {
  if (!searchQuery.value) return books.value
  const q = searchQuery.value.toLowerCase()
  return books.value.filter(b => b.judul.toLowerCase().includes(q) || (b.pengarang && b.pengarang.toLowerCase().includes(q)))
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

function downloadTemplate() {
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

onMounted(fetchBooks)
</script>

<template>
  <div>
    <PageHeader title="Katalog Buku" subtitle="Manajemen koleksi perpustakaan">
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
      <table class="min-w-full text-left text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-gray-500">
            <th class="px-4 py-3 font-semibold">Judul Buku</th>
            <th class="px-4 py-3 font-semibold">Pengarang & Penerbit</th>
            <th class="px-4 py-3 font-semibold text-center">Stok</th>
            <th class="px-4 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="px-4 py-8 text-center text-gray-500">
              <Loader2 class="mx-auto h-6 w-6 animate-spin text-emerald-500" />
              <p class="mt-2">Memuat buku...</p>
            </td>
          </tr>
          <tr v-else-if="!filteredBooks.length">
            <td colspan="4" class="px-4 py-8 text-center text-gray-500">
              Belum ada buku atau pencarian tidak ditemukan.
            </td>
          </tr>
          <tr v-for="b in filteredBooks" :key="b.id" class="border-b border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="font-semibold text-gray-800">{{ b.judul }}</div>
              <div class="text-xs text-gray-500">Kategori: {{ b.kategori || '-' }} | ISBN: {{ b.isbn || '-' }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="text-gray-700">{{ b.pengarang || '-' }}</div>
              <div class="text-xs text-gray-500">{{ b.penerbit || '-' }} ({{ b.tahun_terbit || '-' }})</div>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="text-sm font-bold text-gray-800">Total: {{ b.stok }}</div>
              <div class="text-xs font-medium text-rose-600">Dipinjam: {{ b.dipinjam }}</div>
              <div class="text-xs font-semibold text-emerald-600">Sisa: {{ b.tersedia }}</div>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button class="rounded-lg p-2 text-amber-600 hover:bg-amber-50" @click="openModal(b)">
                  <Edit class="h-4 w-4" />
                </button>
                <button class="rounded-lg p-2 text-rose-600 hover:bg-rose-50" @click="deleteBook(b.id, b.judul)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
      <div class="p-5">
        <p class="mb-4 text-sm text-gray-600">
          Gunakan file Excel untuk menambahkan banyak buku sekaligus. Pastikan format kolom sesuai dengan template (Judul, Pengarang, Penerbit, Tahun, ISBN, Stok, Kategori).
        </p>
        <button class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="downloadTemplate">
          <FileDown class="h-4 w-4" /> Download Template Excel
        </button>
        
        <div class="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <input ref="fileInput" type="file" accept=".xlsx, .xls" class="hidden" @change="handleFileUpload" />
          <Upload class="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <p class="mb-2 text-sm font-medium text-gray-700">Pilih file Excel dari perangkat Anda</p>
          <button class="btn-primary mx-auto" :disabled="saving" @click="fileInput.click()">
            {{ saving ? 'Mengimpor...' : 'Browse File' }}
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
