<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { RefreshCw, ScrollText } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { formatWaktu, todayISO } from '@/lib/dates'

const logs = ref([])
const users = ref([])
const loading = ref(false)
const filterUser = ref('')
const filterDate = ref('')

async function loadUsers() {
  const { data } = await supabase.from('users').select('id, nama').order('nama')
  users.value = data || []
}

async function load() {
  loading.value = true
  try {
    let q = supabase
      .from('activity_logs')
      .select('id, aksi, tabel_terkait, record_id, detail, created_at, user_id, users(nama)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filterUser.value) q = q.eq('user_id', filterUser.value)
    if (filterDate.value) {
      q = q.gte('created_at', `${filterDate.value}T00:00:00`).lte('created_at', `${filterDate.value}T23:59:59`)
    }
    const { data, error } = await q
    if (error) throw error
    logs.value = data || []
  } catch (e) {
    toast.error('Gagal memuat log: ' + e.message)
  } finally {
    loading.value = false
  }
}

function ringkasDetail(d) {
  if (!d) return ''
  try {
    return Object.entries(d)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' · ')
  } catch {
    return ''
  }
}

onMounted(() => {
  loadUsers()
  load()
})
</script>

<template>
  <div>
    <PageHeader title="Log Aktivitas" subtitle="Audit trail: siapa mengubah apa dan kapan">
      <template #actions>
        <button class="btn-primary" :disabled="loading" @click="load">
          <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" /> Muat Ulang
        </button>
      </template>
    </PageHeader>

    <div class="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Pengguna</label>
        <select v-model="filterUser" class="input-field" @change="load">
          <option value="">Semua</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nama }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Tanggal</label>
        <input v-model="filterDate" type="date" :max="todayISO()" class="input-field" @change="load" />
      </div>
      <div class="flex items-end">
        <button class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50" @click="filterUser = ''; filterDate = ''; load()">
          Reset Filter
        </button>
      </div>
    </div>

    <div class="card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th class="px-3 py-2">Waktu</th>
            <th class="px-3 py-2">Pengguna</th>
            <th class="px-3 py-2">Aksi</th>
            <th class="px-3 py-2">Tabel</th>
            <th class="px-3 py-2">Detail</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading"><td colspan="5" class="py-6 text-center text-gray-400">Memuat...</td></tr>
          <tr v-else-if="!logs.length"><td colspan="5" class="py-6 text-center text-gray-400">Tidak ada aktivitas.</td></tr>
          <tr v-for="l in logs" :key="l.id" class="hover:bg-gray-50">
            <td class="whitespace-nowrap px-3 py-2 text-gray-500">{{ formatWaktu(l.created_at) }}</td>
            <td class="px-3 py-2 font-medium text-gray-800">{{ l.users?.nama || '—' }}</td>
            <td class="px-3 py-2">
              <span class="rounded-full bg-primary-accent px-2 py-0.5 text-xs font-medium text-primary">{{ l.aksi }}</span>
            </td>
            <td class="px-3 py-2 text-gray-500">{{ l.tabel_terkait || '-' }}</td>
            <td class="px-3 py-2 text-xs text-gray-500">{{ ringkasDetail(l.detail) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
