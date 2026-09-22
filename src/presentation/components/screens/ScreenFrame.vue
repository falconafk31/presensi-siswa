<script setup>
// Bingkai scaling untuk rekonstruksi UI (mock screenshot presentation).
// Layar selalu author pada ukuran tetap (1280×800) lalu di-scale CONTAIN
// ke slot — tanpa reflow, tanpa distorsi, tanpa memotong.
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'

const props = defineProps({
  width: { type: Number, default: 1280 },
  height: { type: Number, default: 800 },
  // scale eksplisit; null → contain-fit ke container (ResizeObserver)
  scale: { type: Number, default: null },
  ariaLabel: { type: String, default: 'Rekonstruksi UI aplikasi (demo)' },
})

const rootEl = ref(null)
const fit = ref(props.scale ?? 1)
let ro = null

const frameStyle = computed(() => ({
  width: `${props.width * fit.value}px`,
  height: `${props.height * fit.value}px`,
}))
const innerStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
  transform: `scale(${fit.value})`,
}))

function measure() {
  if (props.scale != null) {
    fit.value = props.scale
    return
  }
  const el = rootEl.value
  if (!el) return
  const cw = el.clientWidth
  const ch = el.clientHeight
  if (!cw || !ch) return
  fit.value = Math.min(cw / props.width, ch / props.height)
}

onMounted(async () => {
  await nextTick()
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => measure())
    if (rootEl.value) ro.observe(rootEl.value)
  } else {
    window.addEventListener('resize', measure)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', measure)
})
watch(() => props.scale, measure)
</script>

<template>
  <div ref="rootEl" class="screen-frame-root" :aria-label="ariaLabel" role="img">
    <div class="screen-frame" :style="frameStyle">
      <div class="screen-frame__inner" :style="innerStyle">
        <slot />
      </div>
      <span class="screen-frame__demo" aria-hidden="true">DEMO</span>
    </div>
  </div>
</template>

<style scoped>
.screen-frame-root {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.screen-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.05);
}
.screen-frame__inner {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}
.screen-frame__demo {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 40;
  padding: 3px 9px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  box-shadow: 0 0 0 1px #fcd34d;
}
</style>
