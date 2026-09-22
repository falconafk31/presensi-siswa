<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  id: { type: String, default: '' },
  required: { type: Boolean, default: false },
  options: { type: Array, default: null }, // [{value,label}] optional shorthand
})
const emit = defineEmits(['update:modelValue'])
const inputId = computed(() => props.id || `sel-${Math.random().toString(36).slice(2, 8)}`)
</script>

<template>
  <div class="w-full">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }} <span v-if="required" class="text-rose-500" aria-hidden="true">*</span>
    </label>
    <select
      :id="inputId"
      :value="modelValue"
      class="input-field"
      :class="error ? 'input-field-error' : ''"
      :aria-invalid="error ? 'true' : undefined"
      v-bind="$attrs"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <template v-if="options">
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </template>
      <slot v-else />
    </select>
    <p v-if="error" class="input-error-text" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="input-hint">{{ hint }}</p>
  </div>
</template>
