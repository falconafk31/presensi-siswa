<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { useAuthStore } from '@/stores/auth'
import { Plus, CheckCircle2, Clock, AlertTriangle, Loader2, Search, Download } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import { exportPdfSirkulasi } from '@/lib/pdfSirkulasi'

const auth = useAuthStore()

const loans = ref([])
const loadingLoans = ref(false)
const saving = ref(false)
const filterStatus = ref('dipinjam')
const searchLoan = ref('')

// Pagination
const itemsPerPage = 50
const currentPage = ref(1)

// Modal Pengembalian
const showReturnModal = ref(false)
const selectedLoan = ref(null)

const students = ref([])
const books = ref([])

// Form Peminjaman
const form = ref({
  student_nisn: '',
  book_id: '',
  durasi_hari: 7
})
const searchSiswa = ref('')
const searchBuku = ref('')

const filteredStudents = computed(() => {
  if (!searchSiswa.value) return []
  const q = searchSiswa.value.toLowerCase()
  return students.value.filter(s => s.nama.toLowerCase().includes(q) || s.nisn.includes(q)).slice(0, 5)
})

const filteredBooks = computed(() => {
  if (!searchBuku.value) return []
  const q = searchBuku.value.toLowerCase()
  return books.value.filter(b => b.judul.toLowerCase().includes(q)).slice(0, 5)
})

async function fetchMasterData() {
  const [{ data: s }, { data: b }, { data: l }] = await Promise.all([
    supabase.from('students').select('nisn, nama, kelas').eq('active', true),
    supabase.from('books').select('id, judul, stok'),
    supabase.from('book_loans').select('book_id').eq('status', 'dipinjam')
  ])

  // Hitung jumlah buku yang sedang dipinjam
  const borrowedCounts = {}
  if (l) {
    l.forEach(loan => {
      borrowedCounts[loan.book_id] = (borrowedCounts[loan.book_id] || 0) + 1
    })
  }

  students.value = s || []
  books.value = (b || []).map(book => ({
    ...book,
    tersedia: book.stok - (borrowedCounts[book.id] || 0)
  }))
}

async function fetchLoans() {
  loadingLoans.value = true
  try {
    let query = supabase
      .from('book_loans')
      .select('*, books(judul), students(nama, kelas)')
      
    if (filterStatus.value === 'dipinjam') {
      query = query.eq('status', 'dipinjam')
    }
    
    query = query.order('tanggal_pinjam', { ascending: false })

    const { data, error } = await query
    loans.value = data || []
  } catch (e) {
    toast.error('Gagal memuat sirkulasi: ' + e.message)
  } finally {
    loadingLoans.value = false
  }
}

function selectStudent(s) {
  form.value.student_nisn = s.nisn
  searchSiswa.value = `${s.nama} (${s.kelas})`
}

function selectBook(b) {
  form.value.book_id = b.id
  searchBuku.value = b.judul
}

async function submitPinjam() {
  if (!form.value.student_nisn || !form.value.book_id) {
    toast.error('Pilih siswa dan buku terlebih dahulu')
    return
  }

  const book = books.value.find(b => b.id === form.value.book_id)
  if (!book || book.tersedia < 1) {
    toast.error('Stok buku tidak tersedia atau sedang habis dipinjam')
    return
  }

  saving.value = true
  try {
    const today = new Date()
    const tglKembali = new Date(today)
    tglKembali.setDate(tglKembali.getDate() + form.value.durasi_hari)

    const payload = {
      book_id: form.value.book_id,
      student_nisn: form.value.student_nisn,
      tanggal_pinjam: today.toISOString().split('T')[0],
      tanggal_kembali_seharusnya: tglKembali.toISOString().split('T')[0],
      status: 'dipinjam',
      guru_input: auth.user?.nama || 'Admin'
    }

    const { error } = await supabase.from('book_loans').insert(payload)
    if (error) throw error

    toast.success('Peminjaman berhasil dicatat')
    logActivity({ aksi: 'pinjam_buku', tabel_terkait: 'book_loans', detail: { student_nisn: payload.student_nisn, book_id: payload.book_id } })
    
    // Reset form
    form.value.student_nisn = ''
    form.value.book_id = ''
    searchSiswa.value = ''
    searchBuku.value = ''
    form.value.durasi_hari = 7

    await fetchMasterData() // Refresh data stok buku
    await fetchLoans()
  } catch (e) {
    toast.error('Gagal menyimpan: ' + e.message)
  } finally {
    saving.value = false
  }
}

