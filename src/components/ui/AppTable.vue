<script setup>
// Consistent table shell: rounded card + horizontal scroll + sticky header option.
defineProps({
  stickyHeader: { type: Boolean, default: false },
  caption: { type: String, default: '' },
})
</script>
<template>
  <div class="table-card">
    <div class="table-scroll">
      <table class="table" :class="stickyHeader ? 'table-sticky-header' : ''">
        <caption v-if="caption" class="sr-only">{{ caption }}</caption>
        <slot />
      </table>
    </div>
    <div v-if="$slots.footer" class="border-t border-slate-100">
      <slot name="footer" />
    </div>
  </div>
</template>
