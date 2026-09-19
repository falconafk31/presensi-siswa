<script setup>
// Legacy alias — now powered by the unified AppModal (ESC, focus trap, a11y, bottom-sheet on mobile).
import AppModal from './ui/AppModal.vue'
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: 'max-w-lg' },
})
defineEmits(['update:modelValue'])
</script>
<template>
  <AppModal :model-value="modelValue" :title="title" :max-width="maxWidth" @update:model-value="$emit('update:modelValue', $event)">
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </AppModal>
</template>
