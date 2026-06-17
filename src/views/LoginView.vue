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
  <div class="flex min-h-screen items-center justify-center bg-primary-accent px-4 py-10">
    <div class="w-full max-w-md">
      <div class="mb-6 text-center">
        <div
          class="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary shadow-md"
        >
          <img
            v-if="sekolah?.logo_url"
            :src="sekolah.logo_url"
            alt="Logo"
            class="h-full w-full object-contain"
          />
          <span v-else class="text-2xl font-bold text-white">MIN</span>
        </div>
        <h1 class="text-xl font-bold text-primary">
          {{ sekolah?.nama_sekolah || 'Sistem Presensi MIN Blora' }}
        </h1>
        <p class="mt-1 text-sm text-gray-500">Silakan masuk untuk melanjutkan</p>
      </div>

      <form class="card space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Username</label>
          <div class="relative">
            <User class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              class="input-field pl-9"
              placeholder="username"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <div class="relative">
            <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              class="input-field pl-9 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <LogIn v-else class="h-4 w-4" />
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-gray-400">
        © {{ new Date().getFullYear() }} {{ sekolah?.nama_sekolah || 'MIN Blora' }}
      </p>
    </div>
  </div>
</template>
