<script setup>
// Segmented control for attendance status & small option sets.
// Large touch targets; selected option uses semantic fill.
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true }, // [{value,label,short?,tone?}]
  ariaLabel: { type: String, default: 'Pilihan' },
  size: { type: String, default: 'md' }, // sm|md
})
const emit = defineEmits(['update:modelValue'])

// Selected = tint lembut + border EXACT semantic token kehadiran (sama dengan tabel Rekap):
// Hadir border #047857 · Izin #0369a1 · Sakit #d97706 · Alfa #be123c
// Teks memakai shade yang sama (amber memakai amber-700 agar kontras teks tetap ≥4.5:1 di atas amber-50).
// Pola konsisten dengan badge design system (bg-50 + ring + text).
const activeTone = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-700',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600',
  danger: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-700',
  primary: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-700',
  neutral: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500',
}
</script>
<template>
  <div class="segmented w-full sm:w-auto" role="group" :aria-label="ariaLabel">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="modelValue === o.value ? 'true' : 'false'"
      :title="o.label"
      class="flex-1 sm:flex-none"
      :class="[
        modelValue === o.value ? (activeTone[o.tone || 'primary']) : '',
        size === 'sm' ? '!px-2.5 !py-1.5 !text-xs' : '!px-3 !py-2 !text-[13px] font-semibold',
      ]"
      @click="emit('update:modelValue', o.value)"
    >
      <span class="hidden md:inline">{{ o.label }}</span>
      <span class="md:hidden">{{ o.short || o.label }}</span>
    </button>
  </div>
</template>
