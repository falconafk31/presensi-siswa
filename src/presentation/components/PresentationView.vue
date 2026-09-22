<script setup>
/**
 * PresentationView — mode presentasi /tutorial/presentation.
 * Stage tetap1920×1080 di-scale ke viewport (letterbox/pillarbox),
 * navigasi keyboard (←→ Home End), tombol Previous/Next, counter,
 * progress, fullscreen, dan tombol export (PDF print / PPTX).
 */
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, X, FileDown,
  Presentation, Printer,
} from 'lucide-vue-next'
import { slides, findSlide } from '@/presentation/slides'
import SlideRenderer from './SlideRenderer.vue'
import { exportPptx } from '@/presentation/export/pptx'
import '@/presentation/styles/stage.css'

const route = useRoute()
const router = useRouter()

const exportMode = computed(() => route.query.export === '1')
const current = ref(0)
const stageEl = ref(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
const isFullscreen = ref(false)
const exporting = ref(false)
const showExports = ref(false)

const total = slides.length
const currentSlide = computed(() => slides[current.value])
const progress = computed(() => ((current.value + 1) / total) * 100)

// ---- stage scaling (fixed16:9) ----
function fitStage() {
  if (exportMode.value) return
  const w = window.innerWidth
  const h = window.innerHeight
  const f = Math.min(w / 1920, h / 1080)
  scale.value = f
  tx.value = (w - 1920 * f) / 2
  ty.value = (h - 1080 * f) / 2
}
const stageStyle = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
}))

// ---- navigation ----
function go(i) {
  const next = Math.max(0, Math.min(i, total - 1))
  if (next === current.value) return
  current.value = next
  const id = slides[next].id
  router.replace({ query: { ...route.query, slide: id } })
}
const next = () => go(current.value + 1)
const prev = () => go(current.value - 1)
const goStart = () => go(0)
const goEnd = () => go(total - 1)

function onKeydown(e) {
  if (exportMode.value) return
  const k = e.key
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') {
    e.preventDefault()
    next()
  } else if (k === 'ArrowLeft' || k === 'PageUp') {
    e.preventDefault()
    prev()
  } else if (k === 'Home') {
    e.preventDefault()
    goStart()
  } else if (k === 'End') {
    e.preventDefault()
    goEnd()
  } else if (k === 'f' || k === 'F') {
    e.preventDefault()
    toggleFullscreen()
  } else if (k === 'Escape' && showExports.value) {
    showExports.value = false
  }
}

// ---- touch swipe ----
let touchX = null
function onTouchStart(e) { touchX = e.changedTouches[0]?.clientX ?? null }
function onTouchEnd(e) {
  if (touchX == null || exportMode.value) return
  const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX
  touchX = null
  if (Math.abs(dx) > 60) (dx < 0 ? next : prev)()
}

// ---- fullscreen ----
async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    else await document.exitFullscreen()
  } catch { /* ditolak browser — abaikan */ }
}
function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// ---- exports ----
async function doExportPptx() {
  if (exporting.value) return
  exporting.value = true
  try {
    await exportPptx(slides)
  } finally {
    exporting.value = false
    showExports.value = false
  }
}
function doPrint() {
  showExports.value = false
  window.print()
}

// ---- init / query sync ----
function initFromQuery() {
  const id = route.query.slide
  const found = id ? findSlide(slides, String(id)) : null
  current.value = found ? slides.indexOf(found) : 0
}
watch(() => route.query.slide, initFromQuery)

onMounted(async () => {
  initFromQuery()
  if (exportMode.value) {
    // Staging siap cetak: biarkan page scroll normal (tanpa lock overflow).
    if (route.query.autoprint === '1') {
      await nextTick()
      setTimeout(() => window.print(), 400)
    }
    return
  }
  document.documentElement.classList.add('deck-html')
  fitStage()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', fitStage)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  await nextTick()
})
onUnmounted(() => {
  document.documentElement.classList.remove('deck-html')
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', fitStage)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
})
</script>

