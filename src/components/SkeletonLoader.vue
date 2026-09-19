<script setup>
// Legacy alias — unified skeleton.
import AppSkeleton from './ui/AppSkeleton.vue'
defineProps({
  rows: { type: Number, default: 3 },
  type: { type: String, default: 'table' },
})
</script>
<template>
  <AppSkeleton :rows="rows" :type="type === 'list' ? 'card' : type" />
</template>
