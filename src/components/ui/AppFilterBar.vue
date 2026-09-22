<script setup>
// Consistent filter container: search + selects + actions.
// Responsive: stacks on mobile, single row on desktop.
defineProps({ columns: { type: String, default: 'sm:grid-cols-2 lg:grid-cols-4' } })
</script>
<template>
  <div class="card-flat p-3 sm:p-4">
    <div class="grid grid-cols-1 gap-2.5" :class="columns">
      <slot />
    </div>
    <div v-if="$slots.footer" class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <slot name="footer" />
    </div>
  </div>
</template>
