<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { LogIn, User, Lock, Eye, EyeOff, ClipboardCheck, Library, BarChart3 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { supabase } from '@/lib/supabase'
import { AppInput, AppButton, AppAlert } from '@/components/ui'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const sekolah = ref(null)

// ——— Self-recovery "Pulihkan Sesi" (login hang / sesi bermasalah) ———
// Di sebagian Chrome mobile, proses masuk bisa menggantung tanpa batas
// (fetch signInWithPassword / fetchProfile tanpa timeout, ditambah state
// sesi lokal yang stale). Panel recovery di bawah HANYA muncul setelah
// timeout — alur login normal tidak berubah sama sekali.
const LOGIN_TIMEOUT_MS = 12000 // ±12 detik (rentang 10–15 detik)
const RECOVERY_STEP_TIMEOUT_MS = 3000
// Harus sama dengan USER_CACHE_KEY di stores/auth.js
const USER_CACHE_KEY = 'presensi.user'

const showRecovery = ref(false)
const recovering = ref(false)
// Token attempt: setiap login baru / recovery membatalkan attempt lama,
// sehingga hasil login yang datang terlambat diabaikan (anti race condition).
let loginAttempt = 0

// Membatasi langkah pemulihan yang bisa menggantung (mis. signOut saat
// jaringan mati). Sengaja resolve — bukan reject — saat timeout agar alur
// recovery tetap lanjut ke langkah berikutnya.
function withTimeout(promise, ms) {
  const safe = Promise.resolve(promise).catch(() => {})
  return Promise.race([safe, new Promise((resolve) => setTimeout(resolve, ms))])
}

const highlights = [
  { icon: ClipboardCheck, text: 'Presensi harian per kelas dalam hitungan detik' },
  { icon: BarChart3, text: 'Rekap bulanan & semester siap cetak PDF/Excel' },
  { icon: Library, text: 'Sirkulasi perpustakaan + kartu anggota QR' },
]

onMounted(async () => {
  try {
    sekolah.value = await settingsStore.fetchSettings()
  } catch (e) {
    // Abaikan jika error (misal karena belum login / RLS)
  }
})

async function handleLogin() {
  if (recovering.value) return
  if (!username.value || !password.value) {
    toast.error('Username dan password wajib diisi')
    return
  }
  const attempt = ++loginAttempt
  loading.value = true
  showRecovery.value = false

  const timer = setTimeout(() => {
    if (attempt !== loginAttempt) return
    // Login belum selesai dalam batas wajar → hentikan loading, tawarkan
    // pemulihan. Promise login yang masih pending dibiarkan; hasilnya hanya
    // diproses bila user belum menekan "Pulihkan Sesi".
    loading.value = false
    showRecovery.value = true
  }, LOGIN_TIMEOUT_MS)

  try {
    const user = await auth.login(username.value.trim(), password.value)
    if (attempt !== loginAttempt) return // dibatalkan oleh recovery / attempt baru
    toast.success(`Selamat datang, ${user.nama}`)
    showRecovery.value = false
    const redirect = route.query.redirect || { name: 'dashboard' }
    router.replace(redirect)
  } catch (e) {
    if (attempt !== loginAttempt) return
    // Hasil nyata (mis. password salah) — bukan kondisi hang: tanpa panel recovery
    showRecovery.value = false
    toast.error(e.message || 'Gagal masuk')
  } finally {
    clearTimeout(timer)
    if (attempt === loginAttempt) loading.value = false
  }
}

async function handleRecoverSession() {
  if (recovering.value) return
  recovering.value = true
  // Batalkan login yang masih pending — hasil terlambat tidak boleh lagi
  // menulis state atau menavigasi (anti race dengan pemulihan).
  loginAttempt += 1
  loading.value = false

  try {
    // 1) Bersihkan cache profil lokal — hanya key ini (bukan localStorage.clear()).
    try {
      localStorage.removeItem(USER_CACHE_KEY)
    } catch {
      /* abaikan: storage penuh / private mode */
    }

    // 2) Bersihkan persisted Supabase Auth session via API resmi.
    //    scope 'local' = hanya sesi di perangkat ini. Diberi batas waktu
    //    karena signOut bisa menggantung pada jaringan yang bermasalah —
    //    kondisi yang justru sedang dipulihkan.
    await withTimeout(supabase.auth.signOut({ scope: 'local' }), RECOVERY_STEP_TIMEOUT_MS)

    // 3) Unregister Service Worker lama bila masih ada.
    if ('serviceWorker' in navigator) {
      const registrations =
        (await withTimeout(navigator.serviceWorker.getRegistrations(), RECOVERY_STEP_TIMEOUT_MS)) || []
      await Promise.all(registrations.map((r) => withTimeout(r.unregister(), RECOVERY_STEP_TIMEOUT_MS)))
    }
  } finally {
    // 4) Fallback lokal terarah + jaminan anti-race (public API tetap langkah #2):
    //    signOut hanya menghapus sesi lokal SETELAH panggilan jaringan /logout —
    //    saat jaringan macet (kondisi yang dipulihkan) ia bisa menggantung atau
    //    gagal TANPA sempat menghapus sesi, dan login yang masih pending bisa
    //    menulis ulang storage sesaat sebelum reload. Blob sesi dari konfigurasi
    //    resmi `auth.storageKey` (satu key — bukan localStorage.clear) dibersihkan
    //    sinkron TEPAT sebelum reload, tanpa await di antaranya. Key turunan
    //    (-user / -code-verifier) sengaja tidak disentuh: inert pada app ini
    //    (userStorage tidak dikonfigurasi; login password tanpa PKCE).
    try {
      localStorage.removeItem(USER_CACHE_KEY)
      const key = supabase.auth.storageKey
      if (key) localStorage.removeItem(key)
    } catch {
      /* abaikan */
    }
    window.location.reload()
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-base">
    <!-- Panel branding — desktop -->
    <div class="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-primary-900 px-12 text-white lg:flex">
      <div class="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-700/50" aria-hidden="true" />
      <div class="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-primary-800/60" aria-hidden="true" />
      <div class="relative z-10 mx-auto w-full max-w-md">
        <div class="mb-8 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/20">
          <img v-if="sekolah?.logo_url" :src="sekolah.logo_url" alt="Logo madrasah" class="h-full w-full object-contain" />
          <span v-else class="text-2xl font-bold tracking-wider">EDU</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight">Sistem Terpadu Madrasah</h1>
        <p class="mt-3 text-[15px] leading-relaxed text-emerald-100/80">
          Presensi siswa, administrasi akademik, dan sirkulasi perpustakaan dalam satu portal yang cepat dan aman.
        </p>
        <ul class="mt-8 flex flex-col gap-3.5">
          <li v-for="h in highlights" :key="h.text" class="flex items-center gap-3 text-sm text-emerald-50/90">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <component :is="h.icon" class="h-4 w-4" aria-hidden="true" />
            </span>
            {{ h.text }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Panel form -->
    <div class="flex w-full items-center justify-center bg-white px-4 py-10 sm:px-6 lg:w-1/2 lg:px-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 text-center lg:text-left">
          <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary-700 p-2 lg:hidden">
            <img v-if="sekolah?.logo_url" :src="sekolah.logo_url" alt="Logo madrasah" class="h-full w-full object-contain" />
            <span v-else class="text-xl font-bold text-white">EDU</span>
          </div>
          <h2 class="text-xl font-bold tracking-tight text-slate-900">
            {{ sekolah?.nama_sekolah || 'Sistem Presensi Siswa' }}
          </h2>
          <p class="mt-1.5 text-sm text-slate-500">Masuk untuk melanjutkan ke dashboard</p>
        </div>

        <form class="flex flex-col gap-4" novalidate @submit.prevent="handleLogin">
          <AppInput
            v-model="username"
            label="Username"
            type="text"
            autocomplete="username"
            placeholder="Masukkan username"
          >
            <template #leading><User class="h-4 w-4" aria-hidden="true" /></template>
          </AppInput>

          <AppInput
            v-model="password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="••••••••"
          >
            <template #leading><Lock class="h-4 w-4" aria-hidden="true" /></template>
            <template #trailing>
              <button
                type="button"
                class="trailing-action"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" aria-hidden="true" />
                <Eye v-else class="h-4 w-4" aria-hidden="true" />
              </button>
            </template>
          </AppInput>

          <AppButton type="submit" block :loading="loading" :disabled="recovering" class="mt-2 !py-3">
            <template #icon><LogIn class="h-4 w-4" aria-hidden="true" /></template>
            {{ loading ? 'Memeriksa…' : 'Masuk Sekarang' }}
          </AppButton>
        </form>

        <!-- Self-recovery: hanya muncul bila login melewati batas waktu (hang / sesi bermasalah) -->
        <AppAlert v-if="showRecovery" tone="warning" title="Mengalami masalah?" class="mt-4">
          <p>Proses masuk membutuhkan waktu lebih lama dari biasanya.</p>
          <AppButton
            type="button"
            variant="warning"
            size="sm"
            block
            class="mt-2.5"
            :loading="recovering"
            @click="handleRecoverSession"
          >
            Pulihkan Sesi
          </AppButton>
        </AppAlert>

        <p class="mt-8 text-center text-xs text-slate-400 lg:text-left">
          &copy; {{ new Date().getFullYear() }}
          <a href="https://github.com/falconafk31/presensi-siswa" target="_blank" rel="noopener noreferrer" class="font-medium transition-colors hover:text-primary-700">Sistem Presensi Open Source</a>
          &middot; <a href="https://github.com/falconafk31/presensi-siswa" target="_blank" rel="noopener noreferrer" class="underline">GitHub</a>
        </p>
      </div>
    </div>
  </div>
</template>
