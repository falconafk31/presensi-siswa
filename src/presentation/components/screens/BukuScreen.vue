<script setup>
// Rekonstruksi Data Koleksi (stok Total/Pinjam/Sisa).
import { BookPlus, FileUp, Search, BookOpen } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { daftarBuku } from '@/presentation/mock'

const sisa = (b) => b.stok - b.dipinjam
</script>

<template>
  <MockAppFrame active="buku" role="pustakawan" page-title="Data Koleksi" page-subtitle="128 judul ditampilkan">
    <template #actions>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><FileUp class="h-3.5 w-3.5" />Import Excel</span>
      <span class="btn-primary pointer-events-none !py-1.5 !text-xs"><BookPlus class="h-3.5 w-3.5" />Tambah Buku</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <div class="card-flat grid grid-cols-3 gap-2.5 p-3">
        <div class="col-span-2">
          <label class="input-label">Cari koleksi</label>
          <div class="input-with-icon relative">
            <Search class="leading-icon h-4 w-4" aria-hidden="true" />
            <input class="input-field pl-9" type="text" placeholder="Judul atau pengarang…" />
          </div>
        </div>
        <div>
          <label class="input-label">Status stok</label>
          <select class="input-field"><option>Semua</option><option>Tersedia</option><option>Habis dipinjam</option></select>
        </div>
      </div>

      <div class="table-card min-h-0 flex-1">
        <div class="table-scroll h-full">
          <table class="table">
            <caption class="sr-only">Katalog buku (demo fiktif)</caption>
            <thead>
              <tr>
                <th class="!text-center">#</th>
                <th>Judul</th>
                <th>Pengarang</th>
                <th class="!text-center">Tahun</th>
                <th class="!text-center" title="Total eksemplar">Total</th>
                <th class="!text-center" title="Sedang dipinjam">Pinjam</th>
                <th class="!text-center" title="Sisa tersedia">Sisa</th>
                <th class="!text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, i) in daftarBuku" :key="b.id">
                <td class="!text-center text-slate-400">{{ i + 1 }}</td>
                <td class="cell-main">{{ b.judul }}</td>
                <td class="text-slate-600">{{ b.pengarang }}</td>
                <td class="cell-num">{{ b.tahun }}</td>
                <td class="cell-num">{{ b.stok }}</td>
                <td class="cell-num" :class="b.dipinjam ? 'text-blue-700' : 'text-slate-400'">{{ b.dipinjam }}</td>
                <td class="cell-num" :class="sisa(b) === 0 ? 'text-rose-600' : 'text-emerald-700'">{{ sisa(b) }}</td>
                <td class="!text-center text-slate-400"><BookOpen class="inline h-3.5 w-3.5" /> ✎</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span>1–6 dari128 judul</span>
          <span>Sisa = Total − Pinjam · data fiktif</span>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
