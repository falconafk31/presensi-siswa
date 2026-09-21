<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Menu, X, LogOut, CalendarRange, RefreshCw, ChevronLeft, ChevronDown } from 'lucide-vue-next'
import { navItems, bottomTabsPresensi, bottomTabsPerpus, bottomTabsAdmin } from '@/config/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePeriodStore } from '@/stores/period'
import { AppDropdown } from '@/components/ui'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const periodStore = usePeriodStore()

const sidebarOpen = ref(false)
const sidebarCollapsed = useStorage('sidebar.collapsed', false)

// Track screen width so collapsed only applies on desktop (lg >= 1024px)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
function onResize() { windowWidth.value = window.innerWidth }
function onKeydown(e) {
  if (e.key === 'Escape') sidebarOpen.value = false
}
onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('keydown', onKeydown)
})
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

const perpusRoutes = ['dashboard-perpus', 'kunjungan-perpus', 'buku', 'peminjaman', 'rekap-perpus', 'cetak-kartu', 'scan-qr']
const adminRoutes = ['siswa', 'guru', 'kalender', 'riwayat-kelas', 'aktivitas', 'pengaturan']

const bottomTabs = computed(() => {
  if (route.name && adminRoutes.includes(route.name)) return bottomTabsAdmin
  if (route.name && perpusRoutes.includes(route.name)) return bottomTabsPerpus
  if (auth.isPustakawan && !auth.isAdmin && !auth.isGuru) return bottomTabsPerpus
  return bottomTabsPresensi
})

// Close mobile drawer on navigation
watch(() => route.fullPath, () => { sidebarOpen.value = false })

onMounted(() => {
  if (!settingsStore.settings) settingsStore.fetchSettings()
  if (!periodStore.activePeriod) periodStore.fetchActivePeriod()
  // Lock body scroll when drawer open (mobile)
  watch(sidebarOpen, (open) => {
    if (!isDesktop.value) document.body.style.overflow = open ? 'hidden' : ''
  })
})

async function clearCacheAndReload() {
  toast.info('Membersihkan cache aplikasi...')
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) await registration.unregister()
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    for (const key of keys) await caches.delete(key)
  }
  setTimeout(() => { window.location.reload() }, 800)
}

function handleLogout() {
  auth.logout()
  toast.success('Berhasil keluar')
  router.replace({ name: 'login' })
}

function closeSidebar() { sidebarOpen.value = false }

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
})

const currentRouteName = computed(() => {
  const item = navItems.find((n) => n.to && route.matched.some((r) => r.name === n.to.name))
  return item?.label || 'Dashboard'
})

const userInitial = computed(() => (auth.user?.nama || '?').charAt(0).toUpperCase())
const isActive = (name) => route.name === name
</script>

