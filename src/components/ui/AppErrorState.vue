<script setup>
import { CloudOff } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
defineProps({
  title: { type: String, default: 'Data gagal dimuat' },
  description: { type: String, default: 'Periksa koneksi internet Anda atau coba lagi.' },
  retryLabel: { type: String, default: 'Coba Lagi' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['retry'])
</script>
<template>
  <div class="state-box">
    <div class="state-icon !text-rose-400">
      <CloudOff class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="text-[15px] font-semibold text-slate-900">{{ title }}</h3>
    <p class="mt-1 max-w-sm text-sm text-slate-500">{{ description }}</p>
    <div class="mt-5">
      <AppButton variant="secondary" :loading="loading" @click="emit('retry')">{{ retryLabel }}</AppButton>
    </div>
  </div>
</template>
