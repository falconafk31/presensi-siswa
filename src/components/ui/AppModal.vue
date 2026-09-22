<script setup>
import { watch, onBeforeUnmount, ref, nextTick } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  maxWidth: { type: String, default: 'max-w-lg' },
  dismissable: { type: Boolean, default: true },
  noPadding: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'close'])
const panelRef = ref(null)
let lastFocused = null

function close() {
  if (!props.dismissable) return
  emit('update:modelValue', false)
  emit('close')
}
function onKeydown(e) {
  if (e.key === 'Escape') close()
  // Simple focus trap
  if (e.key === 'Tab' && panelRef.value) {
    const f = panelRef.value.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const focusable = Array.from(f).filter((el) => !el.disabled && el.offsetParent !== null)
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

watch(() => props.modelValue, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    lastFocused = document.activeElement
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    panelRef.value?.querySelector('button, input, select, textarea')?.focus?.()
  } else {
    document.removeEventListener('keydown', onKeydown)
    lastFocused?.focus?.()
  }
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click.self="close"
      >
        <div
          ref="panelRef"
          class="modal-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-modal sm:rounded-xl"
          :class="maxWidth"
        >
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div class="min-w-0">
              <h3 class="text-[15px] font-semibold text-slate-900">{{ title }}</h3>
              <p v-if="subtitle" class="secondary mt-0.5">{{ subtitle }}</p>
            </div>
            <button
              v-if="dismissable"
              class="btn-icon -mr-2 -mt-1 shrink-0"
              aria-label="Tutup dialog"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="overflow-y-auto px-5 py-4" :class="noPadding ? '!px-0 !py-0' : ''">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:justify-end">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-modal-enter-active { transition: opacity 0.18s ease-out; }
.app-modal-enter-active .modal-panel { transition: transform 0.18s ease-out, opacity 0.18s ease-out; }
.app-modal-leave-active { transition: opacity 0.14s ease-in; }
.app-modal-leave-active .modal-panel { transition: transform 0.14s ease-in, opacity 0.14s ease-in; }
.app-modal-enter-from, .app-modal-leave-to { opacity: 0; }
.app-modal-enter-from .modal-panel, .app-modal-leave-to .modal-panel {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}
@media (min-width: 640px) {
  .app-modal-enter-from .modal-panel, .app-modal-leave-to .modal-panel {
    transform: translateY(8px) scale(0.97);
  }
}
</style>