<template>
  <!-- MODE EXPORT / PRINT: semua slide berurutan, siap cetak -->
  <div v-if="exportMode" class="export-staging min-h-screen bg-slate-900">
    <div class="export-toolbar sticky top-0 z-50 flex items-center gap-3 bg-slate-800 px-4 py-2.5 text-white shadow-lg print:hidden">
      <Presentation class="h-4 w-4 text-emerald-400" aria-hidden="true" />
      <p class="text-sm font-medium">Mode ekspor PDF — {{ total }} slide,1 halaman =1 slide (16:9).</p>
      <div class="flex-1" />
      <button class="btn-secondary !border-slate-600 !bg-slate-700 !text-white hover:!bg-slate-600" @click="doPrint">
        <Printer class="h-4 w-4" aria-hidden="true" />
        Cetak / Simpan PDF
      </button>
      <RouterLink to="/tutorial" class="btn-ghost !text-slate-300 hover:!bg-slate-700">
        <X class="h-4 w-4" aria-hidden="true" />
        Tutup
      </RouterLink>
    </div>
    <div class="mx-auto w-[1920px] origin-top">
      <SlideRenderer
        v-for="(s, i) in slides"
        :key="s.id"
        :slide="s"
        :index="i"
        :total="total"
        active
      />
    </div>
  </div>

  <!-- MODE PRESENTASI16:9 -->
  <div v-else class="deck-viewport" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <!-- progress bar atas -->
    <div class="deck-progress fixed inset-x-0 top-0 z-30 h-[3px] bg-slate-700/60" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" aria-label="Progres slide">
      <div class="h-full bg-primary-500 transition-[width] duration-300" :style="{ width: `${progress}%` }" />
    </div>

    <main id="deckStage" ref="stageEl" class="deck-stage" :style="stageStyle">
      <SlideRenderer
        v-for="(s, i) in slides"
        :key="s.id"
        :slide="s"
        :index="i"
        :total="total"
        :active="i === current"
      />
    </main>

    <!-- controls -->
    <div class="deck-controls fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/90 p-2 shadow-modal backdrop-blur-sm print:hidden">
      <button class="deck-btn" aria-label="Slide sebelumnya" title="Sebelumnya (←)" @click="prev">
        <ChevronLeft class="h-5 w-5" aria-hidden="true" />
      </button>
      <span class="min-w-[86px] text-center text-sm font-semibold text-slate-200 tnum" aria-live="polite">
        {{ current + 1 }} / {{ total }}
      </span>
      <button class="deck-btn" aria-label="Slide berikutnya" title="Berikutnya (→)" @click="next">
        <ChevronRight class="h-5 w-5" aria-hidden="true" />
      </button>

      <span class="mx-1 h-6 w-px bg-slate-600" aria-hidden="true" />

      <button class="deck-btn" :aria-label="isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'" :title="isFullscreen ? 'Keluar fullscreen (Esc)' : 'Fullscreen (F)'" @click="toggleFullscreen">
        <Minimize v-if="isFullscreen" class="h-5 w-5" aria-hidden="true" />
        <Maximize v-else class="h-5 w-5" aria-hidden="true" />
      </button>

      <!-- export menu -->
      <div class="relative">
        <button class="deck-btn" aria-label="Menu ekspor" title="Ekspor PDF / PPTX" @click="showExports = !showExports">
          <FileDown class="h-5 w-5" aria-hidden="true" />
        </button>
        <div
          v-if="showExports"
          class="absolute bottom-12 right-0 w-56 overflow-hidden rounded-xl border border-slate-600 bg-slate-900 p-1.5 shadow-modal"
        >
          <button class="dropdown-item !text-slate-200 hover:!bg-slate-800" @click="doPrint">
            <Printer class="h-4 w-4" aria-hidden="true" /> Export PDF (cetak)
          </button>
          <button class="dropdown-item !text-slate-200 hover:!bg-slate-800" :disabled="exporting" @click="doExportPptx">
            <FileDown class="h-4 w-4" aria-hidden="true" />
            {{ exporting ? 'Membuat PPTX…' : 'Export PPTX (edit able)' }}
          </button>
          <RouterLink to="/tutorial/presentation?export=1" class="dropdown-item !text-slate-200 hover:!bg-slate-800" @click="showExports = false">
            <Presentation class="h-4 w-4" aria-hidden="true" /> Mode siap cetak
          </RouterLink>
        </div>
      </div>

      <span class="mx-1 h-6 w-px bg-slate-600" aria-hidden="true" />

      <RouterLink to="/tutorial" class="deck-btn" aria-label="Kembali ke tutorial" title="Kembali ke /tutorial">
        <X class="h-5 w-5" aria-hidden="true" />
      </RouterLink>
    </div>

    <!-- hint -->
    <div class="pointer-events-none fixed bottom-6 right-6 z-30 hidden text-xs text-slate-500 lg:block print:hidden">
      ← → navigasi · Home/End · F fullscreen
    </div>
  </div>
</template>

<style scoped>
.deck-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  width: 40px;
  border-radius: 9999px;
  color: #e2e8f0;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.deck-btn:hover {
  background-color: rgb(15 23 42 / 0.8);
  color: #fff;
}
.deck-btn:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 2px;
}
.export-toolbar .btn-secondary,
.export-toolbar .btn-ghost {
  min-height: 2.25rem;
}
</style>
