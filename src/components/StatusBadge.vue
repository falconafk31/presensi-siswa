<script setup>
defineProps({
  label: { type: String, required: true },
  color: { type: String, default: 'gray' },
})

const map = {
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  gray: 'bg-gray-100 text-gray-600',
  green: 'bg-emerald-100 text-emerald-700',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="map[color] || map.gray"
  >
    {{ label }}
  </span>
</template>
