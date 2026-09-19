<script setup>
import { computed } from 'vue'
import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-vue-next'
const props = defineProps({
  tone: { type: String, default: 'info' },
  title: { type: String, default: '' },
})
const cls = computed(() => ({
  success: 'alert-success', info: 'alert-info',
  warning: 'alert-warning', danger: 'alert-danger', neutral: 'alert-neutral',
}[props.tone] || 'alert-info'))
const icon = computed(() => ({
  success: CheckCircle2, info: Info, warning: TriangleAlert, danger: XCircle, neutral: Info,
}[props.tone] || Info))
</script>
<template>
  <div :class="cls" role="alert">
    <component :is="icon" class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <div class="text-[13px] leading-relaxed opacity-90"><slot /></div>
    </div>
    <div v-if="$slots.action" class="shrink-0 self-center"><slot name="action" /></div>
  </div>
</template>
