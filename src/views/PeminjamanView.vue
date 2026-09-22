<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { useAuthStore } from '@/stores/auth'
import { Plus, CheckCircle2, Search, Download, BookOpen, X, Undo2, AlarmClockOff, BookCheck } from 'lucide-vue-next'
import { exportPdfSirkulasi } from '@/lib/pdfSirkulasi'
import { useSettingsStore } from '@/stores/settings'
import {
  AppPageHeader, AppCard, AppTabs, AppInput, AppTable,
  AppBadge, AppModal, AppEmptyState, AppSkeleton,
  AppButton, AppPagination,
} from '@/components/ui'

const auth = useAuthStore()
const settingsStore = useSettingsStore()

const loans = ref([])
const loadingLoans = ref(false)
const saving = ref(false)
const filterStatus = ref('dipinjam')
const searchLoan = ref('')

const statusTabs = [
  { value: 'dipinjam', label: 'Sedang Dipinjam' },
  { value: 'semua', label: 'Semua Riwayat' },
]

const itemsPerPage = 20
const currentPage = ref(1)

const showReturnModal = ref(false)
const showLoanModal = ref(false)
const selectedLoan = ref(null)

const form = ref({ student_nisn: '', book_id: '', durasi_hari: 7 })
const searchSiswa = ref('')
const searchBuku = ref('')

const searchSiswaResult = ref([])
const searchBukuResult = ref([])
const searchingSiswa = ref(false)
const searchingBuku = ref(false)

const filteredStudents = computed(() => searchSiswaResult.value)
const filteredBooks = computed(() => searchBukuResult.value)
const selectedBookObj = ref(null)

const dueDatePreview = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + (form.value.durasi_hari || 0))
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})
const loanStep = computed(() => {
  if (!form.value.student_nisn) return 1
  if (!form.value.book_id) return 2
  return 3
})

watchDebounced(searchSiswa, async (newVal) => {
  if (!newVal || form.value.student_nisn) {
    searchSiswaResult.value = []
    return
  }
  searchingSiswa.value = true
  try {
    const { data } = await supabase
      .from('students')
      .select('nisn, nama, kelas')
      .eq('active', true)
      .or(`nama.ilike.%${newVal}%,nisn.ilike.%${newVal}%`)
      .limit(5)
    searchSiswaResult.value = data || []
  } finally {
    searchingSiswa.value = false
  }
}, { debounce: 500 })

watchDebounced(searchBuku, async (newVal) => {
  if (!newVal || form.value.book_id) {
    searchBukuResult.value = []
    return
  }
  searchingBuku.value = true
  try {
    const { data: b } = await supabase
      .from('books')
      .select('id, judul, stok')
      .ilike('judul', `%${newVal}%`)
      .limit(5)

    if (!b || b.length === 0) {
      searchBukuResult.value = []
      return
    }

    const bookIds = b.map((book) => book.id)
    const { data: l } = await supabase
      .from('book_loans')
      .select('book_id')
      .in('book_id', bookIds)
      .eq('status', 'dipinjam')

    const borrowedCounts = {}
    if (l) {
      l.forEach((loan) => {
        borrowedCounts[loan.book_id] = (borrowedCounts[loan.book_id] || 0) + 1
      })
    }

    searchBukuResult.value = b.map((book) => ({
      ...book,
      tersedia: book.stok - (borrowedCounts[book.id] || 0),
    }))
  } finally {
    searchingBuku.value = false
  }
}, { debounce: 500 })

async function fetchLoans() {
  loadingLoans.value = true
  try {
    let query = supabase.from('book_loans').select('*, books(judul), students(nama, kelas)')
    if (filterStatus.value === 'dipinjam') query = query.eq('status', 'dipinjam')
    query = query.order('tanggal_pinjam', { ascending: false })
    const { data } = await query
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
  selectedBookObj.value = b
}

function resetLoanForm() {
  form.value.student_nisn = ''
  form.value.book_id = ''
  searchSiswa.value = ''
  searchBuku.value = ''
  selectedBookObj.value = null
  form.value.durasi_hari = 7
}

async function submitPinjam() {
  if (!form.value.student_nisn || !form.value.book_id) {
    toast.error('Pilih siswa dan buku terlebih dahulu')
    return
  }

  const book = selectedBookObj.value
  if (!book || book.id !== form.value.book_id || book.tersedia < 1) {
    toast.error('Stok buku tidak tersedia atau buku tidak valid')
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
      guru_input: auth.user?.nama || 'Admin',
    }

    const { error } = await supabase.from('book_loans').insert(payload)
    if (error) throw error

    toast.success('Peminjaman berhasil dicatat')
    logActivity({ aksi: 'pinjam_buku', tabel_terkait: 'book_loans', detail: { student_nisn: payload.student_nisn, book_id: payload.book_id } })

    resetLoanForm()
    showLoanModal.value = false
    await fetchLoans()
  } catch (e) {
    toast.error('Gagal menyimpan: ' + e.message)
  } finally {
    saving.value = false
  }
}

