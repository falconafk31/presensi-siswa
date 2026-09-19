<script setup>
import { FolderOpen } from 'lucide-vue-next'
defineProps({
  title: { type: String, default: 'Belum ada data' },
  description: { type: String, default: '' },
  icon: { type: Object, default: () => FolderOpen },
})
</script>
<template>
  <div class="state-box">
    <div class="state-icon">
      <component :is="icon" class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="text-[15px] font-semibold text-slate-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-slate-500">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5 flex flex-wrap items-center justify-center gap-2">
      <slot name="action" />
    </div>
  </div>
</template>
