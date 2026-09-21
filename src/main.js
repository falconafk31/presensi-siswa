import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
// Font Inter self-host (variable font: 1 file untuk semua bobot 100–900,
// font-display: swap, unicode-range latin). Tanpa CDN Google Fonts.
import '@fontsource-variable/inter'
import './style.css'

import { useAuthStore } from './stores/auth'

import { toast } from 'vue-sonner'

// Hapus secara paksa semua Service Worker yang tersangkut (menyebabkan blank putih)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister()
    }
  })
}

const app = createApp(App)
app.use(createPinia())

// Global Error Handler to prevent white screen of death
app.config.errorHandler = (err, instance, info) => {
  console.error('Global Error Caught:', err, info)
  toast.error(`Terjadi kesalahan internal: ${err?.message || err}. Silakan muat ulang halaman.`)
}

const auth = useAuthStore()

// Batas waktu keras boot: jika jaringan sangat lambat/Supabase tak terjangkau,
// aplikasi tetap di-mount agar splash tidak menggantung tanpa batas.
// (Guard router akan mengarahkan ke /login bila sesi ternyata tidak valid.)
const BOOT_TIMEOUT_MS = 5000
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function boot() {
  // Inisialisasi sesi & profil (profil dibaca dari cache lokal → instan
  // pada kunjungan ulang, sehingga mount tidak menunggu round-trip jaringan).
  await Promise.race([auth.initialize(), timeout(BOOT_TIMEOUT_MS)])

  app.use(router)
  // Tunggu navigasi pertama selesai (chunk rute pertama sudah termuat) sebelum
  // mount — splash hanya hilang tepat saat halaman penuh sudah ter-render,
  // sehingga tidak ada kedipan "kosong → skeleton → konten".
  await router.isReady()
  app.mount('#app')
}

boot()
