<script setup>
/**
 * TutorialLayout — chrome halaman dokumentasi /tutorial.
 *
 * CATATAN ARSITEKTUR: route /tutorial dibuat PUBLIK (tanpa login) sehingga
 * TIDAK memakai AppLayout yang terikat auth (AppLayout menampilkan identitas
 * session & memicu fetch settings/period yang butuh Supabase). Sebagai gantinya
 * layout ini memakai design token + komponen UI kit yang sama sehingga terasa
 * sebagai bagian resmi aplikasi.
 */
import { computed } from 'vue'
import { Presentation, ExternalLink, Github } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { AppButton } from '@/components/ui'
import { school, DEMO_PERIOD } from '@/presentation/mock'

const auth = useAuthStore()

const appLink = computed(() => (auth.isAuthenticated ? '/' : '/login'))
const appLinkLabel = computed(() => (auth.isAuthenticated ? 'Buka Aplikasi' : 'Masuk Aplikasi'))
</script>

<template>
  <div class="flex min-h-screen flex-col bg-base">
    <!-- Header -->
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-5">
        <RouterLink to="/tutorial" class="flex min-w-0 items-center gap-2.5" aria-label="Beranda tutorial">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-700 text-white">
            <span class="text-xs font-bold tracking-tight">MC</span>
          </span>
          <span class="min-w-0">
            <span class="block truncate text-[13px] font-semibold leading-tight text-slate-900">{{ school.nama_sekolah }}</span>
            <span class="block truncate text-[11px] leading-tight text-slate-400">Tutorial Presensi &amp; Perpustakaan</span>
          </span>
        </RouterLink>

        <span class="badge-primary hidden sm:inline-flex">Dokumentasi · Demo</span>

        <div class="flex-1" />

        <span class="hidden items-center gap-1.5 text-xs text-slate-400 lg:flex">
          <span class="h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />
          {{ DEMO_PERIOD }}
        </span>

        <a
          href="https://github.com/falconafk31/presensi-siswa"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-ghost hidden !min-h-[2.25rem] sm:inline-flex"
          aria-label="Repository GitHub"
        >
          <Github class="h-4 w-4" aria-hidden="true" />
        </a>

        <AppButton :to="appLink" variant="secondary" size="sm" class="!min-h-[2.25rem] whitespace-nowrap">
          <template #icon><ExternalLink class="h-4 w-4" aria-hidden="true" /></template>
          {{ appLinkLabel }}
        </AppButton>

        <AppButton to="/tutorial/presentation" size="sm" class="hidden !min-h-[2.25rem] whitespace-nowrap sm:inline-flex">
          <template #icon><Presentation class="h-4 w-4" aria-hidden="true" /></template>
          Mulai Presentasi
        </AppButton>
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-5">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:px-5">
        <p>
          Tutorial resmi aplikasi · data demo <strong class="font-semibold text-slate-500">fiktif</strong> —
          bukan data produksi madrasah mana pun.
        </p>
        <div class="flex flex-1 items-center justify-start gap-4 sm:justify-end">
          <RouterLink to="/tutorial" class="transition-colors hover:text-primary-700">/tutorial</RouterLink>
          <RouterLink to="/tutorial/presentation" class="transition-colors hover:text-primary-700">/tutorial/presentation</RouterLink>
          <a
            href="https://github.com/falconafk31/presensi-siswa"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 transition-colors hover:text-primary-700"
          >
            <Github class="h-3.5 w-3.5" aria-hidden="true" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>
