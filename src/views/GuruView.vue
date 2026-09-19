<script setup>
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { UserPlus, Pencil, Trash2, Search, GraduationCap, FileUp, FileDown, X, ShieldAlert } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { useSettingsStore } from '@/stores/settings'
import { createClient } from '@supabase/supabase-js'
import {
  AppPageHeader, AppFilterBar, AppInput, AppSelect, AppTable,
  AppBadge, AppModal, AppEmptyState, AppErrorState,
  AppSkeleton, AppButton,
} from '@/components/ui'

const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])

// Secondary client agar signUp tidak me-logout sesi Admin saat ini
const authClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const users = ref([])
const loading = ref(false)
const loadError = ref('')
const search = ref('')
const filterRole = ref('')
const showForm = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const editing = ref(false)

const emptyForm = () => ({ id: null, username: '', password: '', nama: '', role: 'Guru', kelas: '', nip: '' })
const form = ref(emptyForm())
const target = ref(null)

const showUpload = ref(false)
const uploadingExcel = ref(false)
const selectedFile = ref(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return users.value.filter((u) => {
    const okSearch = !q
      || (u.nama || '').toLowerCase().includes(q)
      || (u.username || '').toLowerCase().includes(q)
      || (u.nip || '').includes(q)
    const okRole = !filterRole.value || u.role === filterRole.value
    return okSearch && okRole
  })
})
const hasActiveFilter = computed(() => search.value.trim() !== '' || filterRole.value !== '')
function clearFilters() {
  search.value = ''
  filterRole.value = ''
}

const roleTone = { Admin: 'warning', Guru: 'success', Pustakawan: 'library', 'Guru & Pustakawan': 'primary' }

function openUpload() {
  selectedFile.value = null
  showUpload.value = true
}

async function downloadTemplate() {
  const xlsx = await import('xlsx')
  const ws = xlsx.utils.json_to_sheet([
    { Username: 'guru_mat', Password: 'password123', Nama: 'Fulan SPd', Role: 'Guru', 'Wali Kelas': '1A', NIP: '198001012010011001' },
  ])
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Template Guru')
  xlsx.writeFile(wb, 'Template_Upload_Guru.xlsx')
}

function onFileSelected(e) {
  selectedFile.value = e.target.files?.[0]
}

