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

// Warna aktif = semantic token kehadiran (sama dengan tabel Rekap):
// Hadir #047857 (emerald-700) · Izin #0369a1 (sky-700) · Sakit #d97706 (amber-600) · Alfa #be123c (rose-700)
const activeTone = {
  success: 'bg-emerald-700 text-white shadow-xs',
  info: 'bg-sky-700 text-white shadow-xs',
  warning: 'bg-amber-600 text-white shadow-xs',
  danger: 'bg-rose-700 text-white shadow-xs',
  primary: 'bg-primary-700 text-white shadow-xs',
  neutral: 'bg-slate-800 text-white shadow-xs',
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
