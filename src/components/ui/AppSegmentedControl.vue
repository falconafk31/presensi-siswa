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

// ACTIVE = SOLID warna status masing-masing (bukan tint, bukan satu warna global), teks putih.
// Warna EXACT header tabel Rekap = token ATTENDANCE_COLORS (designSystem.js):
//   Hadir -> #047857 (emerald-700) · Izin -> #0369a1 (sky-700)
//   Sakit -> #d97706 (amber-600)  · Alfa -> #be123c (rose-700)
// Warna dipilih PER OPTION via o.tone (success/info/warning/danger) dari ATTENDANCE_STATUS.
// Prefix `!` (important) menjamin warna solid selalu menang atas rule komponen
// `.segmented button[aria-pressed='true']` (bg-white) di semua browser.
// Fallback NEUTRAL (bukan hijau): option tanpa tone tidak akan pernah tampil hijau.
const activeTone = {
  success: '!bg-emerald-700 !text-white !ring-1 !ring-inset !ring-emerald-700',
  info: '!bg-sky-700 !text-white !ring-1 !ring-inset !ring-sky-700',
  warning: '!bg-amber-600 !text-white !ring-1 !ring-inset !ring-amber-600',
  danger: '!bg-rose-700 !text-white !ring-1 !ring-inset !ring-rose-700',
  primary: '!bg-primary-700 !text-white !ring-1 !ring-inset !ring-primary-700',
  neutral: '!bg-slate-700 !text-white !ring-1 !ring-inset !ring-slate-700',
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
        modelValue === o.value ? (activeTone[o.tone || 'neutral']) : '',
        size === 'sm' ? '!px-2.5 !py-1.5 !text-xs' : '!px-3 !py-2 !text-[13px] font-semibold',
      ]"
      @click="emit('update:modelValue', o.value)"
    >
      <span class="hidden md:inline">{{ o.label }}</span>
      <span class="md:hidden">{{ o.short || o.label }}</span>
    </button>
  </div>
</template>