const filteredLoans = computed(() => {
  const q = searchLoan.value.toLowerCase()
  return loans.value.filter(l => {
    return !q || (l.students?.nama || '').toLowerCase().includes(q) || (l.books?.judul || '').toLowerCase().includes(q)
  })
})

const totalPages = computed(() => Math.ceil(filteredLoans.value.length / itemsPerPage))

const paginatedLoans = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredLoans.value.slice(start, start + itemsPerPage)
})

watch([filterStatus, searchLoan], () => {
  currentPage.value = 1
})

function handleDownloadPdf() {
  exportPdfSirkulasi(filteredLoans.value, filterStatus.value === 'dipinjam' ? 'Laporan Buku Sedang Dipinjam' : 'Laporan Seluruh Riwayat Sirkulasi')
}

function confirmKembalikan(loan) {
  selectedLoan.value = loan
  showReturnModal.value = true
}

async function doKembalikanBuku() {
  if (!selectedLoan.value) return
  const loan = selectedLoan.value
  
  saving.value = true
  try {
    const { error } = await supabase
      .from('book_loans')
      .update({
        status: 'dikembalikan',
        tanggal_kembali_aktual: new Date().toISOString().split('T')[0]
      })
      .eq('id', loan.id)
      
    if (error) throw error

    toast.success('Buku berhasil dikembalikan')
    logActivity({ aksi: 'kembalikan_buku', tabel_terkait: 'book_loans', detail: { loan_id: loan.id, book_id: loan.book_id } })
    
    showReturnModal.value = false
    selectedLoan.value = null

    await fetchMasterData()
    await fetchLoans()
  } catch (e) {
    toast.error('Gagal memproses: ' + e.message)
  } finally {
    saving.value = false
  }
}

function isTerlambat(tgl) {
  const kembali = new Date(tgl)
  const hariIni = new Date()
  hariIni.setHours(0,0,0,0)
  return kembali < hariIni
}

onMounted(() => {
  fetchMasterData()
  fetchLoans()
})
</script>

