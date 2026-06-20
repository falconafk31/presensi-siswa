<script setup>
import { watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: 'max-w-lg' },
})
const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="modal-content w-full rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
          :class="maxWidth"
        >
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 class="text-base font-semibold text-gray-800">{{ title }}</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="close">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="max-h-[75vh] overflow-y-auto px-5 py-4">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-leave-active .modal-content {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-content {
  transform: scale(0.95) translateY(10px);
}
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
}
</style>
