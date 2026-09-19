<script setup>
// Legacy alias — unified badge with icon + label (never color alone).
import AppBadge from './ui/AppBadge.vue'
defineProps({
  label: { type: String, required: true },
  color: { type: String, default: 'gray' },
})
</script>
<template>
  <AppBadge :label="label" :tone="color" dot />
</template>
