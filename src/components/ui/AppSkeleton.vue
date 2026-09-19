<script setup>
defineProps({
  rows: { type: Number, default: 4 },
  type: { type: String, default: 'table' }, // table|card|stat|line
})
</script>
<template>
  <div role="status" aria-label="Memuat data" class="animate-pulse">
    <template v-if="type === 'table'">
      <div class="space-y-0 divide-y divide-slate-100">
        <div v-for="i in rows" :key="i" class="flex items-center gap-3 py-3">
          <div class="skeleton h-9 w-9 !rounded-full" />
          <div class="flex-1 space-y-2">
            <div class="skeleton h-3.5 w-2/5" />
            <div class="skeleton h-3 w-1/4" />
          </div>
          <div class="skeleton hidden h-6 w-16 sm:block" />
        </div>
      </div>
    </template>
    <template v-else-if="type === 'stat'">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="skeleton h-3 w-1/2" />
          <div class="skeleton mt-3 h-7 w-2/3" />
        </div>
      </div>
    </template>
    <template v-else-if="type === 'card'">
      <div class="space-y-3">
        <div v-for="i in rows" :key="i" class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-center gap-3">
            <div class="skeleton h-10 w-10 !rounded-full" />
            <div class="flex-1 space-y-2">
              <div class="skeleton h-3.5 w-1/2" />
              <div class="skeleton h-3 w-1/3" />
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="skeleton h-48 w-full !rounded-xl" />
    </template>
    <span class="sr-only">Memuat…</span>
  </div>
</template>
