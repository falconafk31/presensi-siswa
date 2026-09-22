<script setup>
// Rekonstruksi Cetak Kartu Anggota (pratinjau depan-belakang + QR).
import { Printer, FileDown, QrCode } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { school } from '@/presentation/mock'
</script>

<template>
  <MockAppFrame active="kartu" role="pustakawan" page-title="Kartu Anggota" page-subtitle="Cetak kartu perpustakaan berbasis QR Code (PDF)">
    <template #actions>
      <span class="btn-secondary pointer-events-none !py-1.5 !text-xs"><Printer class="h-3.5 w-3.5" />Ctrl+P</span>
      <span class="btn-primary pointer-events-none !py-1.5 !text-xs"><FileDown class="h-3.5 w-3.5" />Download PDF</span>
    </template>

    <div class="flex h-full gap-3">
      <!-- pilih kelas -->
      <div class="card-flat w-[280px] shrink-0 p-4">
        <label class="input-label">Pilih kelas</label>
        <select class="input-field"><option>Kelas 5A (10 siswa)</option><option>Kelas 5B</option><option>Kelas 6A</option></select>
        <ul class="mt-3 flex flex-col gap-1.5 text-[13px]">
          <li v-for="n in ['Ahmad Fauzan', 'Fatimah Az-Zahra', 'Hamdan Fadhilah', 'Nabila Putri', 'Rizky Maulana']" :key="n"
            class="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5"
          >
            <span class="truncate font-medium text-slate-700">{{ n }}</span>
            <span class="badge-primary !text-[10px]">5A</span>
          </li>
        </ul>
        <p class="mt-3 text-[11px] text-slate-400">Pratinjau: siswa pertama (Ahmad Fauzan)</p>
      </div>

      <!-- kartu -->
      <div class="flex min-w-0 flex-1 items-center justify-center gap-6 rounded-xl border border-slate-200 bg-slate-100/70 p-6">
        <!-- depan -->
        <div class="w-[330px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div class="flex items-center justify-between bg-primary-700 px-3 py-1.5">
            <span class="text-[10px] font-bold uppercase tracking-widest text-white">Kartu Anggota</span>
            <span class="text-[10px] text-emerald-100">Perpustakaan</span>
          </div>
          <div class="flex gap-3 p-3">
            <div class="flex h-16 w-14 shrink-0 items-center justify-center rounded-md bg-primary-50 text-2xl font-bold text-primary-700">A</div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-bold text-slate-900">Ahmad Fauzan</p>
              <p class="text-[11px] text-slate-500 tnum">NISN0072341501</p>
              <p class="text-[11px] text-slate-500">Kelas5A · {{ school.nama_sekolah }}</p>
            </div>
            <QrCode class="h-16 w-16 shrink-0 text-slate-800" aria-hidden="true" />
          </div>
          <div class="border-t border-slate-100 px-3 py-1 text-[9px] text-slate-400">Berlaku TA2026/2027 · demokartu</div>
        </div>

        <!-- belakang -->
        <div class="w-[330px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div class="flex items-center justify-between bg-slate-800 px-3 py-1.5">
            <span class="text-[10px] font-bold uppercase tracking-widest text-white">Tata Tertib</span>
            <span class="text-[10px] text-slate-400">Sisi belakang</span>
          </div>
          <ol class="flex list-decimal flex-col gap-1 p-3 pl-6 text-[11px] leading-snug text-slate-600">
            <li>Tunjukkan kartu saat masuk perpustakaan.</li>
            <li>Maksimal pinjam3 eksemplar,14 hari.</li>
            <li>Jaga kebersihan & ketenangan ruangan.</li>
            <li>Kehilangan kartu dikenai biaya penerbitan.</li>
          </ol>
          <div class="border-t border-slate-100 px-3 py-1 text-[9px] text-slate-400">Hubungi pustakawan untuk penggantian kartu</div>
        </div>
      </div>

      <!-- info cetak -->
      <div class="card-flat w-[240px] shrink-0 p-4">
        <h3 class="card-title">Langkah cetak</h3>
        <ol class="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-[12.5px] text-slate-600">
          <li>Pilih kelas</li>
          <li>Download PDF</li>
          <li>Cetak kertas tebal</li>
          <li>Potong & lipat tengah</li>
          <li>Laminasi</li>
        </ol>
        <div class="alert-info mt-3 !py-2">
          <p class="text-[11.5px]">QR = NISN, dipakai scanner kunjungan.</p>
        </div>
      </div>
    </div>
  </MockAppFrame>
</template>
