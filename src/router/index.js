import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      // Semua view di-lazy-load (code-splitting otomatis via Vite).
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { presensiOnly: true },
      },
      {
        path: 'presensi',
        name: 'presensi',
        component: () => import('@/views/InputPresensiView.vue'),
        meta: { presensiOnly: true },
      },
      {
        path: 'rekap',
        name: 'rekap',
        component: () => import('@/views/RekapView.vue'),
        meta: { presensiOnly: true },
      },
      {
        path: 'rekap-semester',
        name: 'rekap-semester',
        component: () => import('@/views/RekapSemesterView.vue'),
        meta: { presensiOnly: true },
      },
      {
        path: 'siswa',
        name: 'siswa',
        component: () => import('@/views/SiswaView.vue'),
        meta: { adminOnly: true },
      },
      {
        path: 'guru',
        name: 'guru',
        component: () => import('@/views/GuruView.vue'),
        meta: { adminOnly: true },
      },
      {
        path: 'kalender',
        name: 'kalender',
        component: () => import('@/views/KalenderView.vue'),
        meta: { adminOnly: true },
      },
      {
        path: 'statistik',
        name: 'statistik',
        component: () => import('@/views/StatistikView.vue'),
        meta: { presensiOnly: true },
      },
      {
        path: 'riwayat-kelas',
        name: 'riwayat-kelas',
        component: () => import('@/views/RiwayatKelasView.vue'),
        meta: { adminOnly: true },
      },
      {
        path: 'aktivitas',
        name: 'aktivitas',
        component: () => import('@/views/AktivitasView.vue'),
        meta: { adminOnly: true },
      },
      {
        path: 'pengaturan',
        name: 'pengaturan',
        component: () => import('@/views/PengaturanView.vue'),
        meta: { adminOnly: true },
      },
      {
        path: 'dashboard-perpus',
        name: 'dashboard-perpus',
        component: () => import('@/views/DashboardPerpusView.vue'),
        meta: { perpusOnly: true },
      },
      {
        path: 'cetak-kartu',
        name: 'cetak-kartu',
        component: () => import('@/views/CetakKartuView.vue'),
        meta: { perpusOnly: true },
      },
      {
        path: 'scan-qr',
        name: 'scan-qr',
        component: () => import('@/views/ScanQRView.vue'),
        meta: { perpusOnly: true },
      },
      {
        path: 'buku',
        name: 'buku',
        component: () => import('@/views/BukuView.vue'),
        meta: { perpusOnly: true },
      },
      {
        path: 'peminjaman',
        name: 'peminjaman',
        component: () => import('@/views/PeminjamanView.vue'),
        meta: { perpusOnly: true },
      },
      {
        path: 'rekap-perpus',
        name: 'rekap-perpus',
        component: () => import('@/views/RekapPerpusView.vue'),
        meta: { perpusOnly: true },
      },
      {
        path: 'kunjungan-perpus',
        name: 'kunjungan-perpus',
        component: () => import('@/views/KunjunganPerpusView.vue'),
        meta: { perpusOnly: true },
      },
      {
        path: 'panduan',
        name: 'panduan',
        component: () => import('@/views/PanduanView.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    if (auth.user?.role === 'Pustakawan') return { name: 'dashboard-perpus' }
    return { name: 'dashboard' }
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return { name: 'dashboard' }
  }
  if (to.meta.perpusOnly && !auth.canManagePerpus) {
    return { name: auth.isAdmin ? 'dashboard' : 'login' }
  }
  if (to.meta.presensiOnly && !auth.canManagePresensi) {
    return { name: 'dashboard-perpus' }
  }
})

router.onError((error, to) => {
  if (error.message.includes('Failed to fetch dynamically imported module') || error.name === 'ChunkLoadError') {
    console.warn('Chunk load error detected, reloading page to fetch latest version...', error)
    window.location.href = to.fullPath
  }
})

export default router
