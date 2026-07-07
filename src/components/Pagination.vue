<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  totalItems: {
    type: Number,
    required: true
  },
  itemsPerPage: {
    type: Number,
    default: 20
  },
  modelValue: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage) || 1)
const currentPage = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const startIndex = computed(() => {
  if (props.totalItems === 0) return 0
  return (currentPage.value - 1) * props.itemsPerPage + 1
})

const endIndex = computed(() => {
  return Math.min(startIndex.value + props.itemsPerPage - 1, props.totalItems)
})

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white border-t border-gray-100 rounded-b-2xl">
    <div class="text-sm text-gray-500">
      Menampilkan <span class="font-medium text-gray-900">{{ startIndex }}</span> - 
      <span class="font-medium text-gray-900">{{ endIndex }}</span> dari 
      <span class="font-medium text-gray-900">{{ totalItems }}</span> data
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'"
        :disabled="currentPage === 1"
        @click="prevPage"
      >
        <ChevronLeft class="w-4 h-4" />
        Prev
      </button>

      <div class="text-sm font-medium text-gray-700 px-2">
        Hal {{ currentPage }} / {{ totalPages }}
      </div>

      <button
        class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'"
        :disabled="currentPage === totalPages"
        @click="nextPage"
      >
        Next
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