<template>
  <div>
    <PageHeader title="Sirkulasi Buku" subtitle="Peminjaman dan pengembalian perpustakaan" />

    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <!-- Panel Input Peminjaman -->
      <div class="card space-y-4 lg:col-span-1">
        <h3 class="font-semibold text-gray-800">Catat Peminjaman Baru</h3>
        
        <div class="relative">
          <label class="mb-1 block text-sm font-medium text-gray-700">Pencarian Siswa</label>
          <div class="relative">
            <input v-model="searchSiswa" @input="form.student_nisn = ''" class="input-field pl-9" placeholder="Ketik nama atau NISN..." />
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <!-- Hasil Pencarian Siswa -->
          <ul v-if="searchSiswa && !form.student_nisn && filteredStudents.length" class="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
            <li v-for="s in filteredStudents" :key="s.nisn" class="cursor-pointer px-4 py-2 hover:bg-gray-50 text-sm" @click="selectStudent(s)">
              <div class="font-medium text-gray-800">{{ s.nama }}</div>
              <div class="text-xs text-gray-500">Kelas {{ s.kelas }} | NISN: {{ s.nisn }}</div>
            </li>
          </ul>
        </div>

        <div class="relative">
          <label class="mb-1 block text-sm font-medium text-gray-700">Pencarian Buku</label>
          <div class="relative">
            <input v-model="searchBuku" @input="form.book_id = ''" class="input-field pl-9" placeholder="Ketik judul buku..." />
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <!-- Hasil Pencarian Buku -->
          <ul v-if="searchBuku && !form.book_id && filteredBooks.length" class="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
            <li v-for="b in filteredBooks" :key="b.id" class="cursor-pointer px-4 py-2 hover:bg-gray-50 text-sm" @click="selectBook(b)">
              <div class="font-medium text-gray-800">{{ b.judul }}</div>
              <div class="text-xs font-semibold" :class="b.tersedia > 0 ? 'text-emerald-600' : 'text-rose-600'">
                Tersedia: {{ b.tersedia }} dari {{ b.stok }} eksemplar
              </div>
            </li>
          </ul>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Durasi Pinjam (Hari)</label>
          <input v-model.number="form.durasi_hari" type="number" min="1" class="input-field" />
        </div>

        <button class="btn-primary w-full" :disabled="saving || !form.student_nisn || !form.book_id" @click="submitPinjam">
          <Plus class="h-4 w-4" /> {{ saving ? 'Memproses...' : 'Pinjamkan Buku' }}
        </button>
      </div>

      <!-- Panel Daftar Pinjaman Aktif -->
      <div class="card lg:col-span-2">
        <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 class="font-semibold text-gray-800">Daftar Sirkulasi Buku</h3>
          <div class="flex items-center gap-2">
            <select v-model="filterStatus" class="input-field py-1.5 text-sm" @change="fetchLoans">
              <option value="dipinjam">Sedang Dipinjam</option>
              <option value="semua">Semua Riwayat</option>
            </select>
            <button class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50" @click="handleDownloadPdf">
              <Download class="h-4 w-4" /> PDF
            </button>
          </div>
        </div>
        
        <div class="mb-3 relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input v-model="searchLoan" class="input-field pl-9 py-1.5 text-sm" placeholder="Cari nama peminjam / judul buku..." />
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-gray-500">
                <th class="px-3 py-2 font-semibold">Peminjam</th>
                <th class="px-3 py-2 font-semibold">Buku</th>
                <th class="px-3 py-2 font-semibold">Batas Kembali</th>
                <th class="px-3 py-2 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingLoans">
                <td colspan="4" class="px-3 py-6 text-center text-gray-500">
                  <Loader2 class="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
              <tr v-else-if="!paginatedLoans.length">
                <td colspan="4" class="px-3 py-6 text-center text-gray-400">Tidak ada data peminjaman.</td>
              </tr>
              <tr v-for="l in paginatedLoans" :key="l.id" class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td class="px-3 py-2">
                  <div class="font-semibold text-gray-800">{{ l.students?.nama }}</div>
                  <div class="text-xs text-gray-500">Kelas {{ l.students?.kelas }}</div>
                </td>
                <td class="px-3 py-2 text-gray-700">
                  {{ l.books?.judul }}
                </td>
                <td class="px-3 py-2">
                  <div v-if="isTerlambat(l.tanggal_kembali_seharusnya)" class="flex items-center gap-1 font-semibold text-rose-600">
                    <AlertTriangle class="h-4 w-4" /> Terlambat!
                  </div>
                  <div v-else class="flex items-center gap-1 text-gray-600">
                    <Clock class="h-4 w-4" /> {{ l.tanggal_kembali_seharusnya }}
                  </div>
                </td>
                <td class="px-3 py-2 text-right">
                  <button v-if="l.status === 'dipinjam'" class="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100" @click="confirmKembalikan(l)">
                    <CheckCircle2 class="h-3.5 w-3.5" />
                    Kembalikan
                  </button>
                  <span v-else class="text-xs text-gray-500 italic">Telah Dikembalikan</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-gray-600">
          <div>
            Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredLoans.length) }} dari {{ filteredLoans.length }} baris
          </div>
          <div class="flex gap-2">
            <button 
              class="rounded-lg border border-gray-200 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              Seb.
            </button>
            <div class="flex items-center px-2 font-medium">{{ currentPage }} / {{ totalPages }}</div>
            <button 
              class="rounded-lg border border-gray-200 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              Selan.
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal Konfirmasi Pengembalian -->
    <BaseModal v-model="showReturnModal" title="Konfirmasi Pengembalian" max-width="max-w-md">
      <div v-if="selectedLoan" class="space-y-4">
        <div class="rounded-xl bg-sky-50 p-4 text-sm text-sky-800">
          Apakah Anda yakin ingin menandai buku <strong>"{{ selectedLoan.books?.judul }}"</strong> 
          telah dikembalikan oleh <strong>{{ selectedLoan.students?.nama }}</strong>?
        </div>
        <p class="text-xs text-gray-500">
          Aksi ini akan mengubah status buku menjadi "dikembalikan" dan stok buku di perpustakaan akan bertambah kembali.
        </p>
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showReturnModal = false">Batal</button>
        <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" :disabled="saving" @click="doKembalikanBuku">
          <CheckCircle2 class="h-4 w-4" /> {{ saving ? 'Memproses...' : 'Ya, Kembalikan' }}
        </button>
      </template>
    </BaseModal>

  </div>
</template>
