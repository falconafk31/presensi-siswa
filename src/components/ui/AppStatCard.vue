<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: Object, default: null },
  tone: { type: String, default: 'neutral' }, // success|info|warning|danger|neutral|primary|library
  sub: { type: String, default: '' },
  to: { type: Object, default: null },
})

const toneIcon = computed(() => ({
  success: 'bg-emerald-100 text-emerald-700',
  info: 'bg-sky-100 text-sky-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-600',
  neutral: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-700 text-white',
  library: 'bg-blue-100 text-blue-700',
}[props.tone] || 'bg-slate-100 text-slate-600'))
</script>
<template>
  <component :is="to ? 'RouterLink' : 'div'" :to="to" class="card-flat flex items-center gap-3.5 p-4" :class="to ? 'card-interactive' : ''">
    <div v-if="icon" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" :class="toneIcon">
      <component :is="icon" class="h-5 w-5" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[13px] text-slate-500">{{ label }}</p>
      <p class="stat-number truncate !text-xl">{{ value }}</p>
      <p v-if="sub" class="mt-0.5 truncate text-xs text-slate-400">{{ sub }}</p>
    </div>
    <slot />
  </component>
</template>
