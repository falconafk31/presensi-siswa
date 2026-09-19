<script setup>
// Legacy alias — unified page header (consistent title scale + responsive actions).
import AppPageHeader from './ui/AppPageHeader.vue'
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>
<template>
  <AppPageHeader :title="title" :subtitle="subtitle">
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
  </AppPageHeader>
</template>
