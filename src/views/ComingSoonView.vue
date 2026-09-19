<script setup>
import { useRoute } from 'vue-router'
import { Construction } from 'lucide-vue-next'
import { AppEmptyState } from '@/components/ui'

const route = useRoute()
const pageName = String(route.name || 'Halaman').replace(/-/g, ' ')
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <AppEmptyState
      :title="pageName"
      description="Halaman ini sedang dibangun dan akan segera tersedia."
      :icon="Construction"
    />
  </div>
</template>
