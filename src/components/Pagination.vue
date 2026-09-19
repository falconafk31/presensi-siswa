<script setup>
// Legacy alias — unified pagination.
import AppPagination from './ui/AppPagination.vue'
defineProps({
  totalItems: { type: Number, required: true },
  itemsPerPage: { type: Number, default: 20 },
  modelValue: { type: Number, required: true },
})
defineEmits(['update:modelValue'])
</script>
<template>
  <AppPagination :model-value="modelValue" :total-items="totalItems" :items-per-page="itemsPerPage" @update:model-value="$emit('update:modelValue', $event)" />
</template>
