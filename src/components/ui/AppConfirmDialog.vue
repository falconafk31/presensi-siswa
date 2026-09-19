<script setup>
import { TriangleAlert, Trash2, Info } from 'lucide-vue-next'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Konfirmasi' },
  message: { type: String, default: 'Apakah Anda yakin?' },
  confirmLabel: { type: String, default: 'Ya, Lanjutkan' },
  cancelLabel: { type: String, default: 'Batal' },
  tone: { type: String, default: 'danger' }, // danger|warning|info
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const toneIcon = { danger: Trash2, warning: TriangleAlert, info: Info }
const toneWrap = {
  danger: 'bg-rose-100 text-rose-600',
  warning: 'bg-amber-100 text-amber-600',
  info: 'bg-sky-100 text-sky-600',
}
</script>
<template>
  <AppModal
    :model-value="modelValue"
    :title="title"
    max-width="max-w-md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" :class="toneWrap[tone]">
        <component :is="toneIcon[tone]" class="h-5 w-5" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <p class="text-sm leading-relaxed text-slate-600"><slot>{{ message }}</slot></p>
      </div>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="emit('update:modelValue', false); emit('cancel')">{{ cancelLabel }}</AppButton>
      <AppButton :variant="tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'primary'" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
