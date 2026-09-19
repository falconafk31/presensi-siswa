<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  itemsPerPage: { type: Number, default: 20 },
})
const emit = defineEmits(['update:modelValue'])
const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.itemsPerPage)))
const start = computed(() => (props.totalItems === 0 ? 0 : (props.modelValue - 1) * props.itemsPerPage + 1))
const end = computed(() => Math.min(start.value + props.itemsPerPage - 1, props.totalItems))
</script>
<template>
  <div class="flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
    <p class="text-[13px] text-slate-500">
      Menampilkan <span class="font-semibold text-slate-800">{{ start }}</span>–<span class="font-semibold text-slate-800">{{ end }}</span>
      dari <span class="font-semibold text-slate-800">{{ totalItems }}</span> data
    </p>
    <div class="flex items-center gap-1.5">
      <button
        class="btn-secondary btn-sm !px-3"
        :disabled="modelValue <= 1"
        aria-label="Halaman sebelumnya"
        @click="emit('update:modelValue', modelValue - 1)"
      >
        <ChevronLeft class="h-4 w-4" aria-hidden="true" /> <span class="hidden sm:inline">Prev</span>
      </button>
      <span class="px-2 text-[13px] font-medium text-slate-600 tnum" aria-live="polite">Hal {{ modelValue }} / {{ totalPages }}</span>
      <button
        class="btn-secondary btn-sm !px-3"
        :disabled="modelValue >= totalPages"
        aria-label="Halaman berikutnya"
        @click="emit('update:modelValue', modelValue + 1)"
      >
        <span class="hidden sm:inline">Next</span> <ChevronRight class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
