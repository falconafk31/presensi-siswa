<script setup>
// Rekonstruksi halaman Login (mirip LoginView, data fiktif).
import { LogIn, User, Lock, Eye, ClipboardCheck, BarChart3, Library } from 'lucide-vue-next'
import { school } from '@/presentation/mock'

const highlights = [
  { icon: ClipboardCheck, text: 'Presensi harian per kelas dalam hitungan detik' },
  { icon: BarChart3, text: 'Rekap bulanan & semester siap cetak PDF/Excel' },
  { icon: Library, text: 'Sirkulasi perpustakaan + kartu anggota QR' },
]
</script>

<template>
  <div class="flex h-[800px] w-[1280px] overflow-hidden bg-white">
    <!-- Panel branding -->
    <div class="relative flex w-[560px] flex-col justify-center overflow-hidden bg-primary-900 px-14 text-white">
      <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-700/50" aria-hidden="true" />
      <div class="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary-800/60" aria-hidden="true" />
      <div class="relative z-10">
        <div class="mb-7 flex h-18 w-18 items-center justify-center rounded-2xl bg-white/10 p-3 ring-1 ring-white/20" style="height:72px;width:72px">
          <span class="text-2xl font-bold tracking-wider">MC</span>
        </div>
        <h1 class="text-[30px] font-bold leading-tight tracking-tight">Sistem Terpadu Madrasah</h1>
        <p class="mt-3 text-[15px] leading-relaxed text-emerald-100/80">
          Presensi siswa, administrasi akademik, dan sirkulasi perpustakaan dalam satu portal yang cepat dan aman.
        </p>
        <ul class="mt-7 flex flex-col gap-3.5">
          <li v-for="h in highlights" :key="h.text" class="flex items-center gap-3 text-sm text-emerald-50/90">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <component :is="h.icon" class="h-4 w-4" aria-hidden="true" />
            </span>
            {{ h.text }}
          </li>
        </ul>
        <p class="mt-8 text-[11px] uppercase tracking-[0.2em] text-emerald-200/60">Demo · data fiktif</p>
      </div>
    </div>

    <!-- Panel form -->
    <div class="flex w-[720px] items-center justify-center px-10">
      <div class="w-full max-w-sm">
        <div class="mb-7 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700">
            <span class="text-lg font-bold text-white">MC</span>
          </div>
          <h2 class="text-xl font-bold tracking-tight text-slate-900">{{ school.nama_sekolah }}</h2>
          <p class="mt-1.5 text-sm text-slate-500">Masuk untuk melanjutkan ke dashboard</p>
        </div>

        <div class="flex flex-col gap-4">
          <div>
            <label class="input-label">Username</label>
            <div class="input-with-icon relative">
              <User class="leading-icon h-4 w-4" aria-hidden="true" />
              <input class="input-field pl-9" type="text" value="admin.demo" readonly />
            </div>
          </div>
          <div>
            <label class="input-label">Password</label>
            <div class="input-with-trailing relative">
              <div class="input-with-icon relative">
                <Lock class="leading-icon h-4 w-4" aria-hidden="true" />
                <input class="input-field pl-9 pr-10" type="password" value="contohsaja" readonly />
              </div>
              <Eye class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </div>
          </div>
          <button type="button" class="btn-primary !py-3 w-full">
            <LogIn class="h-4 w-4" aria-hidden="true" />
            Masuk Sekarang
          </button>
        </div>

        <div class="alert-warning mt-4">
          <p class="text-[13px]"><strong>Mengalami masalah?</strong> Panel "Pulihkan Sesi" muncul otomatis bila login lebih dari12 detik.</p>
        </div>

        <p class="mt-6 text-center text-xs text-slate-400">
          ©2026 Sistem Presensi Open Source · Tutorial demo
        </p>
      </div>
    </div>
  </div>
</template>