<template>
  <div class="min-h-screen bg-base">
    <!-- Overlay (mobile drawer) -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        aria-hidden="true"
        @click="closeSidebar"
      />
    </Transition>

    <!-- ============ Sidebar / Drawer ============ -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 lg:translate-x-0"
      :class="[sidebarOpen ? 'translate-x-0' : '-translate-x-full', isCollapsed ? 'w-[72px]' : 'w-[260px]']"
      role="navigation"
      aria-label="Navigasi utama"
    >
      <!-- Brand -->
      <div class="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-100 px-3.5" :class="isCollapsed && 'justify-center px-2'">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-700 text-white">
          <img
            v-if="settingsStore.settings?.logo_url"
            :src="settingsStore.settings.logo_url"
            alt="Logo madrasah"
            class="h-full w-full bg-white object-contain p-0.5"
          />
          <span v-else class="text-xs font-bold tracking-tight">MIN</span>
        </div>
        <div v-if="!isCollapsed" class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-semibold leading-tight text-slate-900">
            {{ settingsStore.settings?.nama_sekolah || 'Madrasah' }}
          </p>
          <p class="text-[11px] leading-tight text-slate-400">Sistem Presensi</p>
        </div>
        <button class="btn-icon -mr-1 lg:hidden" aria-label="Tutup menu" @click="closeSidebar">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Collapse toggle (desktop) -->
      <button
        class="absolute -right-3 top-[52px] z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-xs transition-colors hover:border-primary-300 hover:text-primary-700 lg:flex"
        :aria-label="sidebarCollapsed ? 'Perlebar sidebar' : 'Kecilkan sidebar'"
        :title="sidebarCollapsed ? 'Perlebar sidebar' : 'Kecilkan sidebar'"
        @click="sidebarCollapsed = !sidebarCollapsed"
      >
        <ChevronLeft class="h-3.5 w-3.5 transition-transform duration-200" :class="sidebarCollapsed && 'rotate-180'" />
      </button>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" :aria-label="'Menu navigasi'">
        <template v-for="(item, idx) in visibleNav" :key="idx">
          <p
            v-if="item.isHeader"
            class="mb-1.5 mt-4 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 first:mt-0"
            :class="isCollapsed && '!px-0'"
            aria-hidden="true"
          >
            <span v-if="!isCollapsed">{{ item.label }}</span>
            <span v-else class="mx-1 block h-px bg-slate-100" />
          </p>
          <RouterLink
            v-else
            :to="item.to"
            class="group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors"
            :class="[
              isActive(item.to.name)
                ? 'bg-primary-50 text-primary-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              isCollapsed && 'justify-center px-0',
            ]"
            :aria-current="isActive(item.to.name) ? 'page' : undefined"
            :title="isCollapsed ? item.label : undefined"
            @click="closeSidebar"
          >
            <span
              v-if="isActive(item.to.name)"
              class="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-600"
              aria-hidden="true"
            />
            <component
              :is="item.icon"
              class="h-[18px] w-[18px] shrink-0"
              :class="isActive(item.to.name) ? 'text-primary-700' : 'text-slate-400 group-hover:text-slate-600'"
              aria-hidden="true"
            />
            <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- Sidebar footer: user -->
      <div class="shrink-0 border-t border-slate-100 p-2.5">
        <div v-if="!isCollapsed" class="rounded-lg bg-slate-50 px-3 py-2.5">
          <p class="truncate text-[13px] font-semibold text-slate-800">{{ auth.user?.nama }}</p>
          <p class="text-[11px] text-slate-400">
            {{ auth.user?.role }}<span v-if="auth.kelas"> · Kelas {{ auth.kelas }}</span>
          </p>
          <div class="mt-2 flex items-center gap-1">
            <button class="btn-ghost btn-sm !px-2 flex-1" @click="clearCacheAndReload">
              <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" /> Refresh
            </button>
            <button class="btn-ghost btn-sm !px-2 flex-1 !text-rose-600 hover:!bg-rose-50" @click="handleLogout">
              <LogOut class="h-3.5 w-3.5" aria-hidden="true" /> Keluar
            </button>
          </div>
        </div>
        <div v-else class="hidden flex-col items-center gap-1 lg:flex">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white" :title="auth.user?.nama">
            {{ userInitial }}
          </div>
          <button class="btn-icon" title="Refresh App" aria-label="Refresh aplikasi" @click="clearCacheAndReload">
            <RefreshCw class="h-4 w-4" />
          </button>
          <button class="btn-icon hover:!bg-rose-50 hover:!text-rose-600" title="Keluar" aria-label="Keluar" @click="handleLogout">
            <LogOut class="h-4 w-4" />
          </button>
        </div>
        <!-- Mobile drawer footer uses expanded layout -->
        <div v-if="!isDesktop" class="lg:hidden" />
      </div>
    </aside>

    <!-- ============ Main column ============ -->
    <div class="transition-[padding] duration-200" :class="isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'">
      <!-- Header — compact -->
      <header class="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-sm sm:px-4">
        <button class="btn-icon lg:hidden" aria-label="Buka menu navigasi" @click="sidebarOpen = true">
          <Menu class="h-5 w-5 text-slate-600" />
        </button>

        <div class="min-w-0 flex-1 lg:hidden">
          <p class="truncate text-sm font-semibold text-slate-900">{{ currentRouteName }}</p>
        </div>

        <div class="hidden min-w-0 lg:block">
          <p class="truncate text-[13px] text-slate-500">
            {{ greeting }}, <span class="font-semibold text-slate-800">{{ auth.user?.nama?.split(' ')[0] }}</span>
            <span class="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            <span>{{ currentRouteName }}</span>
          </p>
        </div>

        <div class="flex-1" />

        <!-- Academic period -->
        <div class="badge-primary !py-1.5" role="status" :aria-label="`Periode aktif ${periodStore.label}`">
          <CalendarRange class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span class="hidden sm:inline">{{ periodStore.label }}</span>
          <span class="sm:hidden">{{ periodStore.activePeriod?.tahun_ajaran || '—' }}</span>
        </div>

        <!-- Profile -->
        <AppDropdown align="right" label="Menu profil">
          <template #trigger>
            <button class="flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-slate-100" aria-label="Menu profil pengguna">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">
                {{ userInitial }}
              </div>
              <ChevronDown class="hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
            </button>
          </template>
          <template #default="{ close }">
            <div class="border-b border-slate-100 px-3 py-2.5">
              <p class="truncate text-sm font-semibold text-slate-800">{{ auth.user?.nama }}</p>
              <p class="text-xs text-slate-500">{{ auth.user?.role }}<span v-if="auth.kelas"> · Kelas {{ auth.kelas }}</span></p>
            </div>
            <button class="dropdown-item" @click="clearCacheAndReload(); close()">
              <RefreshCw class="h-4 w-4 text-slate-400" aria-hidden="true" /> Refresh App
            </button>
            <button class="dropdown-item !text-rose-600 hover:!bg-rose-50" @click="handleLogout(); close()">
              <LogOut class="h-4 w-4" aria-hidden="true" /> Keluar
            </button>
          </template>
        </AppDropdown>
      </header>

      <!-- Page content -->
      <main class="p-4 pb-24 sm:p-6 lg:p-6 lg:pb-10">
        <div class="page">
          <RouterView />
        </div>
      </main>
    </div>

    <!-- ============ Bottom navigation (mobile) ============ -->
    <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/98 backdrop-blur-sm lg:hidden safe-area-pb" aria-label="Navigasi cepat">
      <div class="flex items-stretch">
        <RouterLink
          v-for="tab in bottomTabs"
          :key="tab.to.name"
          :to="tab.to"
          class="relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors"
          :class="isActive(tab.to.name) ? 'text-primary-700' : 'text-slate-400 hover:text-slate-600'"
          :aria-current="isActive(tab.to.name) ? 'page' : undefined"
        >
          <span
            v-if="isActive(tab.to.name)"
            class="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary-600"
            aria-hidden="true"
          />
          <component :is="tab.icon" class="h-5 w-5" aria-hidden="true" />
          <span class="text-[10.5px] font-medium leading-none">{{ tab.label }}</span>
        </RouterLink>
        <button
          class="flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-slate-400 transition-colors hover:text-slate-600"
          aria-label="Buka semua menu"
          @click="sidebarOpen = true"
        >
          <Menu class="h-5 w-5" aria-hidden="true" />
          <span class="text-[10.5px] font-medium leading-none">Lainnya</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
