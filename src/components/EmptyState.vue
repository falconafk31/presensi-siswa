<script setup>
// Legacy alias — unified empty state.
import { FolderOpen } from 'lucide-vue-next'
import AppEmptyState from './ui/AppEmptyState.vue'
defineProps({
  title: { type: String, default: 'Tidak Ada Data' },
  description: { type: String, default: 'Belum ada data yang dapat ditampilkan.' },
  icon: { type: Object, default: () => FolderOpen },
})
</script>
<template>
  <AppEmptyState :title="title" :description="description" :icon="icon">
    <template v-if="$slots.action" #action><slot name="action" /></template>
  </AppEmptyState>
</template>
