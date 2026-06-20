<script setup>
defineProps({
  rows: { type: Number, default: 3 },
  type: { type: String, default: 'table' } // 'table', 'card', 'list'
})
</script>

<template>
  <div class="animate-pulse space-y-4 py-2">
    <!-- Table Skeleton -->
    <template v-if="type === 'table'">
      <div v-for="i in rows" :key="i" class="flex items-center space-x-4 border-b border-gray-100 pb-4">
        <div class="h-10 w-10 shrink-0 rounded-full bg-gray-200"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 w-3/4 rounded bg-gray-200"></div>
          <div class="h-3 w-1/2 rounded bg-gray-200"></div>
        </div>
        <div class="h-8 w-20 shrink-0 rounded bg-gray-200"></div>
      </div>
    </template>

    <!-- Card Skeleton -->
    <template v-else-if="type === 'card'">
      <div v-for="i in rows" :key="i" class="rounded-xl border border-gray-100 p-4">
        <div class="flex items-center space-x-4">
          <div class="h-12 w-12 rounded-full bg-gray-200"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-1/2 rounded bg-gray-200"></div>
            <div class="h-3 w-1/3 rounded bg-gray-200"></div>
          </div>
        </div>
        <div class="mt-4 space-y-2">
          <div class="h-3 w-full rounded bg-gray-200"></div>
          <div class="h-3 w-5/6 rounded bg-gray-200"></div>
        </div>
      </div>
    </template>
  </div>
</template>
