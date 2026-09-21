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

// ACTIVE = solid warna status per OPTION (bukan satu warna global), teks putih.
// Warna EXACT = header tabel Rekap / token ATTENDANCE_COLORS (designSystem.js):
//   Hadir  -> emerald-700 #047857 · Izin -> sky-700 #0369a1
//   Sakit  -> amber-600  #d97706 · Alfa -> rose-700 #be123c
// Warna dipilih per option via o.tone (success/info/warning/danger) dari ATTENDANCE_STATUS.
const activeTone = {
  success: 'bg-emerald-700 text-white ring-1 ring-inset ring-emerald-700',
  info: 'bg-sky-700 text-white ring-1 ring-inset ring-sky-700',
  warning: 'bg-amber-600 text-white ring-1 ring-inset ring-amber-600',
  danger: 'bg-rose-700 text-white ring-1 ring-inset ring-rose-700',
  primary: 'bg-primary-700 text-white ring-1 ring-inset ring-primary-700',
  neutral: 'bg-slate-700 text-white ring-1 ring-inset ring-slate-700',
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
