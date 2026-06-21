import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

import { useAuthStore } from './stores/auth'

import { toast } from 'vue-sonner'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Optionally show a toast to the user that an update is available
    console.log('Update available')
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

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
