<script setup>
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Search, History } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import {
  AppPageHeader, AppCard, AppInput, AppTable,
  AppBadge, AppEmptyState, AppSkeleton, AppButton,
} from '@/components/ui'

const search = ref('')
const results = ref([])
const selected = ref(null)
const history = ref([])
const loading = ref(false)
const loadingHistory = ref(false)

const statusTone = { naik: 'success', lulus: 'info', aktif: 'success', pindah: 'warning', keluar: 'danger' }

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
  loadingHistory.value = true
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
    loadingHistory.value = false
  }
}
</script>

<template>
  <div class="page-stack">
    <AppPageHeader
      title="Riwayat Kelas Siswa"
      subtitle="Histori kelas dan wali kelas per tahun ajaran"
    />

    <AppCard>
      <div class="flex flex-col gap-2 sm:flex-row">
        <AppInput
          v-model="search"
          placeholder="Cari nama / NISN siswa…"
          aria-label="Cari siswa"
          class="flex-1"
          @keyup.enter="cariSiswa"
        >
          <template #leading><Search class="h-4 w-4" aria-hidden="true" /></template>
        </AppInput>
        <AppButton :loading="loading" class="sm:w-auto" @click="cariSiswa">Cari</AppButton>
      </div>

      <div v-if="results.length" class="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200" role="listbox" aria-label="Hasil pencarian siswa">
        <button
          v-for="s in results"
          :key="s.nisn"
          role="option"
          class="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
          @click="pilihSiswa(s)"
        >
          <span class="truncate font-medium text-slate-800">{{ s.nama }}</span>
          <span class="shrink-0 text-xs text-slate-400 tnum">{{ s.nisn }} · Kelas {{ s.kelas || '–' }}</span>
        </button>
      </div>
    </AppCard>

    <AppCard v-if="selected" :title="selected.nama" :subtitle="selected.nisn">
      <template #actions>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
          <History class="h-5 w-5" aria-hidden="true" />
        </div>
      </template>
      <div v-if="loadingHistory">
        <AppSkeleton type="table" :rows="3" />
      </div>
      <AppEmptyState
        v-else-if="!history.length"
        title="Belum ada riwayat kelas"
        description="Siswa ini belum memiliki catatan riwayat kelas per tahun ajaran."
        :icon="History"
      />
      <div v-else class="table-scroll -mx-4 border-y border-slate-100 sm:mx-0 sm:rounded-xl sm:border">
        <table class="table">
          <thead>
            <tr>
              <th>Tahun Ajaran</th>
              <th>Kelas</th>
              <th>Wali Kelas</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td class="font-medium text-slate-800">{{ h.tahun_ajaran }}</td>
              <td>Kelas {{ h.kelas || '–' }}</td>
              <td class="text-slate-500">{{ h.wali_kelas || '–' }}</td>
              <td><AppBadge :label="h.status || '–'" :tone="statusTone[h.status] || 'neutral'" dot /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>
