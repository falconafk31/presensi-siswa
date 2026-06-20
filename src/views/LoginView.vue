<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { LogIn, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const sekolah = ref(null)

onMounted(async () => {
  try {
    sekolah.value = await settingsStore.fetchSettings()
  } catch {
    // header generik kalau gagal
  }
})

async function handleLogin() {
  if (!username.value || !password.value) {
    toast.error('Username dan password wajib diisi')
    return
  }
  loading.value = true
  try {
    const user = await auth.login(username.value.trim(), password.value)
    toast.success(`Selamat datang, ${user.nama}`)
    const redirect = route.query.redirect || { name: 'dashboard' }
    router.replace(redirect)
  } catch (e) {
    toast.error(e.message || 'Gagal masuk')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Left Panel (Branding / Illustration) - Hidden on mobile -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 items-center justify-center">
      <!-- Decorative circles -->
      <div class="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"></div>
      <div class="absolute bottom-20 right-20 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10 p-12 text-center text-white max-w-lg">
        <div class="mx-auto mb-8 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-white/10 p-4 shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
          <img
            v-if="sekolah?.logo_url"
            :src="sekolah.logo_url"
            alt="Logo"
            class="h-full w-full object-contain"
          />
          <span v-else class="text-4xl font-bold text-white">MIN</span>
        </div>
        <h1 class="text-4xl font-bold mb-4 tracking-tight">Sistem Terpadu</h1>
        <p class="text-lg text-emerald-100/80 font-light leading-relaxed">
          Kelola presensi siswa, administrasi akademik, dan sirkulasi perpustakaan dalam satu portal modern yang cepat dan aman.
        </p>
      </div>
    </div>

    <!-- Right Panel (Login Form) -->
    <div class="flex w-full lg:w-1/2 items-center justify-center px-4 py-10 sm:px-6 lg:px-8 relative bg-white">
      <!-- Mobile Background Decoration -->
      <div class="absolute inset-0 lg:hidden bg-gradient-to-br from-emerald-50/50 to-white"></div>
      
      <div class="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div class="mb-10 text-center lg:text-left">
          <div class="lg:hidden mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-900 shadow-lg">
            <img v-if="sekolah?.logo_url" :src="sekolah.logo_url" alt="Logo" class="h-full w-full object-contain" />
            <span v-else class="text-2xl font-bold text-white">MIN</span>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">
            {{ sekolah?.nama_sekolah || 'Sistem Presensi MIN Blora' }}
          </h2>
          <p class="mt-2 text-sm text-gray-500">Silakan masukkan kredensial Anda untuk melanjutkan</p>
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Username</label>
            <div class="relative">
              <User class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                class="block w-full rounded-xl border-gray-200 pl-10 py-2.5 text-sm shadow-sm transition-all focus:border-emerald-500 focus:ring-emerald-500/20"
                placeholder="Masukkan username"
              />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="block w-full rounded-xl border-gray-200 pl-10 pr-10 py-2.5 text-sm shadow-sm transition-all focus:border-emerald-500 focus:ring-emerald-500/20"
                placeholder="••••••••"
              />
              <button
                type="button"
                class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow disabled:opacity-70 active:scale-[0.98]"
          >
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            <LogIn v-else class="h-4 w-4" />
            {{ loading ? 'Sedang Memeriksa...' : 'Masuk Sekarang' }}
          </button>
        </form>
        
        <p class="mt-8 text-center text-xs text-gray-400 lg:text-left">
          Ditenagai oleh Supabase Auth &bull; 2024
        </p>
      </div>
    </div>
  </div>
</template>