const filteredLoans = computed(() => {
  const q = searchLoan.value.toLowerCase()
  return loans.value.filter((l) => !q || (l.students?.nama || '').toLowerCase().includes(q) || (l.books?.judul || '').toLowerCase().includes(q))
})

const paginatedLoans = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredLoans.value.slice(start, start + itemsPerPage)
})

const overdueCount = computed(() => filteredLoans.value.filter((l) => l.status === 'dipinjam' && isTerlambat(l.tanggal_kembali_seharusnya)).length)

watch([filterStatus, searchLoan], () => {
  currentPage.value = 1
})

async function handleDownloadPdf() {
  await exportPdfSirkulasi(
    filteredLoans.value,
    settingsStore.settings,
    filterStatus.value === 'dipinjam' ? 'Laporan Buku Sedang Dipinjam' : 'Laporan Seluruh Riwayat Sirkulasi',
  )
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
      .update({ status: 'dikembalikan', tanggal_kembali_aktual: new Date().toISOString().split('T')[0] })
      .eq('id', loan.id)

    if (error) throw error

    toast.success('Buku berhasil dikembalikan')
    logActivity({ aksi: 'kembalikan_buku', tabel_terkait: 'book_loans', detail: { loan_id: loan.id, book_id: loan.book_id } })

    showReturnModal.value = false
    selectedLoan.value = null
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
  hariIni.setHours(0, 0, 0, 0)
  return kembali < hariIni
}

function hariTerlambat(tgl) {
  const kembali = new Date(tgl)
  const hariIni = new Date()
  hariIni.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hariIni - kembali) / 86400000))
}

// Meta status pinjam: ikon + warna + label yang jelas bagi pengguna awam.
function loanStatusMeta(l) {
  if (l.status === 'dikembalikan') return { icon: CheckCircle2, tone: 'success', label: 'Dikembalikan' }
  if (isTerlambat(l.tanggal_kembali_seharusnya)) {
    const d = hariTerlambat(l.tanggal_kembali_seharusnya)
    return { icon: AlarmClockOff, tone: 'danger', label: d > 0 ? `Terlambat ${d} hari` : 'Terlambat' }
  }
  return { icon: BookOpen, tone: 'library', label: 'Dipinjam' }
}

