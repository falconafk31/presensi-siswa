import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
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
auth.initialize().then(() => {
  app.use(router)
  app.mount('#app')
})
