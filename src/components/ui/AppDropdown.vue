<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({
  align: { type: String, default: 'right' },
  label: { type: String, default: 'Menu' },
})
const open = ref(false)
const root = ref(null)
function toggle(e) { e.stopPropagation(); open.value = !open.value }
function close() { open.value = false }
function onDocClick(e) { if (root.value && !root.value.contains(e.target)) close() }
function onKey(e) { if (e.key === 'Escape') close() }
onMounted(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) })
defineExpose({ close })
</script>
<template>
  <div ref="root" class="relative inline-block">
    <div @click="toggle" :aria-label="label" aria-haspopup="menu" :aria-expanded="open ? 'true' : 'false'">
      <slot name="trigger" :open="open" />
    </div>
    <Transition name="app-dropdown">
      <div
        v-if="open"
        role="menu"
        class="dropdown-panel"
        :class="align === 'right' ? 'right-0' : 'left-0'"
        @click="close"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
<style scoped>
.app-dropdown-enter-active { transition: all 0.14s ease-out; }
.app-dropdown-leave-active { transition: all 0.1s ease-in; }
.app-dropdown-enter-from { opacity: 0; transform: translateY(-4px) scale(0.98); }
.app-dropdown-leave-to { opacity: 0; transform: translateY(-2px) scale(0.99); }
</style>