async function processUpload() {
  if (!selectedFile.value) return
  uploadingExcel.value = true
  try {
    const xlsx = await import('xlsx')
    const data = await selectedFile.value.arrayBuffer()
    const wb = xlsx.read(data)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(ws)

    if (!rows.length) throw new Error('File kosong atau format salah')

    const toInsert = rows.map((r) => {
      const roleText = String(r.Role || 'Guru').trim()
      let role = 'Guru'
      if (roleText.toLowerCase() === 'admin') role = 'Admin'
      else if (roleText.toLowerCase() === 'pustakawan') role = 'Pustakawan'
      else if (roleText.toLowerCase() === 'guru & pustakawan' || roleText.toLowerCase() === 'guru dan pustakawan') role = 'Guru & Pustakawan'

      const requiresKelas = role === 'Guru' || role === 'Guru & Pustakawan'

      return {
        username: String(r.Username || '').trim(),
        password: String(r.Password || '').trim(),
        nama: String(r.Nama || '').trim(),
        role,
        kelas: r['Wali Kelas'] && requiresKelas ? String(r['Wali Kelas']).trim().toUpperCase() : null,
        nip: r.NIP ? String(r.NIP).trim() : null,
      }
    }).filter((r) => r.username && r.nama && r.password)

    if (!toInsert.length) throw new Error('Tidak ada data valid (Username, Password, Nama wajib)')

    let successCount = 0
    let failCount = 0

    for (const user of toInsert) {
      const { error } = await authClient.auth.signUp({
        email: `${user.username}@minblora.id`,
        password: user.password,
        options: {
          data: { username: user.username, nama: user.nama, role: user.role, kelas: user.kelas, nip: user.nip },
        },
      })
      if (error) {
        console.error('Failed to upload user:', user.username, error)
        failCount++
      } else {
        successCount++
      }
    }

    if (successCount > 0) {
      await logActivity({ aksi: 'import_guru', tabel_terkait: 'users', detail: { jumlah: successCount } })
      toast.success(`${successCount} akun berhasil diupload` + (failCount > 0 ? ` (${failCount} gagal/sudah ada)` : ''))
    } else {
      throw new Error('Semua baris gagal diupload (kemungkinan username sudah dipakai)')
    }

    showUpload.value = false
    await load()
  } catch (e) {
    toast.error('Gagal upload: ' + e.message)
  } finally {
    uploadingExcel.value = false
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, nama, role, kelas, nip')
      .order('role')
      .order('nama')
    if (error) throw error
    users.value = data || []
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

function openEdit(u) {
  editing.value = true
  form.value = { id: u.id, username: u.username, password: '', nama: u.nama, role: u.role, kelas: u.kelas || '', nip: u.nip || '' }
  showForm.value = true
}

async function save() {
  if (!form.value.username || !form.value.nama) {
    toast.error('Username dan Nama wajib diisi')
    return
  }
  if (!editing.value && !form.value.password) {
    toast.error('Password wajib untuk akun baru')
    return
  }
  saving.value = true
  try {
    const payload = {
      username: form.value.username,
      nama: form.value.nama,
      role: form.value.role,
      kelas: (form.value.role === 'Guru' || form.value.role === 'Guru & Pustakawan') ? (form.value.kelas || null) : null,
      nip: form.value.nip || null,
    }

    if (editing.value) {
      const { error } = await supabase.from('users').update(payload).eq('id', form.value.id)
      if (error) throw error
      await logActivity({ aksi: 'update_guru', tabel_terkait: 'users', record_id: form.value.id, detail: { username: form.value.username, kelas: payload.kelas } })
      toast.success('Profil diperbarui')
    } else {
      const { error } = await authClient.auth.signUp({
        email: `${form.value.username}@minblora.id`,
        password: form.value.password,
        options: {
          data: { username: form.value.username, nama: form.value.nama, role: form.value.role, kelas: payload.kelas, nip: payload.nip },
        },
      })
      if (error) throw error
      await logActivity({ aksi: 'tambah_guru', tabel_terkait: 'users', detail: { username: form.value.username, nama: form.value.nama, role: form.value.role } })
      toast.success('Akun guru berhasil didaftarkan')
    }
    showForm.value = false
    await load()
  } catch (e) {
    toast.error('Gagal: ' + (e.message?.includes('duplicate') || e.message?.includes('already registered') ? 'Username sudah dipakai' : e.message))
  } finally {
    saving.value = false
  }
}

function confirmDelete(u) {
  target.value = u
  showDelete.value = true
}

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  load()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader title="Guru & Wali Kelas" :subtitle="`${filtered.length} akun ditampilkan`">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="openUpload">
          <template #icon><FileUp class="h-4 w-4" aria-hidden="true" /></template>
          Upload Excel
        </AppButton>
        <AppButton size="sm" @click="openCreate">
          <template #icon><UserPlus class="h-4 w-4" aria-hidden="true" /></template>
          Tambah Akun
        </AppButton>
      </template>
    </AppPageHeader>

    <AppFilterBar columns="sm:grid-cols-2">
      <AppInput v-model="search" placeholder="Cari nama / username / NIP…" aria-label="Cari guru">
        <template #leading><Search class="h-4 w-4" aria-hidden="true" /></template>
      </AppInput>
      <AppSelect v-model="filterRole" aria-label="Filter role">
        <option value="">Semua Role</option>
        <option value="Guru">Guru</option>
        <option value="Pustakawan">Pustakawan</option>
        <option value="Guru & Pustakawan">Guru & Pustakawan</option>
        <option value="Admin">Admin</option>
      </AppSelect>
      <template v-if="hasActiveFilter" #footer>
        <span class="text-[13px] text-slate-500">{{ filtered.length }} hasil</span>
        <button class="link inline-flex items-center gap-1 text-[13px]" @click="clearFilters">
          <X class="h-3.5 w-3.5" aria-hidden="true" /> Hapus filter
        </button>
      </template>
    </AppFilterBar>

    <AppErrorState v-if="!loading && loadError" @retry="load" />

    <template v-else>
      <!-- Desktop table — same pattern as Siswa -->
      <div v-if="loading" class="card-flat hidden p-4 md:block">
        <AppSkeleton type="table" :rows="5" />
      </div>
      <div v-else-if="!filtered.length" class="card-flat hidden p-4 md:block">
        <AppEmptyState
          title="Belum ada akun guru"
          description="Tambahkan akun guru dan wali kelas melalui tombol di atas."
          :icon="GraduationCap"
        >
          <template #action>
            <AppButton size="sm" variant="secondary" @click="clearFilters">Hapus Filter</AppButton>
            <AppButton size="sm" @click="openCreate">Tambah Akun</AppButton>
          </template>
        </AppEmptyState>
      </div>
      <AppTable v-else class="hidden md:block" caption="Daftar guru dan wali kelas">
        <thead>
          <tr>
            <th class="w-12 !text-center">No</th>
            <th>Nama / NIP</th>
            <th>Username</th>
            <th>Role</th>
            <th>Wali Kelas</th>
            <th class="!text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(u, idx) in filtered" :key="u.id">
            <td class="!text-center text-slate-400">{{ idx + 1 }}</td>
            <td>
              <p class="cell-main">{{ u.nama }}</p>
              <p v-if="u.nip" class="cell-sub tnum">NIP {{ u.nip }}</p>
            </td>
            <td class="text-slate-500">{{ u.username }}</td>
            <td><AppBadge :label="u.role" :tone="roleTone[u.role] || 'neutral'" dot /></td>
            <td>{{ u.kelas ? `Kelas ${u.kelas}` : '—' }}</td>
            <td>
              <div class="flex justify-end gap-0.5">
                <button class="btn-icon !h-8 !w-8" title="Edit" :aria-label="`Edit ${u.nama}`" @click="openEdit(u)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button class="btn-icon !h-8 !w-8 hover:!bg-rose-50 hover:!text-rose-600" title="Hapus akun" :aria-label="`Hapus ${u.nama}`" @click="confirmDelete(u)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </AppTable>

      <!-- Mobile cards -->
      <div class="md:hidden">
        <AppSkeleton v-if="loading" type="card" :rows="4" />
        <AppEmptyState
          v-else-if="!filtered.length"
          title="Belum ada akun guru"
          description="Tambahkan akun guru dan wali kelas melalui tombol di atas."
          :icon="GraduationCap"
        >
          <template #action>
            <AppButton size="sm" @click="openCreate">Tambah Akun</AppButton>
          </template>
        </AppEmptyState>
        <div v-else class="flex flex-col gap-2.5">
          <article v-for="u in filtered" :key="u.id" class="card-flat p-3.5">
            <div class="mb-1.5 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">{{ u.nama }}</p>
                <p class="truncate text-xs text-slate-400">@{{ u.username }}<span v-if="u.nip"> · {{ u.nip }}</span></p>
              </div>
              <AppBadge :label="u.role" :tone="roleTone[u.role] || 'neutral'" dot />
            </div>
            <p class="mb-3 text-xs text-slate-500">
              Wali kelas: <span class="font-medium text-slate-700">{{ u.kelas ? `Kelas ${u.kelas}` : '—' }}</span>
            </p>
            <div class="flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
              <AppButton variant="secondary" size="sm" class="flex-1" @click="openEdit(u)">Edit</AppButton>
              <AppButton variant="danger-soft" size="sm" class="flex-1" @click="confirmDelete(u)">Hapus</AppButton>
            </div>
          </article>
        </div>
      </div>
    </template>

    <!-- Form -->
    <AppModal v-model="showForm" :title="editing ? 'Edit Akun' : 'Tambah Akun'" subtitle="Akun digunakan untuk login ke aplikasi">
      <div class="flex flex-col gap-3">
        <AppInput v-model="form.nama" label="Nama lengkap" placeholder="Nama guru" required />
        <AppInput v-model="form.username" label="Username" placeholder="tanpa spasi" :disabled="editing" required />
        <AppInput v-if="!editing" v-model="form.password" label="Password" placeholder="Minimal 6 karakter" hint="Password awal untuk login pertama." required />
        <AppInput v-model="form.nip" label="NIP (opsional)" placeholder="Masukkan NIP jika ada" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppSelect v-model="form.role" label="Role">
            <option value="Guru">Guru (Wali Kelas)</option>
            <option value="Pustakawan">Pustakawan (Non-Guru)</option>
            <option value="Guru & Pustakawan">Guru & Pustakawan</option>
            <option value="Admin">Admin</option>
          </AppSelect>
          <AppSelect v-if="form.role === 'Guru' || form.role === 'Guru & Pustakawan'" v-model="form.kelas" label="Wali kelas">
            <option value="">— Tanpa kelas —</option>
            <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
          </AppSelect>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showForm = false">Batal</AppButton>
        <AppButton :loading="saving" @click="save">{{ saving ? 'Menyimpan…' : 'Simpan' }}</AppButton>
      </template>
    </AppModal>

    <!-- Info penghapusan akun -->
    <AppModal v-model="showDelete" title="Penghapusan Akun" max-width="max-w-md">
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert class="h-6 w-6" aria-hidden="true" />
        </div>
        <p class="text-sm leading-relaxed text-slate-600">
          Demi keamanan, penghapusan akun <strong class="text-slate-900">{{ target?.nama }}</strong> hanya dapat
          dilakukan melalui <strong>Supabase Dashboard</strong>.
        </p>
        <ol class="w-full rounded-xl bg-amber-50 p-3.5 text-left text-[13px] leading-relaxed text-amber-800">
          <li>1. Buka Supabase Dashboard</li>
          <li>2. Masuk ke <strong>Authentication › Users</strong></li>
          <li>3. Cari <code class="rounded bg-amber-100 px-1">{{ target?.username }}@minblora.id</code></li>
          <li>4. Klik <strong>Delete user</strong> — profil ikut terhapus otomatis.</li>
        </ol>
      </div>
      <template #footer>
        <AppButton variant="secondary" block @click="showDelete = false">Saya Mengerti</AppButton>
      </template>
    </AppModal>

    <!-- Upload Excel -->
    <AppModal v-model="showUpload" title="Upload Guru via Excel" subtitle="Daftarkan banyak akun sekaligus">
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
        <div class="group relative">
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
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showUpload = false">Batal</AppButton>
        <AppButton :loading="uploadingExcel" :disabled="!selectedFile" @click="processUpload">
          {{ uploadingExcel ? 'Memproses…' : 'Upload' }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
