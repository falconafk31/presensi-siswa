<script setup>
const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  padded: { type: Boolean, default: true },
  interactive: { type: Boolean, default: false },
  tone: { type: String, default: 'neutral' }, // neutral|success|info|warning|danger
})

const toneClass = {
  neutral: '',
  success: '!border-emerald-200 !bg-emerald-50/40',
  info: '!border-sky-200 !bg-sky-50/40',
  warning: '!border-amber-200 !bg-amber-50/40',
  danger: '!border-rose-200 !bg-rose-50/40',
}[props.tone] || ''
</script>
<template>
  <section class="card-flat" :class="[padded ? 'card-pad' : '', interactive ? 'card-interactive cursor-pointer' : '', toneClass]">
    <div v-if="title || $slots.header" class="mb-2.5 flex items-start justify-between gap-3">
      <div v-if="title">
        <h3 class="card-title">{{ title }}</h3>
        <p v-if="subtitle" class="secondary mt-0.5">{{ subtitle }}</p>
      </div>
      <slot name="header" />
      <div v-if="$slots.actions" class="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
    <div v-if="$slots.footer" class="mt-3 border-t border-slate-100 pt-2.5">
      <slot name="footer" />
    </div>
  </section>
</template>
