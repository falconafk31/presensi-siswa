<script setup>
import { computed } from 'vue'
const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  id: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const inputId = computed(() => props.id || `ta-${Math.random().toString(36).slice(2, 8)}`)
</script>
<template>
  <div class="w-full">
    <label v-if="label" :for="inputId" class="input-label">{{ label }}</label>
    <textarea
      :id="inputId"
      :value="modelValue"
      class="input-field"
      :class="error ? 'input-field-error' : ''"
      v-bind="$attrs"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="input-error-text" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="input-hint">{{ hint }}</p>
  </div>
</template>
