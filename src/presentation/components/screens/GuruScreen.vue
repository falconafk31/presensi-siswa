<script setup>
// Rekonstruksi Guru & Wali Kelas (akun login).
import { UserPlus, FileUp, Search } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { daftarGuru } from '@/presentation/mock'

const roleTone = {
  Admin: 'badge-warning',
  Guru: 'badge-success',
  Pustakawan: 'badge-library',
}
</script>

<template>
  <MockAppFrame active="guru" role="admin" page-title="Guru & Wali Kelas" page-subtitle="5 akun ditampilkan">
    <template #actions>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><FileUp class="h-3.5 w-3.5" />Upload Excel</span>
      <span class="btn-primary pointer-events-none !py-1.5 !text-xs"><UserPlus class="h-3.5 w-3.5" />Tambah Akun</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <div class="card-flat grid grid-cols-2 gap-2.5 p-3">
        <div>
          <label class="input-label">Cari akun</label>
          <div class="input-with-icon relative">
            <Search class="leading-icon h-4 w-4" aria-hidden="true" />
            <input class="input-field pl-9" type="text" placeholder="Nama, username, atau NIP…" />
          </div>
        </div>
        <div>
          <label class="input-label">Role</label>
          <select class="input-field"><option>Semua Role</option><option>Admin</option><option>Guru</option><option>Pustakawan</option></select>
        </div>
      </div>

      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Daftar akun guru dan wali kelas (demo fiktif)</caption>
            <thead>
              <tr>
                <th class="!text-center">#</th>
                <th>Nama</th>
                <th>Username</th>
                <th>NIP</th>
                <th>Role</th>
                <th class="!text-center">Wali Kelas</th>
                <th class="!text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, i) in daftarGuru" :key="u.username">
                <td class="!text-center text-slate-400">{{ i + 1 }}</td>
                <td class="cell-main">{{ u.nama }}</td>
                <td class="text-slate-600">{{ u.username }}</td>
                <td class="text-slate-500 tnum">{{ u.nip }}</td>
                <td><span :class="roleTone[u.role] || 'badge-neutral'">{{ u.role }}</span></td>
                <td class="cell-num">{{ u.kelas || '—' }}</td>
                <td class="!text-center text-slate-400">✎ ⌫</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span>Akun digunakan untuk login ke aplikasi</span>
          <span>Data fiktif</span>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
