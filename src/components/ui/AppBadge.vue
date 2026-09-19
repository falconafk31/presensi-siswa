<script setup>
import { computed } from 'vue'
import { CheckCircle2, Clock, TriangleAlert, XCircle, Info, Circle } from 'lucide-vue-next'

// tone: success|info|warning|danger|neutral|primary|library
// Always renders icon + label (never color alone) for accessibility.
const props = defineProps({
  label: { type: String, required: true },
  tone: { type: String, default: 'neutral' },
  icon: { type: Object, default: null },
  dot: { type: Boolean, default: false },
})

const toneClass = computed(() => ({
  success: 'badge-success',
  info: 'badge-info',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
  primary: 'badge-primary',
  library: 'badge-library',
  // backward-compat color names
  emerald: 'badge-success', green: 'badge-success',
  sky: 'badge-info', blue: 'badge-library',
  amber: 'badge-warning', rose: 'badge-danger', red: 'badge-danger',
  gray: 'badge-neutral', slate: 'badge-neutral',
}[props.tone] || 'badge-neutral'))

const defaultIcon = computed(() => {
  if (props.icon) return props.icon
  return {
    success: CheckCircle2, info: Info, warning: TriangleAlert,
    danger: XCircle, neutral: Circle, primary: CheckCircle2, library: Info,
  }[props.tone] || null
})
</script>
<template>
  <span :class="toneClass">
    <span v-if="dot" class="badge-dot" aria-hidden="true" />
    <component v-else-if="defaultIcon" :is="defaultIcon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {{ label }}
  </span>
</template>
