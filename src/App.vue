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
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = url
  }
}, { immediate: true })
</script>

<template>
  <RouterView />
  <Toaster position="top-right" rich-colors />
</template>
