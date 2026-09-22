<script setup>
/**
 * TutorialView — mode dokumentasi HTML di /tutorial.
 * Satu source: shared slide model. User memilih role/bagian → memilih fitur →
 * membaca tujuan, langkah, perhatian, dan melihat rekonstruksi UI (demo).
 * Dari sini juga bisa masuk presentation mode & export PDF/PPTX.
 */
import { computed, watch, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Presentation, FileDown, Printer, Target, ListOrdered, TriangleAlert,
  ChevronLeft, ChevronRight, Image as ImageIcon, Keyboard,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { AppButton, AppTabs, AppBadge, AppAlert, AppPageHeader } from '@/components/ui'
import { slides, SECTIONS, slidesBySection, findSlide } from '@/presentation/slides'
import { ScreenFrame, resolveScreen } from '@/presentation/components/screens'
import { exportPptx, openPrintExport } from '@/presentation/export'

const route = useRoute()
const router = useRouter()

const sectionTarget = {
  intro: { name: 'tutorial' },
  admin: { name: 'tutorial-admin' },
  guru: { name: 'tutorial-guru' },
  library: { name: 'tutorial-pustakawan' },
  security: { name: 'tutorial', query: { section: 'security' } },
  flow: { name: 'tutorial', query: { section: 'flow' } },
  closing: { name: 'tutorial', query: { section: 'closing' } },
}

/** Section aktif mengikuti path (?section=) ATAU section dari ?slide=. */
const section = computed(() => {
  const slideId = route.query.slide ? String(route.query.slide) : ''
  const s0 = slideId ? findSlide(slides, slideId) : null
  if (s0) return s0.section
  if (route.name === 'tutorial-admin') return 'admin'
  if (route.name === 'tutorial-guru') return 'guru'
  if (route.name === 'tutorial-pustakawan') return 'library'
  if (route.name === 'tutorial' && route.query.section) {
    const q = String(route.query.section)
    if (SECTIONS.some((x) => x.id === q)) return q
  }
  return 'intro'
})

const sectionMeta = computed(() => SECTIONS.find((s) => s.id === section.value) || SECTIONS[0])
const sectionSlides = computed(() => slidesBySection(slides, section.value))

const activeSlide = computed(() => {
  const fromQuery = route.query.slide ? findSlide(slides, String(route.query.slide)) : null
  if (fromQuery) return fromQuery
  return sectionSlides.value[0] || slides[0]
})

const activeIndexInSection = computed(() =>
  sectionSlides.value.findIndex((s) => s.id === activeSlide.value.id),
)

const screen = computed(() =>
  activeSlide.value.screen ? resolveScreen(activeSlide.value.screen) : null,
)

const tabOptions = SECTIONS.map((s) => ({ value: s.id, label: s.short }))

function selectSection(id) {
  const target = sectionTarget[id] || { name: 'tutorial' }
  router.push({ ...target, query: { ...(target.query || {}) } })
}

function selectSlide(id) {
  router.replace({ name: route.name, params: route.params, query: { ...route.query, slide: id } })
}

const prevInSection = computed(() => sectionSlides.value[activeIndexInSection.value - 1] || null)
const nextInSection = computed(() => sectionSlides.value[activeIndexInSection.value + 1] || null)

function goPrev() { if (prevInSection.value) selectSlide(prevInSection.value.id) }
function goNext() { if (nextInSection.value) selectSlide(nextInSection.value.id) }

function present(id) {
  router.push({ path: '/tutorial/presentation', query: id ? { slide: id } : {} })
}

// Export
const exportingPptx = ref(false)
async function doExportPptx() {
  if (exportingPptx.value) return
  exportingPptx.value = true
  toast.info('Menyiapkan file PPTX…')
  try {
    await exportPptx(slides)
    toast.success('PPTX diunduh —16:9, teks editable')
  } catch (e) {
    console.error(e)
    toast.error('Gagal membuat PPTX: ' + (e?.message || e))
  } finally {
    exportingPptx.value = false
  }
}
function doExportPdf() {
  openPrintExport(router)
}

// Scroll detail ke atas saat ganti fitur (mobile)
const detailEl = ref(null)
watch(
  () => activeSlide.value.id,
  async () => {
    await nextTick()
    if (window.innerWidth < 1024 && detailEl.value) {
      detailEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  },
)
</script>

<template>
  <div class="page-stack">
    <!-- Header halaman -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <AppPageHeader
        title="Tutorial Presensi Siswa"
        subtitle="User guide interaktif · rekonstruksi UI demo · mode presentasi 16:9 · ekspor PDF & PPTX"
      />
      <div class="flex flex-wrap items-center gap-2">
        <AppButton variant="secondary" size="sm" @click="doExportPdf">
          <template #icon><Printer class="h-4 w-4" aria-hidden="true" /></template>
          Export PDF
        </AppButton>
        <AppButton variant="secondary" size="sm" :loading="exportingPptx" @click="doExportPptx">
          <template #icon><FileDown class="h-4 w-4" aria-hidden="true" /></template>
          Export PPTX
        </AppButton>
        <AppButton size="sm" @click="present(activeSlide.id)">
          <template #icon><Presentation class="h-4 w-4" aria-hidden="true" /></template>
          Mulai Presentation
        </AppButton>
      </div>
    </div>

    <!-- Tabs role/bagian -->
    <AppTabs
      :model-value="section"
      :options="tabOptions"
      variant="chip"
      aria-label="Pilih bagian tutorial"
      @update:model-value="selectSection"
    />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <!-- ============ Daftar fitur ============ -->
      <aside class="lg:sticky lg:top-[72px] lg:self-start">
        <div class="card-flat overflow-hidden">
          <div class="border-b border-slate-100 px-4 py-3">
            <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Daftar fitur</p>
            <p class="mt-0.5 text-sm font-semibold text-slate-800">{{ sectionMeta.label }}</p>
            <p class="caption mt-0.5">{{ sectionSlides.length }} topik · {{ slides.length }} slide di seluruh tutorial</p>
          </div>
          <ol class="max-h-[56vh] overflow-y-auto p-2 lg:max-h-[calc(100vh-240px)]">
            <li v-for="(s, i) in sectionSlides" :key="s.id">
              <button
                type="button"
                class="group mb-0.5 flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                :class="s.id === activeSlide.id
                  ? 'bg-primary-50 text-primary-900 ring-1 ring-primary-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
                :aria-current="s.id === activeSlide.id ? 'true' : undefined"
                @click="selectSlide(s.id)"
              >
                <span
                  class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tnum"
                  :class="s.id === activeSlide.id ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-500'"
                >{{ i + 1 }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[13.5px] font-medium leading-snug">{{ s.title }}</span>
                  <span v-if="s.layout === 'feature' && s.screen" class="caption block truncate">rekonstruksi UI</span>
                </span>
              </button>
            </li>
          </ol>
        </div>

        <!-- shortcut presentasi -->
        <div class="card-flat mt-3 hidden p-3.5 lg:block">
          <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            <Keyboard class="h-3.5 w-3.5" aria-hidden="true" /> Shortcut presentasi
          </p>
          <ul class="mt-2 flex flex-col gap-1 text-[12.5px] text-slate-500">
            <li><kbd class="kbd">←</kbd> <kbd class="kbd">→</kbd> navigasi slide</li>
            <li><kbd class="kbd">Home</kbd> <kbd class="kbd">End</kbd> awal / akhir</li>
            <li><kbd class="kbd">F</kbd> fullscreen · <kbd class="kbd">Esc</kbd> keluar</li>
          </ul>
        </div>
      </aside>

      <!-- ============ Detail fitur ============ -->
      <section ref="detailEl" class="min-w-0 scroll-mt-20">
        <article class="card overflow-hidden">
          <!-- head -->
          <header class="border-b border-slate-100 pb-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">
                {{ activeSlide.kicker || sectionMeta.label }}
              </span>
              <AppBadge
                v-if="activeSlide.role !== 'all'"
                :label="activeSlide.role === 'admin' ? 'Admin' : activeSlide.role === 'guru' ? 'Guru' : 'Pustakawan'"
                tone="primary"
                dot
              />
              <span class="ml-auto caption tnum">
                {{ activeIndexInSection + 1 }} / {{ sectionSlides.length }} pada bagian ini
              </span>
            </div>
            <h2 class="mt-2 text-page-title text-slate-900">{{ activeSlide.title }}</h2>
            <p v-if="activeSlide.description" class="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
              {{ activeSlide.description }}
            </p>

            <!-- cover / divider extras -->
            <div v-if="activeSlide.layout === 'cover'" class="mt-3 flex flex-wrap gap-2">
              <span v-for="m in activeSlide.meta" :key="m" class="badge-primary">{{ m }}</span>
            </div>
            <ul v-if="activeSlide.layout === 'divider'" class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              <li v-for="(it, i) in activeSlide.sectionItems" :key="it" class="flex items-center gap-2 text-[13px] text-slate-600">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary-700 ring-1 ring-primary-200 tnum">{{ i + 1 }}</span>
                <span class="truncate">{{ it }}</span>
              </li>
            </ul>
          </header>

          <!-- goal -->
          <div
            v-if="activeSlide.goal"
            class="mt-4 flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3"
          >
            <Target class="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-primary-700">Tujuan fitur</p>
              <p class="mt-0.5 text-sm leading-relaxed text-primary-900">{{ activeSlide.goal }}</p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <!-- steps -->
            <div v-if="activeSlide.steps?.length" class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <ListOrdered class="h-4 w-4" aria-hidden="true" /> Langkah penggunaan
              </p>
              <ol class="mt-2.5 flex flex-col gap-2">
                <li
                  v-for="(st, i) in activeSlide.steps"
                  :key="i"
                  class="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700"
                >
                  <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-700 text-[11px] font-bold text-white tnum">{{ i + 1 }}</span>
                  <span>{{ st }}</span>
                </li>
              </ol>
            </div>

            <!-- bullets / cards mini -->
            <div v-else-if="activeSlide.bullets?.length" class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Poin penting</p>
              <ul class="mt-2.5 flex flex-col gap-2">
                <li v-for="(b, i) in activeSlide.bullets" :key="i" class="flex items-start gap-2.5 text-sm text-slate-700">
                  <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                  <span>{{ b }}</span>
                </li>
              </ul>
            </div>

            <div v-else-if="activeSlide.lanes?.length" class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Alur / matriks</p>
              <div class="mt-2 grid grid-cols-2 gap-3">
                <div v-for="lane in activeSlide.lanes" :key="lane.title">
                  <p class="text-[13px] font-bold text-slate-800">{{ lane.title }}</p>
                  <ul class="mt-1 flex flex-col gap-1">
                    <li v-for="it in lane.items" :key="it" class="text-[12.5px] leading-snug text-slate-600">· {{ it }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- flow -->
            <div v-else-if="activeSlide.flow?.length" class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Alur</p>
              <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                <template v-for="(f, i) in activeSlide.flow" :key="f.label">
                  <span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-700">
                    {{ f.label }}<span v-if="f.sub" class="block text-[11px] font-normal text-slate-400">{{ f.sub }}</span>
                  </span>
                  <ChevronRight v-if="i < activeSlide.flow.length - 1" class="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />
                </template>
              </div>
            </div>

            <!-- cards (grid slides) -->
            <div v-else-if="activeSlide.cards?.length" class="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-2">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Butir</p>
              <div class="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <div v-for="c in activeSlide.cards" :key="c.title" class="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <p class="text-[13px] font-bold text-slate-800">{{ c.title }}</p>
                  <p class="mt-1 text-[12.5px] leading-snug text-slate-600">{{ c.body }}</p>
                </div>
              </div>
            </div>

            <!-- watchouts -->
            <AppAlert
              v-if="activeSlide.watchouts?.length"
              tone="warning"
              title="Hal yang perlu diperhatikan"
              :class="activeSlide.cards?.length ? '' : ''"
            >
              <ul class="flex flex-col gap-1">
                <li v-for="(w, i) in activeSlide.watchouts" :key="i" class="flex items-start gap-1.5">
                  <TriangleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>{{ w }}</span>
                </li>
              </ul>
            </AppAlert>
          </div>

          <!-- rekonstruksi UI -->
          <div v-if="screen || activeSlide.screenTable" class="mt-4">
            <p class="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <ImageIcon class="h-4 w-4" aria-hidden="true" />
              Tampilan aplikasi (rekonstruksi demo)
            </p>
            <div v-if="screen" class="w-full" style="aspect-ratio: 1280 / 800">
              <ScreenFrame :width="1280" :height="800" aria-label="Rekonstruksi UI aplikasi (demo)">
                <component :is="screen.comp" v-bind="screen.props" />
              </ScreenFrame>
            </div>
            <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
              <table class="w-full text-left text-sm">
                <caption class="mb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {{ activeSlide.screenTable.caption }}
                </caption>
                <thead>
                  <tr class="border-b border-slate-200">
                    <th v-for="h in activeSlide.screenTable.headers" :key="h" class="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in activeSlide.screenTable.rows" :key="i" class="border-b border-slate-100 last:border-0">
                    <td v-for="(c, j) in r" :key="j" class="py-2 pr-4 text-slate-700" :class="j === 0 ? 'font-semibold text-slate-900' : ''">{{ c }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-if="activeSlide.screenTable.note" class="mt-2 text-xs text-slate-400">{{ activeSlide.screenTable.note }}</p>
            </div>
          </div>

          <!-- footer nav -->
          <footer class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <AppButton variant="secondary" size="sm" :disabled="!prevInSection" @click="goPrev">
              <template #icon><ChevronLeft class="h-4 w-4" aria-hidden="true" /></template>
              Sebelumnya
            </AppButton>
            <AppButton variant="secondary" size="sm" :disabled="!nextInSection" @click="goNext">
              Berikutnya
              <template #icon><ChevronRight class="h-4 w-4" aria-hidden="true" /></template>
            </AppButton>
            <div class="flex-1" />
            <AppButton size="sm" @click="present(activeSlide.id)">
              <template #icon><Presentation class="h-4 w-4" aria-hidden="true" /></template>
              Buka slide ini di Presentation
            </AppButton>
          </footer>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.kbd {
  display: inline-flex;
  min-width: 1.4rem;
  justify-content: center;
  border-radius: 0.3rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.05rem 0.3rem;
  font-size: 11px;
  font-family: inherit;
  color: #64748b;
}
</style>
