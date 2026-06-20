<script setup>
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { UserPlus, Pencil, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { useSettingsStore } from '@/stores/settings'
import { FileUp } from 'lucide-vue-next'

const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])

const users = ref([])
const loading = ref(false)
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

function openUpload() {
  selectedFile.value = null
  showUpload.value = true
}

async function downloadTemplate() {
  const xlsx = await import('xlsx')
  const ws = xlsx.utils.json_to_sheet([
    { Username: 'guru_mat', Password: 'password123', Nama: 'Fulan SPd', Role: 'Guru', 'Wali Kelas': '1A', 'NIP': '198001012010011001' }
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

    const toInsert = rows.map(r => {
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
        role: role,
        kelas: r['Wali Kelas'] && requiresKelas ? String(r['Wali Kelas']).trim().toUpperCase() : null,
        nip: r.NIP ? String(r.NIP).trim() : null
      }
    }).filter(r => r.username && r.nama && r.password)

    if (!toInsert.length) throw new Error('Tidak ada data valid (Username, Password, Nama wajib)')

    const { error } = await supabase.from('users').upsert(toInsert, { onConflict: 'username' })
    if (error) throw error

    toast.success(`${toInsert.length} akun berhasil diupload`)
    showUpload.value = false
    await load()
  } catch(e) {
    toast.error('Gagal upload: ' + e.message)
  } finally {
    uploadingExcel.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, nama, role, kelas, nip')
      .order('role')
      .order('nama')
    if (error) throw error
    users.value = data || []
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

function openEdit(u) {
  editing.value = true
  form.value = { id: u.id, username: u.username, password: '', nama: u.nama, role: u.role, kelas: u.kelas || '' }
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
      nip: form.value.nip || null
    }
    if (editing.value) {
      if (form.value.password) payload.password = form.value.password
      const { error } = await supabase.from('users').update(payload).eq('id', form.value.id)
      if (error) throw error
      await logActivity({ aksi: 'update_guru', tabel_terkait: 'users', record_id: form.value.id, detail: { username: form.value.username, kelas: payload.kelas } })
      toast.success('Akun diperbarui')
    } else {
      payload.password = form.value.password
      const { data, error } = await supabase.from('users').insert(payload).select().single()
      if (error) throw error
      await logActivity({ aksi: 'tambah_guru', tabel_terkait: 'users', record_id: data.id, detail: { username: form.value.username } })
      toast.success('Akun guru ditambahkan')
    }
    showForm.value = false
    await load()
  } catch (e) {
    toast.error('Gagal: ' + (e.message?.includes('duplicate') ? 'Username sudah dipakai' : e.message))
  } finally {
    saving.value = false
  }
}

function confirmDelete(u) {
  target.value = u
  showDelete.value = true
}

async function doDelete() {
  saving.value = true
  try {
    const { error } = await supabase.from('users').delete().eq('id', target.value.id)
    if (error) throw error
    await logActivity({ aksi: 'hapus_guru', tabel_terkait: 'users', record_id: target.value.id, detail: { username: target.value.username } })
    toast.success('Akun dihapus')
    showDelete.value = false
    await load()
  } catch (e) {
    toast.error('Gagal: ' + e.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  load()
})
</script>

<template>
  <div>
    <PageHeader title="Guru & Wali Kelas" subtitle="Kelola akun & penugasan wali kelas">
      <template #actions>
        <button class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50" @click="openUpload">
          <FileUp class="h-4 w-4" /> Upload Excel
        </button>
        <button class="btn-primary" @click="openCreate"><UserPlus class="h-4 w-4" /> Tambah Akun</button>
      </template>
    </PageHeader>

    <div class="card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th class="px-3 py-3 font-semibold">Nama / NIP</th>
            <th class="px-3 py-2">Username</th>
            <th class="px-3 py-2">Role</th>
            <th class="px-3 py-2">Wali Kelas</th>
            <th class="px-3 py-2 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading"><td colspan="5" class="py-6 text-center text-gray-400">Memuat...</td></tr>
          <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50">
            <td class="px-3 py-2">
              <div class="font-medium text-gray-800">{{ u.nama }}</div>
              <div v-if="u.nip" class="text-xs text-gray-500">NIP: {{ u.nip }}</div>
            </td>
            <td class="px-3 py-2 text-gray-500">{{ u.username }}</td>
            <td class="px-3 py-2"><StatusBadge :label="u.role" :color="u.role === 'Admin' ? 'amber' : 'green'" /></td>
            <td class="px-3 py-2">{{ u.kelas ? `Kelas ${u.kelas}` : '-' }}</td>
            <td class="px-3 py-2">
              <div class="flex justify-end gap-1">
                <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" @click="openEdit(u)"><Pencil class="h-4 w-4" /></button>
                <button class="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" @click="confirmDelete(u)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal v-model="showForm" :title="editing ? 'Edit Akun' : 'Tambah Akun'">
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Nama Lengkap</label>
          <input v-model="form.nama" class="input-field" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Username</label>
          <input v-model="form.username" class="input-field" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">
            Password {{ editing ? '(kosongkan jika tidak diganti)' : '' }}
          </label>
          <input v-model="form.password" type="text" class="input-field" placeholder="••••••" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">NIP (Opsional)</label>
          <input v-model="form.nip" type="text" class="input-field" placeholder="Masukkan NIP jika ada" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Role</label>
            <select v-model="form.role" class="input-field">
              <option value="Guru">Guru (Wali Kelas)</option>
              <option value="Pustakawan">Pustakawan (Non-Guru)</option>
              <option value="Guru & Pustakawan">Guru & Pustakawan</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div v-if="form.role === 'Guru' || form.role === 'Guru & Pustakawan'">
            <label class="mb-1 block text-xs font-medium text-gray-600">Wali Kelas</label>
            <select v-model="form.kelas" class="input-field">
              <option value="">- (tanpa kelas)</option>
              <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
            </select>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showForm = false">Batal</button>
        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
      </template>
    </BaseModal>

    <BaseModal v-model="showDelete" title="Hapus Akun" max-width="max-w-sm">
      <p class="text-sm text-gray-600">Yakin menghapus akun <strong>{{ target?.nama }}</strong>?</p>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showDelete = false">Batal</button>
        <button class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700" :disabled="saving" @click="doDelete">
          <Trash2 class="h-4 w-4" /> Hapus
        </button>
      </template>
    </BaseModal>

    <!-- Modal Upload Excel -->
    <BaseModal v-model="showUpload" title="Upload Guru (Excel)">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Gunakan template excel ini untuk menginput banyak akun sekaligus.
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
