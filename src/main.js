import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

import { useAuthStore } from './stores/auth'

import { toast } from 'vue-sonner'

const app = createApp(App)
app.use(createPinia())

// Global Error Handler to prevent white screen of death
app.config.errorHandler = (err, instance, info) => {
  console.error('Global Error Caught:', err, info)
  toast.error('Terjadi kesalahan internal. Silakan muat ulang halaman jika masalah berlanjut.')
}

const auth = useAuthStore()
auth.initialize().then(() => {
  app.use(router)
  app.mount('#app')
})
