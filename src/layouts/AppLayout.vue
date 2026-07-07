<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Menu, X, LogOut, CalendarRange, RefreshCw, ChevronLeft, ChevronDown, User } from 'lucide-vue-next'
import { navItems, bottomTabsPresensi, bottomTabsPerpus, bottomTabsAdmin } from '@/config/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePeriodStore } from '@/stores/period'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const periodStore = usePeriodStore()

const sidebarOpen = ref(false)
const sidebarCollapsed = useStorage('sidebar.collapsed', false)
const profileOpen = ref(false)

// Track screen width so collapsed only applies on desktop (lg >= 1024px)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isDesktop = computed(() => windowWidth.value >= 1024)
const isCollapsed = computed(() => isDesktop.value && sidebarCollapsed.value)

const visibleNav = computed(() => {
  return navItems.filter((item) => {
    if (item.adminOnly && !auth.isAdmin) return false
    if (item.perpusOnly && !auth.canManagePerpus) return false
    if (item.presensiOnly && !auth.canManagePresensi) return false
    return true
  })
})

// Daftar nama rute yang termasuk dalam area perpustakaan
const perpusRoutes = [
  'dashboard-perpus', 'kunjungan-perpus', 'buku', 'peminjaman', 'rekap-perpus', 'cetak-kartu'
]

// Daftar nama rute yang termasuk dalam area administrasi
const adminRoutes = [
  'siswa', 'guru', 'kalender', 'riwayat-kelas', 'aktivitas', 'pengaturan'
]

// Bottom tabs depend on current route context and user role
const bottomTabs = computed(() => {
  // UX Fix: Jika sedang berada di halaman administrasi, tampilkan navigasi admin
  if (route.name && adminRoutes.includes(route.name)) {
    return bottomTabsAdmin
  }
  // UX Fix: Jika sedang berada di halaman perpustakaan, tampilkan navigasi perpus
  if (route.name && perpusRoutes.includes(route.name)) {
    return bottomTabsPerpus
  }
  // Fallback: Jika role HANYA pustakawan, selalu tampilkan navigasi perpus
  if (auth.isPustakawan && !auth.isAdmin && !auth.isGuru) {
    return bottomTabsPerpus
  }
  return bottomTabsPresensi
})

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  if (!periodStore.activePeriod) periodStore.fetchActivePeriod()
})

// Close profile dropdown on outside click
function onClickOutsideProfile(e) {
  if (!e.target.closest('.profile-dropdown-area')) {
    profileOpen.value = false
  }
}

async function clearCacheAndReload() {
  toast.info('Membersihkan cache aplikasi...')
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (let registration of registrations) {
      await registration.unregister()
    }
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    for (let key of keys) {
      await caches.delete(key)
    }
  }
  setTimeout(() => { window.location.reload() }, 1000)
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

const userInitial = computed(() => {
  const nama = auth.user?.nama || ''
  return nama.charAt(0).toUpperCase()
})
</script>

