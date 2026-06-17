<script setup>
import { useRoute } from 'vue-router'
import { Construction } from 'lucide-vue-next'
const route = useRoute()
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-accent">
      <Construction class="h-8 w-8 text-primary" />
    </div>
    <h2 class="text-lg font-semibold text-gray-800 capitalize">
      {{ String(route.name).replace('-', ' ') }}
    </h2>
    <p class="mt-1 text-sm text-gray-500">Halaman ini sedang dibangun.</p>
  </div>
</template>
