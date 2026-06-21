<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { Menu, X, LogOut, CalendarRange, Printer, ScanLine, RefreshCw } from 'lucide-vue-next'
import { navItems } from '@/config/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePeriodStore } from '@/stores/period'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const periodStore = usePeriodStore()

const sidebarOpen = ref(false)

const visibleNav = computed(() => {
  const allNav = [...navItems]
  return allNav.filter((item) => {
    if (item.adminOnly && !auth.isAdmin) return false
    if (item.perpusOnly && !auth.canManagePerpus) return false
    if (item.presensiOnly && !auth.canManagePresensi) return false
    return true
  })
})

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  if (!periodStore.activePeriod) periodStore.fetchActivePeriod()
})

async function clearCacheAndReload() {
  toast.info('Membersihkan cache aplikasi...')
  
  // 1. Hapus Service Workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (let registration of registrations) {
      await registration.unregister()
    }
  }

  // 2. Hapus Cache Storage (PWA)
  if ('caches' in window) {
    const keys = await caches.keys()
    for (let key of keys) {
      await caches.delete(key)
    }
  }

  // 3. Muat Ulang Paksa
  setTimeout(() => {
    window.location.reload()
  }, 1000)
}

function handleLogout() {
  auth.logout()
  toast.success('Berhasil keluar')
  router.replace({ name: 'login' })
}

function closeSidebar() {
  sidebarOpen.value = false
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat Pagi'
  if (h < 15) return 'Selamat Siang'
  if (h < 18) return 'Selamat Sore'
  return 'Selamat Malam'
})

const currentRouteName = computed(() => {
  const item = navItems.find(n => n.to && route.matched.some(r => r.name === n.to.name))
  return item?.label || 'Dashboard'
})
</script>

<template>
  <div class="min-h-screen bg-base">
    <!-- Overlay (mobile) -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="closeSidebar"
    />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary text-white transition-transform duration-200 lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/10">
          <img
            v-if="settingsStore.settings?.logo_url"
            :src="settingsStore.settings.logo_url"
            alt="Logo"
            class="h-full w-full object-contain"
          />
          <span v-else class="text-sm font-bold">MIN</span>
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">
            {{ settingsStore.settings?.nama_sekolah || 'MIN Blora' }}
          </p>
          <p class="text-xs text-white/60">Sistem Presensi</p>
        </div>
        <button class="ml-auto lg:hidden" @click="closeSidebar">
          <X class="h-5 w-5" />
        </button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <template v-for="(item, idx) in visibleNav" :key="idx">
          <div
            v-if="item.isHeader"
            class="mb-2 mt-4 px-3 text-[10px] font-bold uppercase tracking-wider text-white/50"
          >
            {{ item.label }}
          </div>
          <RouterLink
            v-else
            :to="item.to"
            class="flex items-center gap-3 rounded-r-xl border-l-4 border-transparent px-3 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10"
            exact-active-class="bg-white/10 !border-gold text-gold pl-4"
            @click="closeSidebar"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" />
            {{ item.label }}
          </RouterLink>
        </template>
      </nav>

      <div class="border-t border-white/10 p-3">
        <div class="mb-2 px-2">
          <p class="truncate text-sm font-medium">{{ auth.user?.nama }}</p>
          <p class="text-xs text-white/60">
            {{ auth.user?.role }}<span v-if="auth.kelas"> · Kelas {{ auth.kelas }}</span>
          </p>
        </div>
        <button
          class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
          @click="clearCacheAndReload"
        >
          <RefreshCw class="h-4 w-4" />
          Refresh App
        </button>
        <button
          class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
          @click="handleLogout"
        >
          <LogOut class="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="lg:pl-64">
      <header
        class="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur"
      >
        <button class="lg:hidden" @click="sidebarOpen = true">
          <Menu class="h-6 w-6 text-primary" />
        </button>
        <div class="hidden sm:block">
          <p class="text-sm font-medium text-gray-800">
            {{ greeting }}, {{ auth.user?.nama?.split(' ')[0] }} 👋
          </p>
          <p class="text-xs text-gray-400">{{ currentRouteName }}</p>
        </div>
        <div class="flex-1" />
        <div
          class="flex items-center gap-2 rounded-xl bg-primary-accent px-3 py-1.5 text-xs font-medium text-primary"
        >
          <CalendarRange class="h-4 w-4" />
          {{ periodStore.label }}
        </div>
      </header>

      <main class="p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
