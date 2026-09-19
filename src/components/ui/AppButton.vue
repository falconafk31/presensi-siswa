<script setup>
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary|secondary|ghost|danger|danger-soft|warning|library
  size: { type: String, default: 'md' }, // sm|md|lg
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
  to: { type: [Object, String], default: null },
})

const classes = computed(() => {
  const v = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    'danger-soft': 'btn-danger-soft',
    warning: 'btn-warning',
    library: 'btn-library',
  }[props.variant] || 'btn-primary'
  const s = props.size === 'sm' ? 'btn-sm' : props.size === 'lg' ? 'btn-lg' : ''
  return [v, s, props.block ? 'w-full' : ''].join(' ')
})
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'button'"
    :to="to || undefined"
    :type="to ? undefined : type"
    :class="classes"
    :disabled="!to && (disabled || loading)"
    :aria-busy="loading ? 'true' : undefined"
  >
    <Loader2 v-if="loading" class="spin" aria-hidden="true" />
    <slot v-else name="icon" />
    <slot />
  </component>
</template>
