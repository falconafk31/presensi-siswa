<script setup>
// Rekonstruksi Sirkulasi (pinjam + pengembalian).
import { BookPlus, Search, Undo2 } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { sirkulasi } from '@/presentation/mock'

const statusTone = {
  Dipinjam: 'badge-info',
  Dikembalikan: 'badge-success',
  'Terlambat7 hari': 'badge-danger',
}
</script>

<template>
  <MockAppFrame active="sirkulasi" role="pustakawan" page-title="Sirkulasi" page-subtitle="5 transaksi ditampilkan">
    <template #actions>
      <span class="btn-primary pointer-events-none !py-1.5 !text-xs"><BookPlus class="h-3.5 w-3.5" />Catat Peminjaman</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <!-- tabs + search -->
      <div class="flex items-center justify-between gap-3">
        <div class="tabs" role="tablist">
          <button role="tab" class="tab-btn" aria-selected="true">Sedang Dipinjam</button>
          <button role="tab" class="tab-btn" aria-selected="false">Semua Riwayat</button>
        </div>
        <div class="input-with-icon relative w-[280px]">
          <Search class="leading-icon h-4 w-4" aria-hidden="true" />
          <input class="input-field pl-9" type="text" placeholder="Cari siswa / judul…" />
        </div>
      </div>

      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Transaksi sirkulasi (demo fiktif)</caption>
            <thead>
              <tr>
                <th>Siswa</th>
                <th class="!text-center">Kelas</th>
                <th>Buku</th>
                <th class="!text-center">Pinjam</th>
                <th class="!text-center">Kembali</th>
                <th>Status</th>
                <th class="!text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in sirkulasi" :key="l.siswa + l.buku">
                <td class="cell-main">{{ l.siswa }}</td>
                <td class="cell-num">{{ l.kelas }}</td>
                <td class="text-slate-600">{{ l.buku }}</td>
                <td class="cell-num text-slate-500">{{ l.pinjam }}</td>
                <td class="cell-num text-slate-500">{{ l.kembali }}</td>
                <td><span :class="statusTone[l.status]">{{ l.status }}</span></td>
                <td class="!text-center">
                  <span
                    v-if="l.status !== 'Dikembalikan'"
                    class="btn-secondary pointer-events-none !min-h-[28px] !px-2.5 !py-0.5 !text-xs"
                  ><Undo2 class="h-3.5 w-3.5" />Kembalikan</span>
                  <span v-else class="text-xs text-slate-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          Kembalikan → konfirmasi → stok judul +1 otomatis · data fiktif
        </div>
      </div>

      <!-- alur singkat -->
      <div class="grid grid-cols-3 gap-2.5">
        <div class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
          <strong>1 · Pinjam</strong> — pilih siswa + buku, stok −1
        </div>
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <strong>2 · Jatuh tempo</strong> — status Terlambat otomatis
        </div>
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          <strong>3 · Kembali</strong> — konfirmasi, stok +1
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
