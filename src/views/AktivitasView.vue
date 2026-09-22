<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { RefreshCw, ScrollText, X } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { formatWaktu, todayISO } from '@/lib/dates'
import {
  AppPageHeader, AppFilterBar, AppSelect, AppInput, AppTable,
  AppBadge, AppEmptyState, AppSkeleton, AppButton,
} from '@/components/ui'

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

function resetFilter() {
  filterUser.value = ''
  filterDate.value = ''
  load()
}

const hasFilter = () => filterUser.value !== '' || filterDate.value !== ''

function ringkasDetail(d) {
  if (!d) return '–'
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
  <div class="page-stack">
    <AppPageHeader title="Log Aktivitas" subtitle="Jejak audit — siapa mengubah apa dan kapan (200 terbaru)">
      <template #actions>
        <AppButton size="sm" :loading="loading" @click="load">
          <template #icon><RefreshCw class="h-4 w-4" aria-hidden="true" /></template>
          Muat Ulang
        </AppButton>
      </template>
    </AppPageHeader>

    <AppFilterBar columns="sm:grid-cols-3">
      <AppSelect v-model="filterUser" label="Pengguna" @change="load">
        <option value="">Semua pengguna</option>
        <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nama }}</option>
      </AppSelect>
      <AppInput v-model="filterDate" type="date" label="Tanggal" :max="todayISO()" @change="load" />
      <div class="flex items-end">
        <AppButton variant="secondary" class="w-full sm:w-auto" @click="resetFilter">
          <template #icon><X class="h-4 w-4" aria-hidden="true" /></template>
          Reset Filter
        </AppButton>
      </div>
    </AppFilterBar>

    <div v-if="loading" class="card-flat p-4">
      <AppSkeleton type="table" :rows="8" />
    </div>
    <div v-else-if="!logs.length" class="card-flat p-4">
      <AppEmptyState
        title="Tidak ada aktivitas"
        :description="hasFilter() ? 'Tidak ada aktivitas yang cocok dengan filter.' : 'Belum ada aktivitas tercatat.'"
        :icon="ScrollText"
      >
        <template v-if="hasFilter()" #action>
          <AppButton size="sm" variant="secondary" @click="resetFilter">Reset Filter</AppButton>
        </template>
      </AppEmptyState>
    </div>
    <AppTable v-else caption="Log aktivitas pengguna">
      <thead>
        <tr>
          <th>Waktu</th>
          <th>Pengguna</th>
          <th>Aksi</th>
          <th>Tabel</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in logs" :key="l.id">
          <td class="whitespace-nowrap text-slate-500 tnum">{{ formatWaktu(l.created_at) }}</td>
          <td class="cell-main whitespace-nowrap">{{ l.users?.nama || '—' }}</td>
          <td><AppBadge :label="l.aksi" tone="primary" dot /></td>
          <td class="text-slate-500">{{ l.tabel_terkait || '–' }}</td>
          <td class="max-w-[320px] truncate text-xs text-slate-400" :title="ringkasDetail(l.detail)">{{ ringkasDetail(l.detail) }}</td>
        </tr>
      </tbody>
    </AppTable>
  </div>
</template>
