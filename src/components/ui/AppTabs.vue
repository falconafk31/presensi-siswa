<script setup>
// Unified tabs: variant "underline" for sections, "chip" for filters.
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true }, // [{value,label,icon?}]
  variant: { type: String, default: 'chip' },
  ariaLabel: { type: String, default: 'Tabs' },
})
const emit = defineEmits(['update:modelValue'])
</script>
<template>
  <div v-if="variant === 'underline'" class="tabs" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="o in options"
      :key="o.value"
      role="tab"
      class="tab-btn"
      :aria-selected="modelValue === o.value ? 'true' : 'false'"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
  <div v-else class="chip-tabs" role="group" :aria-label="ariaLabel">
    <button
      v-for="o in options"
      :key="o.value"
      class="chip-tab inline-flex items-center gap-1.5"
      :aria-pressed="modelValue === o.value ? 'true' : 'false'"
      @click="emit('update:modelValue', o.value)"
    >
      <component v-if="o.icon" :is="o.icon" class="h-4 w-4" aria-hidden="true" />
      {{ o.label }}
    </button>
  </div>
</template>
