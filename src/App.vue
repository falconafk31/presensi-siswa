<script setup>
import { watch, onMounted } from 'vue'
import { Toaster } from 'vue-sonner'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

onMounted(() => {
  if (!settingsStore.settings) {
    settingsStore.fetchSettings()
  }
})

watch(() => settingsStore.settings?.logo_url, (url) => {
  if (url) {
    // Cari dan hapus semua jenis tag icon (termasuk apple-touch-icon)
    const existingLinks = document.querySelectorAll("link[rel*='icon']")
    existingLinks.forEach(link => link.remove())

    const newLink = document.createElement('link')
    newLink.rel = 'icon'
    newLink.href = url
    document.head.appendChild(newLink)
  }
}, { immediate: true })
</script>

<template>
  <RouterView />
  <Toaster position="top-right" rich-colors :duration="2000" />
</template>
