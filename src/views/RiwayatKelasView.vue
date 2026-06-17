<script setup>
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Search, History } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { supabase } from '@/lib/supabase'

const search = ref('')
const results = ref([])
const selected = ref(null)
const history = ref([])
const loading = ref(false)

const statusColor = { naik: 'green', lulus: 'sky', aktif: 'green', pindah: 'amber', keluar: 'rose' }

async function cariSiswa() {
  const q = search.value.trim()
  if (!q) return
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('students')
      .select('nisn, nama, kelas, status')
      .or(`nama.ilike.%${q}%,nisn.ilike.%${q}%`)
      .order('nama')
      .limit(15)
    if (error) throw error
    results.value = data || []
    if (!results.value.length) toast.info('Siswa tidak ditemukan')
  } catch (e) {
    toast.error('Gagal: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function pilihSiswa(s) {
  selected.value = s
  results.value = []
  search.value = s.nama
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('class_history')
      .select('*')
      .eq('student_nisn', s.nisn)
      .order('tahun_ajaran', { ascending: false })
    if (error) throw error
    history.value = data || []
  } catch (e) {
    toast.error('Gagal memuat riwayat: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Riwayat Kelas Siswa" subtitle="Histori kelas & wali kelas per tahun ajaran (untuk rapor/tracking)" />

    <div class="card mb-4">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input v-model="search" class="input-field pl-9" placeholder="Cari nama / NISN siswa" @keyup.enter="cariSiswa" />
        </div>
        <button class="btn-primary" :disabled="loading" @click="cariSiswa">Cari</button>
      </div>

      <div v-if="results.length" class="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
        <button
          v-for="s in results"
          :key="s.nisn"
          class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
          @click="pilihSiswa(s)"
        >
          <span class="font-medium text-gray-800">{{ s.nama }}</span>
          <span class="text-xs text-gray-400">{{ s.nisn }} · Kelas {{ s.kelas || '-' }}</span>
        </button>
      </div>
    </div>

    <div v-if="selected" class="card">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-accent text-primary"><History class="h-5 w-5" /></div>
        <div>
          <p class="font-semibold text-gray-800">{{ selected.nama }}</p>
          <p class="text-xs text-gray-400">{{ selected.nisn }}</p>
        </div>
      </div>

      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th class="px-3 py-2">Tahun Ajaran</th>
            <th class="px-3 py-2">Kelas</th>
            <th class="px-3 py-2">Wali Kelas</th>
            <th class="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="!history.length"><td colspan="4" class="py-6 text-center text-gray-400">Belum ada riwayat kelas.</td></tr>
          <tr v-for="h in history" :key="h.id">
            <td class="px-3 py-2 font-medium text-gray-700">{{ h.tahun_ajaran }}</td>
            <td class="px-3 py-2">Kelas {{ h.kelas || '-' }}</td>
            <td class="px-3 py-2 text-gray-600">{{ h.wali_kelas || '-' }}</td>
            <td class="px-3 py-2"><StatusBadge :label="h.status || '-'" :color="statusColor[h.status] || 'gray'" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