function formatDateID(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const activeLoanCount = computed(() => filteredLoans.value.filter((l) => l.status === 'dipinjam').length)

onMounted(() => {
  fetchLoans()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader title="Sirkulasi" :subtitle="`${filteredLoans.length} transaksi ditampilkan`">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="handleDownloadPdf">
          <template #icon><Download class="h-4 w-4" aria-hidden="true" /></template>
          PDF
        </AppButton>
        <AppButton variant="library" size="sm" @click="showLoanModal = true">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Pinjam Baru
        </AppButton>
      </template>
    </AppPageHeader>

    <AppCard>
      <div class="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <AppTabs v-model="filterStatus" :options="statusTabs" ariaLabel="Filter status sirkulasi" @update:model-value="fetchLoans" />
          <AppBadge v-if="activeLoanCount > 0" :label="`${activeLoanCount} dipinjam`" tone="library" :icon="BookOpen" />
          <AppBadge v-if="overdueCount > 0" :label="`${overdueCount} terlambat`" tone="danger" :icon="AlarmClockOff" />
        </div>
      </div>

      <AppInput v-model="searchLoan" placeholder="Cari nama peminjam / judul buku…" aria-label="Cari transaksi" class="mb-3">
        <template #leading><Search class="h-4 w-4" aria-hidden="true" /></template>
      </AppInput>

      <div v-if="loadingLoans">
        <AppSkeleton type="table" :rows="5" />
      </div>
      <AppEmptyState
        v-else-if="!paginatedLoans.length"
        title="Tidak ada data sirkulasi"
        description="Belum ada transaksi pada filter ini. Catat peminjaman baru untuk memulai."
        :icon="BookOpen"
      >
        <template #action>
          <AppButton v-if="searchLoan" size="sm" variant="secondary" @click="searchLoan = ''">Hapus Pencarian</AppButton>
          <AppButton size="sm" variant="library" @click="showLoanModal = true">Pinjam Baru</AppButton>
        </template>
      </AppEmptyState>
      <div v-else class="table-scroll -mx-4 border-y border-slate-100 px-0 sm:mx-0 sm:rounded-xl sm:border sm:px-0">
        <table class="table whitespace-nowrap">
          <thead>
            <tr>
              <th>Peminjam</th>
              <th>Buku</th>
              <th>Tgl Pinjam</th>
              <th>Batas Kembali</th>
              <th class="!text-center">Status</th>
              <th class="!text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in paginatedLoans" :key="l.id" :class="l.status === 'dipinjam' && isTerlambat(l.tanggal_kembali_seharusnya) ? 'row-alert' : ''">
              <td>
                <div class="flex items-center gap-2.5">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700" aria-hidden="true">
                    {{ (l.students?.nama || '?').charAt(0).toUpperCase() }}
                  </span>
                  <div class="min-w-0">
                    <p class="cell-main">{{ l.students?.nama }}</p>
                    <p class="cell-sub">Kelas {{ l.students?.kelas }}</p>
                  </div>
                </div>
              </td>
              <td class="max-w-[220px] truncate">{{ l.books?.judul }}</td>
              <td class="!text-[13px] text-slate-500">{{ formatDateID(l.tanggal_pinjam) }}</td>
              <td>
                <span
                  class="inline-flex items-center gap-1.5 text-[13px] tnum"
                  :class="l.status === 'dipinjam' && isTerlambat(l.tanggal_kembali_seharusnya) ? 'font-semibold text-rose-600' : 'text-slate-600'"
                >
                  <AlarmClockOff v-if="l.status === 'dipinjam' && isTerlambat(l.tanggal_kembali_seharusnya)" class="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                  {{ formatDateID(l.tanggal_kembali_seharusnya) }}
                </span>
              </td>
              <td class="!text-center">
                <AppBadge :label="loanStatusMeta(l).label" :tone="loanStatusMeta(l).tone" :icon="loanStatusMeta(l).icon" />
              </td>
              <td class="!text-right">
                <!-- Aksi jelas untuk pengguna awam: panah "kembalikan" (Undo2) + biru khas modul perpustakaan -->
                <AppButton v-if="l.status === 'dipinjam'" variant="library" size="sm" @click="confirmKembalikan(l)">
                  <template #icon><Undo2 class="h-3.5 w-3.5" aria-hidden="true" /></template>
                  Kembalikan
                </AppButton>
                <span v-else class="text-sm text-slate-300" aria-hidden="true">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loadingLoans && filteredLoans.length > 0" class="mt-1 border-t border-slate-100">
        <AppPagination v-model="currentPage" :total-items="filteredLoans.length" :items-per-page="itemsPerPage" />
      </div>
    </AppCard>

    <!-- Peminjaman baru: langkah 1 siswa → 2 buku → 3 durasi & konfirmasi -->
    <AppModal v-model="showLoanModal" title="Catat Peminjaman Baru" subtitle="Ikuti langkah untuk mencatat sirkulasi">
      <!-- Step indicator -->
      <ol class="mb-4 flex items-center gap-1.5 text-xs font-medium" aria-label="Langkah peminjaman">
        <li class="flex items-center gap-1.5" :class="loanStep >= 1 ? 'text-blue-700' : 'text-slate-400'">
          <span class="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" :class="loanStep >= 1 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'">1</span>
          Siswa
        </li>
        <li class="h-px flex-1 bg-slate-200" aria-hidden="true" />
        <li class="flex items-center gap-1.5" :class="loanStep >= 2 ? 'text-blue-700' : 'text-slate-400'">
          <span class="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" :class="loanStep >= 2 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'">2</span>
          Buku
        </li>
        <li class="h-px flex-1 bg-slate-200" aria-hidden="true" />
        <li class="flex items-center gap-1.5" :class="loanStep >= 3 ? 'text-blue-700' : 'text-slate-400'">
          <span class="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" :class="loanStep >= 3 ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'">3</span>
          Durasi
        </li>
      </ol>

      <div class="flex flex-col gap-4">
        <!-- Step 1: siswa -->
        <div class="relative">
          <label class="input-label" for="pinjam-siswa">1 · Siswa peminjam</label>
          <div class="relative">
            <input
              id="pinjam-siswa"
              v-model="searchSiswa"
              class="input-field pl-9"
              placeholder="Ketik nama atau NISN…"
              autocomplete="off"
              role="combobox"
              aria-expanded="false"
              @input="form.student_nisn = ''"
            />
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <button v-if="form.student_nisn" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Hapus siswa terpilih" @click="form.student_nisn = ''; searchSiswa = ''">
              <X class="h-4 w-4" />
            </button>
          </div>
          <p v-if="searchingSiswa" class="input-hint">Mencari…</p>
          <ul
            v-if="searchSiswa && !form.student_nisn && filteredStudents.length"
            class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-modal"
            role="listbox"
          >
            <li v-for="s in filteredStudents" :key="s.nisn">
              <button class="dropdown-item !min-h-[3rem] flex-col !items-start !gap-0.5" role="option" @click="selectStudent(s)">
                <span class="font-medium text-slate-800">{{ s.nama }}</span>
                <span class="text-xs text-slate-400">Kelas {{ s.kelas }} · {{ s.nisn }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Step 2: buku -->
        <div class="relative">
          <label class="input-label" for="pinjam-buku">2 · Buku yang dipinjam</label>
          <div class="relative">
            <input
              id="pinjam-buku"
              v-model="searchBuku"
              class="input-field pl-9"
              placeholder="Ketik judul buku…"
              autocomplete="off"
              role="combobox"
              @input="form.book_id = ''"
            />
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <button v-if="form.book_id" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Hapus buku terpilih" @click="form.book_id = ''; searchBuku = ''">
              <X class="h-4 w-4" />
            </button>
          </div>
          <p v-if="searchingBuku" class="input-hint">Mencari…</p>
          <ul
            v-if="searchBuku && !form.book_id && filteredBooks.length"
            class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-modal"
            role="listbox"
          >
            <li v-for="b in filteredBooks" :key="b.id">
              <button class="dropdown-item !min-h-[3rem] flex-col !items-start !gap-0.5" role="option" @click="selectBook(b)">
                <span class="font-medium text-slate-800">{{ b.judul }}</span>
                <span class="text-xs font-semibold" :class="b.tersedia > 0 ? 'text-emerald-600' : 'text-rose-600'">
                  Tersedia {{ b.tersedia }} dari {{ b.stok }} eksemplar
                </span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Step 3: durasi -->
        <div>
          <label class="input-label" for="pinjam-durasi">3 · Durasi pinjam (hari)</label>
          <input id="pinjam-durasi" v-model.number="form.durasi_hari" type="number" min="1" max="60" class="input-field" />
          <p class="input-hint">Batas kembali: <strong class="text-slate-600">{{ dueDatePreview }}</strong></p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showLoanModal = false; resetLoanForm()">Batal</AppButton>
        <AppButton variant="library" :loading="saving" :disabled="!form.student_nisn || !form.book_id" @click="submitPinjam">
          {{ saving ? 'Memproses…' : 'Pinjamkan Buku' }}
        </AppButton>
      </template>
    </AppModal>

    <!-- Konfirmasi pengembalian -->
    <AppModal v-model="showReturnModal" title="Konfirmasi Pengembalian" max-width="max-w-md">
      <div v-if="selectedLoan" class="flex flex-col gap-4">
        <div class="flex items-start gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100" aria-hidden="true">
            <BookCheck class="h-5 w-5" />
          </span>
          <p class="pt-1 text-sm leading-relaxed text-slate-700">
            Terima buku yang dikembalikan oleh peminjam berikut?
          </p>
        </div>

        <!-- Ringkasan transaksi -->
        <dl class="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm">
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt class="shrink-0 text-slate-400">Buku</dt>
            <dd class="text-right font-medium text-slate-800">{{ selectedLoan.books?.judul }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 py-2">
            <dt class="shrink-0 text-slate-400">Peminjam</dt>
            <dd class="text-right font-medium text-slate-800">
              {{ selectedLoan.students?.nama }}
              <span class="font-normal text-slate-400">· Kelas {{ selectedLoan.students?.kelas }}</span>
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3 pt-2">
            <dt class="shrink-0 text-slate-400">Batas kembali</dt>
            <dd class="text-right">
              <span
                class="inline-flex items-center gap-1.5 tnum"
                :class="isTerlambat(selectedLoan.tanggal_kembali_seharusnya) ? 'font-semibold text-rose-600' : 'text-slate-700'"
              >
                <AlarmClockOff v-if="isTerlambat(selectedLoan.tanggal_kembali_seharusnya)" class="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                {{ formatDateID(selectedLoan.tanggal_kembali_seharusnya) }}
              </span>
              <AppBadge
                v-if="isTerlambat(selectedLoan.tanggal_kembali_seharusnya)"
                class="ml-2"
                :label="`Terlambat ${hariTerlambat(selectedLoan.tanggal_kembali_seharusnya)} hari`"
                tone="danger"
                :icon="AlarmClockOff"
              />
            </dd>
          </div>
        </dl>

        <p class="text-xs leading-relaxed text-slate-400">
          Setelah dikonfirmasi, status menjadi <strong class="text-slate-500">dikembalikan</strong> dan stok buku bertambah otomatis.
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showReturnModal = false">Batal</AppButton>
        <AppButton variant="library" :loading="saving" @click="doKembalikanBuku">
          <template #icon><Undo2 class="h-4 w-4" aria-hidden="true" /></template>
          {{ saving ? 'Memproses…' : 'Ya, Terima Buku' }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
