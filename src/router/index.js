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
      },
      {
        path: 'presensi',
        name: 'presensi',
        component: () => import('@/views/InputPresensiView.vue'),
      },
      {
        path: 'rekap',
        name: 'rekap',
        component: () => import('@/views/RekapView.vue'),
      },
      {
        path: 'rekap-semester',
        name: 'rekap-semester',
        component: () => import('@/views/RekapSemesterView.vue'),
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
    return { name: 'dashboard' }
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return { name: 'dashboard' }
  }
})

export default router
