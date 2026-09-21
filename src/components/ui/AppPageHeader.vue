<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  backTo: { type: Object, default: null },
  // inline: subtitle tampil menyatu di samping judul (hemat tinggi, untuk dashboard)
  inline: { type: Boolean, default: false },
})
</script>
<template>
  <div class="mb-1 flex flex-wrap items-start justify-between gap-3 sm:mb-0">
    <div class="min-w-0">
      <div class="flex flex-wrap items-baseline gap-x-2">
        <div class="flex items-center gap-2">
          <RouterLink v-if="backTo" :to="backTo" class="btn-icon -ml-2 !h-8 !w-8" aria-label="Kembali">
            <slot name="back-icon">←</slot>
          </RouterLink>
          <h1 class="page-title">{{ title }}</h1>
        </div>
        <p v-if="subtitle" :class="inline ? 'hidden truncate text-[13px] text-slate-400 lg:block' : 'mt-1 w-full text-sm text-slate-500'">
          {{ subtitle }}
        </p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
