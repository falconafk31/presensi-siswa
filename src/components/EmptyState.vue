<script setup>
import { FolderOpen } from 'lucide-vue-next'

defineProps({
  title: { type: String, default: 'Tidak Ada Data' },
  description: { type: String, default: 'Belum ada data yang dapat ditampilkan.' },
  icon: { type: Object, default: () => FolderOpen }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center px-4">
    <div class="mb-4 rounded-full bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
      <component :is="icon" class="h-8 w-8 text-gray-400" />
    </div>
    <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
    <p class="mt-1 max-w-sm text-sm text-gray-500">{{ description }}</p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
