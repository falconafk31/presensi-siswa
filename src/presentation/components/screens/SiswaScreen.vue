<script setup>
// Rekonstruksi Data Siswa (master data).
import { UserPlus, FileUp, Search } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { siswaPerKelas } from '@/presentation/mock'

// Batasi baris agar muat di area konten 1280×800 (demo memotong daftar)
const rows = siswaPerKelas['5A']
const roleTone = { aktif: 'badge-success' }
</script>

<template>
  <MockAppFrame active="siswa" role="admin" page-title="Data Siswa" page-subtitle="32 siswa ditampilkan">
    <template #actions>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><FileUp class="h-3.5 w-3.5" />Upload Excel</span>
      <span class="btn-primary pointer-events-none !py-1.5 !text-xs"><UserPlus class="h-3.5 w-3.5" />Tambah Siswa</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <div class="card-flat grid grid-cols-3 gap-2.5 p-3">
        <div class="col-span-2">
          <label class="input-label">Cari siswa</label>
          <div class="input-with-icon relative">
            <Search class="leading-icon h-4 w-4" aria-hidden="true" />
            <input class="input-field pl-9" type="text" placeholder="Nama atau NISN…" />
          </div>
        </div>
        <div>
          <label class="input-label">Kelas</label>
          <select class="input-field"><option>Semua Kelas</option><option>5A</option><option>5B</option><option>6A</option></select>
        </div>
      </div>

      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Daftar siswa (demo fiktif)</caption>
            <thead>
              <tr>
                <th class="!text-center">#</th>
                <th>NISN</th>
                <th>Nama</th>
                <th class="!text-center">JK</th>
                <th class="!text-center">Kelas</th>
                <th>Status</th>
                <th class="!text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in rows" :key="s.nisn">
                <td class="!text-center text-slate-400">{{ i + 1 }}</td>
                <td class="text-slate-600 tnum">{{ s.nisn }}</td>
                <td class="cell-main">{{ s.nama }}</td>
                <td class="cell-num">{{ s.jk }}</td>
                <td class="cell-num">{{ s.kelas }}</td>
                <td><span :class="roleTone.aktif">Aktif</span></td>
                <td class="!text-center text-slate-400">✎ ⌫</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span>Menampilkan1–10 dari32 siswa (potongan demo)</span>
          <span>Data fiktif</span>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
