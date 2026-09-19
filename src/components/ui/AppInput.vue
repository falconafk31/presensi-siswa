<script setup>
import { computed, useAttrs } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  id: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const inputId = computed(() => props.id || `in-${Math.random().toString(36).slice(2, 8)}`)
</script>

<template>
  <div class="w-full">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }} <span v-if="required" class="text-rose-500" aria-hidden="true">*</span>
    </label>
    <div :class="[$slots.leading ? 'input-with-icon' : '', $slots.trailing ? 'input-with-trailing' : '']">
      <slot name="leading" />
      <input
        :id="inputId"
        :value="modelValue"
        v-bind="attrs"
        class="input-field"
        :class="error ? 'input-field-error' : ''"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <slot name="trailing" />
    </div>
    <p v-if="error" :id="`${inputId}-err`" class="input-error-text" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="input-hint">{{ hint }}</p>
  </div>
</template>