<template>
  <div class="min-h-screen bg-base" @click="onClickOutsideProfile">
    <!-- Overlay (mobile) -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex flex-col bg-gradient-to-t from-primary to-[#039981] text-white transition-all duration-300 lg:translate-x-0"
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        isCollapsed ? 'w-[68px]' : 'w-64'
      ]"
    >
      <!-- Logo / Brand -->
      <div class="flex items-center gap-3 border-b border-white/10 px-4 py-4" :class="isCollapsed && 'justify-center px-2'">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10">
          <img
            v-if="settingsStore.settings?.logo_url"
            :src="settingsStore.settings.logo_url"
            alt="Logo"
            class="h-full w-full object-contain"
          />
          <span v-else class="text-sm font-bold">MIN</span>
        </div>
        <div v-if="!isCollapsed" class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">
            {{ settingsStore.settings?.nama_sekolah || 'MIN Blora' }}
          </p>
          <p class="text-xs text-white/60">Sistem Presensi</p>
        </div>
        <button class="ml-auto lg:hidden" @click="closeSidebar">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Collapse Toggle (Desktop only) -->
      <button
        class="hidden lg:flex absolute -right-3 top-[72px] z-50 h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-500 hover:text-primary hover:shadow-lg transition-all duration-200"
        @click="sidebarCollapsed = !sidebarCollapsed"
        :title="sidebarCollapsed ? 'Perlebar sidebar' : 'Kecilkan sidebar'"
      >
        <ChevronLeft class="h-3.5 w-3.5 transition-transform duration-300" :class="sidebarCollapsed && 'rotate-180'" />
      </button>

      <!-- Navigation -->
      <nav class="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3" :class="isCollapsed && 'px-1.5'">
        <template v-for="(item, idx) in visibleNav" :key="idx">
          <!-- Section Headers -->
          <div
            v-if="item.isHeader"
            class="mb-1.5 mt-4 first:mt-0 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40"
            :class="isCollapsed && 'px-0 text-center'"
          >
            <span v-if="!isCollapsed">{{ item.label }}</span>
            <span v-else class="block h-px bg-white/10 mx-2 my-3" />
          </div>

          <!-- Nav Items -->
          <RouterLink
            v-else
            :to="item.to"
            class="nav-item group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white hover:translate-x-1 hover:shadow-sm"
            :class="isCollapsed && 'justify-center px-0 py-2.5 hover:translate-x-0'"
            exact-active-class="nav-active !bg-white/15 !text-white font-semibold !translate-x-0 backdrop-blur-md ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
            @click="closeSidebar"
          >
            <!-- Active indicator bar with 2026 glow -->
            <span
              v-if="route.name === item.to.name"
              class="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gold transition-all duration-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            />
            <component :is="item.icon" class="h-[18px] w-[18px] shrink-0 transition-all duration-300" :class="route.name === item.to.name ? 'text-gold drop-shadow-md scale-110' : 'text-white/60 group-hover:text-white group-hover:scale-110'" />
            <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>

            <!-- Tooltip saat collapsed -->
            <div
              v-if="isCollapsed"
              class="absolute left-full ml-2 hidden group-hover:flex items-center z-50"
            >
              <div class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
                {{ item.label }}
              </div>
            </div>
          </RouterLink>
        </template>
      </nav>

      <!-- User Footer (Sidebar) - Only shown on mobile drawer -->
      <div class="border-t border-white/10 p-2 lg:hidden">
        <div class="mb-2 px-3">
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

      <!-- Desktop Sidebar Footer — Modern Glass Card -->
      <div class="hidden lg:block p-3 mt-auto">
        <template v-if="!isCollapsed">
          <div class="bg-black/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-lg">
            <div class="mb-3">
              <p class="truncate text-sm font-semibold text-white tracking-tight">{{ auth.user?.nama }}</p>
              <p class="text-[11px] font-medium text-emerald-100/70 uppercase tracking-wider mt-0.5">
                {{ auth.user?.role }}<span v-if="auth.kelas"> · {{ auth.kelas }}</span>
              </p>
            </div>
            <div class="space-y-1">
              <button
                class="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white"
                @click="clearCacheAndReload"
              >
                <RefreshCw class="h-3.5 w-3.5" /> Refresh
              </button>
              <button
                class="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-rose-200/80 transition-all duration-300 hover:bg-rose-500/20 hover:text-rose-100"
                @click="handleLogout"
              >
                <LogOut class="h-3.5 w-3.5" /> Keluar
              </button>
            </div>
          </div>
        </template>
        <!-- Collapsed: just icons -->
        <template v-else>
          <div class="flex flex-col items-center gap-1">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
              {{ userInitial }}
            </div>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition"
              @click="clearCacheAndReload"
              title="Refresh App"
            >
              <RefreshCw class="h-4 w-4" />
            </button>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition"
              @click="handleLogout"
              title="Keluar"
            >
              <LogOut class="h-4 w-4" />
            </button>
          </div>
        </template>
      </div>
    </aside>

    <!-- Main -->
    <div class="transition-all duration-300" :class="isCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64'">
      <header
        class="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-md"
      >
        <!-- Mobile: Hamburger (now opens "More" drawer) -->
        <button class="lg:hidden" @click="sidebarOpen = true">
          <Menu class="h-5 w-5 text-primary" />
        </button>

        <!-- Mobile: Show current page name -->
        <div class="lg:hidden min-w-0 flex-1">
          <p class="text-sm font-semibold text-gray-800 truncate">{{ currentRouteName }}</p>
        </div>

        <!-- Desktop: Greeting -->
        <div class="hidden lg:block">
          <p class="text-sm font-medium text-gray-800">
            {{ greeting }}, {{ auth.user?.nama?.split(' ')[0] }} 👋
          </p>
          <p class="text-xs text-gray-400">{{ currentRouteName }}</p>
        </div>

        <div class="hidden lg:block flex-1" />

        <!-- Period Badge -->
        <div
          class="flex items-center gap-1.5 rounded-xl bg-primary-accent px-2.5 py-1.5 text-xs font-medium text-primary"
        >
          <CalendarRange class="h-3.5 w-3.5 shrink-0" />
          {{ periodStore.label }}
        </div>

        <!-- Desktop: Profile Avatar Dropdown -->
        <div class="hidden lg:block relative profile-dropdown-area">
          <button
            class="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-100"
            @click.stop="profileOpen = !profileOpen"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {{ userInitial }}
            </div>
            <ChevronDown class="h-3.5 w-3.5 text-gray-400 transition-transform duration-200" :class="profileOpen && 'rotate-180'" />
          </button>

          <!-- Dropdown -->
          <Transition name="dropdown">
            <div
              v-if="profileOpen"
              class="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-gray-100 ring-1 ring-black/5"
            >
              <div class="px-3 py-2.5 border-b border-gray-100 mb-1">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ auth.user?.nama }}</p>
                <p class="text-xs text-gray-500">
                  {{ auth.user?.role }}<span v-if="auth.kelas"> · Kelas {{ auth.kelas }}</span>
                </p>
              </div>
              <button
                class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                @click="clearCacheAndReload(); profileOpen = false"
              >
                <RefreshCw class="h-4 w-4 text-gray-400" />
                Refresh App
              </button>
              <button
                class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                @click="handleLogout(); profileOpen = false"
              >
                <LogOut class="h-4 w-4" />
                Keluar
              </button>
            </div>
          </Transition>
        </div>
      </header>

      <!-- Main Content (extra bottom padding on mobile for bottom tab bar) -->
      <main class="p-4 pb-20 sm:p-6 lg:pb-6">
        <RouterView />
      </main>
    </div>

    <!-- Bottom Tab Bar (Mobile Only) -->
    <nav class="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md lg:hidden safe-area-pb">
      <div class="flex items-center justify-around">
        <RouterLink
          v-for="tab in bottomTabs"
          :key="tab.to.name"
          :to="tab.to"
          class="group flex flex-1 flex-col items-center gap-0.5 py-2 text-gray-400 transition-colors relative"
          exact-active-class="!text-primary"
        >
          <!-- Active indicator dot -->
          <span
            v-if="route.name === tab.to.name"
            class="absolute top-0.5 h-0.5 w-5 rounded-full bg-primary"
          />
          <component :is="tab.icon" class="h-5 w-5 transition-transform group-active:scale-90" />
          <span class="text-[10px] font-medium leading-tight">{{ tab.label }}</span>
        </RouterLink>

        <!-- "Lainnya" button opens sidebar drawer -->
        <button
          class="group flex flex-1 flex-col items-center gap-0.5 py-2 text-gray-400 transition-colors"
          @click="sidebarOpen = true"
        >
          <Menu class="h-5 w-5 transition-transform group-active:scale-90" />
          <span class="text-[10px] font-medium leading-tight">Lainnya</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Dropdown transition */
.dropdown-enter-active {
  transition: all 0.15s ease-out;
}
.dropdown-leave-active {
  transition: all 0.1s ease-in;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.98);
}

/* Safe area for iPhone notch/home indicator */
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
