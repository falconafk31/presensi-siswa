<script setup>
/**
 * SlideRenderer — merender SATU slide dari shared slide model.
 * Author pada stage tetap1920×1080 (padding96×72), tanpa reflow per device.
 * Dipakai presentation mode, print/PDF, dan docs (preview).
 */
import { computed } from 'vue'
import {
  ClipboardCheck, FileSpreadsheet, BarChart3, Users, CalendarDays, Book,
  ShieldCheck, GraduationCap, Library, RefreshCw, LogOut, Lock, Keyboard,
  LogIn, HelpCircle, CheckCircle2, Settings, PieChart, TriangleAlert,
  FileDown, Save, Search, QrCode, Printer, ScrollText, ArrowUpCircle,
} from 'lucide-vue-next'
import { ScreenFrame, resolveScreen } from './screens'
import { ATTENDANCE_STATUS } from '@/config/designSystem'
import { school, DEMO_TODAY_LABEL } from '@/presentation/mock'

const props = defineProps({
  slide: { type: Object, required: true },
  index: { type: Number, default: 0 },
  total: { type: Number, default: 1 },
  active: { type: Boolean, default: false },
})

const ICONS = {
  clipboard: ClipboardCheck, sheet: FileSpreadsheet, chart: BarChart3,
  users: Users, calendar: CalendarDays, book: Book, shield: ShieldCheck,
  graduation: GraduationCap, library: Library, refresh: RefreshCw,
  logout: LogOut, lock: Lock, keyboard: Keyboard, login: LogIn,
  help: HelpCircle, check: CheckCircle2, settings: Settings,
  pie: PieChart, alert: TriangleAlert, file: FileDown, save: Save,
  search: Search, qr: QrCode, printer: Printer, log: ScrollText,
  upgrade: ArrowUpCircle,
}
const iconOf = (k) => ICONS[k] || HelpCircle

const screen = computed(() => (props.slide.screen ? resolveScreen(props.slide.screen) : null))
const hasAside = computed(() => !!screen.value || (props.slide.layout === 'feature' && !!props.slide.screenTable && !screen.value))
const pct = computed(() => Math.round(((props.index + 1) / props.total) * 100))

const attendance = ATTENDANCE_STATUS
const schoolName = school.nama_sekolah
const todayLabel = DEMO_TODAY_LABEL
</script>

<template>
  <section
    class="slide"
    :id="`slide-${slide.id}`"
    :class="[`slide--${slide.layout}`, { active }]"
    :aria-label="`${index + 1}. ${slide.title}`"
    :aria-hidden="active ? undefined : 'true'"
  >
    <!-- ============ COVER ============ -->
    <div v-if="slide.layout === 'cover'" class="flex h-full">
      <div class="flex min-w-0 flex-1 flex-col justify-between px-[96px] py-[72px]">
        <div class="reveal flex items-center gap-4" style="--i:0">
          <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700 text-xl font-bold text-white">MC</span>
          <div>
            <p class="text-[22px] font-semibold text-slate-900">{{ schoolName }}</p>
            <p class="text-[18px] text-slate-500">Sistem Presensi &amp; Perpustakaan</p>
          </div>
        </div>
        <div>
          <p class="reveal text-[20px] font-semibold uppercase tracking-[0.3em] text-primary-700" style="--i:1">
            Dokumentasi &amp; Panduan Interaktif
          </p>
          <h1 class="reveal mt-5 text-[96px] font-bold leading-[1.04] tracking-tight text-slate-900" style="--i:2">
            {{ slide.title }}
          </h1>
          <div class="reveal mt-7 flex items-center gap-4" style="--i:3">
            <span class="h-1.5 w-24 rounded-full bg-primary-700" aria-hidden="true" />
            <span class="h-1.5 w-10 rounded-full bg-gold-bright" aria-hidden="true" style="background:#fbbf24" />
          </div>
          <p class="reveal mt-7 max-w-[900px] text-[30px] leading-relaxed text-slate-600" style="--i:4">
            {{ slide.subtitle }}
          </p>
          <div class="reveal mt-10 flex flex-wrap gap-3" style="--i:5">
            <span v-for="m in slide.meta" :key="m" class="badge-primary !px-5 !py-2 !text-[18px]">{{ m }}</span>
          </div>
        </div>
        <p class="reveal text-[17px] text-slate-400" style="--i:6">
          {{ todayLabel }} · Data pada tutorial ini seluruhnya fiktif (demo) ·
          <span class="font-medium text-slate-500">/tutorial</span>
        </p>
      </div>
      <!-- panel kanan emerald -->
      <div class="relative m-[48px] w-[560px] shrink-0 overflow-hidden rounded-[28px] bg-primary-900 px-14 py-16 text-white">
        <div class="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-700/40" aria-hidden="true" />
        <div class="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-primary-800/60" aria-hidden="true" />
        <div class="relative flex h-full flex-col justify-center gap-10">
          <div v-for="(s, i) in slide.coverStats" :key="s.label" class="reveal" :style="{ '--i': 5 + i }">
            <p class="text-[19px] text-emerald-200/80">{{ s.label }}</p>
            <p class="mt-1 text-[64px] font-bold leading-none tnum">{{ s.value }}</p>
            <p class="mt-2 text-[19px] text-emerald-100/70">{{ s.sub }}</p>
            <div v-if="i < slide.coverStats.length - 1" class="mt-8 h-px bg-white/15" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>

    <!-- ============ DIVIDER ============ -->
    <div v-else-if="slide.layout === 'divider'" class="relative flex h-full flex-col justify-center px-[96px] py-[72px]">
      <div class="flex items-start gap-14">
        <div class="reveal shrink-0" style="--i:0">
          <span class="block text-[200px] font-bold leading-none text-primary-700/15 tnum">{{ String(slide.sectionNo).padStart(2, '0') }}</span>
        </div>
        <div class="min-w-0 flex-1 pt-8">
          <p class="reveal text-[20px] font-semibold uppercase tracking-[0.28em] text-gold" style="--i:1;color:#b45309">Bagian {{ slide.sectionNo }}</p>
          <h2 class="reveal mt-4 text-[76px] font-bold leading-tight tracking-tight text-slate-900" style="--i:2">{{ slide.title }}</h2>
          <p class="reveal mt-5 max-w-[1000px] text-[27px] leading-relaxed text-slate-600" style="--i:3">{{ slide.description }}</p>
          <ul class="mt-10 grid max-w-[1100px] grid-cols-2 gap-x-10 gap-y-3">
            <li
              v-for="(item, i) in slide.sectionItems"
              :key="item"
              class="reveal flex items-center gap-3 text-[24px] text-slate-700"
              :style="{ '--i': 4 + Math.min(i, 8) }"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[15px] font-bold text-primary-700 ring-1 ring-primary-200 tnum">{{ i + 1 }}</span>
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
      <div class="absolute bottom-[72px] right-[96px] flex items-center gap-3 text-[16px] text-slate-400">
        Slide {{ index + 1 }} / {{ total }}
      </div>
    </div>

    <!-- ============ CONTENT (semua layout non-cover) ============ -->
    <div v-else class="relative flex h-full flex-col px-[96px] py-[56px]">
      <!-- header -->
      <header class="shrink-0">
        <div class="flex items-center justify-between gap-6">
          <p v-if="slide.kicker" class="reveal text-[19px] font-semibold uppercase tracking-[0.24em] text-primary-700" style="--i:0">{{ slide.kicker }}</p>
          <div class="ml-auto flex items-center gap-4 text-[15px] text-slate-400">
            <span v-if="slide.role !== 'all'" class="badge-primary !text-[15px] !px-4">
              {{ slide.role === 'admin' ? 'Admin' : slide.role === 'guru' ? 'Guru' : 'Pustakawan' }}
            </span>
            <span class="tnum">{{ index + 1 }} / {{ total }}</span>
          </div>
        </div>
        <h2 class="reveal mt-2 text-[54px] font-bold leading-tight tracking-tight text-slate-900" style="--i:1">{{ slide.title }}</h2>
        <p v-if="slide.description" class="reveal mt-3 max-w-[1500px] text-[25px] leading-relaxed text-slate-600" style="--i:2">{{ slide.description }}</p>
        <div class="reveal mt-5 h-px w-full bg-slate-200" style="--i:2" aria-hidden="true" />
      </header>

      <!-- body: feature -->
      <div v-if="slide.layout === 'feature'" class="mt-7 grid min-h-0 flex-1 grid-cols-[620px_minmax(0,1fr)] gap-12">
        <div class="flex min-h-0 min-w-0 flex-col gap-5">
          <div v-if="slide.goal" class="reveal rounded-xl border border-primary-200 bg-primary-50 px-5 py-4" style="--i:3">
            <p class="text-[15px] font-semibold uppercase tracking-wider text-primary-700">Tujuan</p>
            <p class="mt-1 text-[22px] leading-snug text-primary-900">{{ slide.goal }}</p>
          </div>

          <div v-if="slide.steps?.length" class="reveal rounded-xl border border-slate-200 bg-white px-5 py-4" style="--i:4">
            <p class="text-[15px] font-semibold uppercase tracking-wider text-slate-400">Langkah penggunaan</p>
            <ol class="mt-2.5 flex flex-col gap-2">
              <li v-for="(s, i) in slide.steps" :key="i" class="flex items-start gap-3 text-[21px] leading-snug text-slate-700">
                <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-700 text-[14px] font-bold text-white tnum">{{ i + 1 }}</span>
                <span>{{ s }}</span>
              </li>
            </ol>
          </div>

          <div v-if="slide.bullets?.length" class="reveal rounded-xl border border-slate-200 bg-white px-5 py-4" style="--i:5">
            <p class="text-[15px] font-semibold uppercase tracking-wider text-slate-400">Poin penting</p>
            <ul class="mt-2.5 flex flex-col gap-2">
              <li v-for="(b, i) in slide.bullets" :key="i" class="flex items-start gap-3 text-[21px] leading-snug text-slate-700">
                <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                <span>{{ b }}</span>
              </li>
            </ul>
          </div>

          <div v-if="slide.watchouts?.length" class="reveal mt-auto rounded-xl border border-amber-200 bg-amber-50 px-5 py-4" style="--i:6">
            <p class="text-[15px] font-semibold uppercase tracking-wider text-amber-700">Perhatikan</p>
            <ul class="mt-2 flex flex-col gap-1.5">
              <li v-for="(w, i) in slide.watchouts" :key="i" class="flex items-start gap-2.5 text-[20px] leading-snug text-amber-900/90">
                <TriangleAlert class="mt-1 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>{{ w }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="flex min-h-0 min-w-0 flex-col">
          <div v-if="screen" class="reveal min-h-0 flex-1" style="--i:3">
            <ScreenFrame :width="1280" :height="800" aria-label="Rekonstruksi UI aplikasi (demo)">
              <component :is="screen.comp" v-bind="screen.props" />
            </ScreenFrame>
          </div>
          <div v-else-if="slide.screenTable" class="reveal min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-6" style="--i:3">
            <table class="w-full text-left text-[22px]">
              <caption class="mb-3 text-left text-[17px] font-semibold uppercase tracking-wider text-slate-400">{{ slide.screenTable.caption }}</caption>
              <thead>
                <tr class="border-b border-slate-200">
                  <th v-for="h in slide.screenTable.headers" :key="h" class="pb-3 pr-4 text-[16px] font-semibold uppercase tracking-wider text-slate-500">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in slide.screenTable.rows" :key="i" class="border-b border-slate-100 last:border-0">
                  <td v-for="(c, j) in r" :key="j" class="py-3 pr-4 text-slate-700" :class="j === 0 ? 'font-semibold text-slate-900' : ''">{{ c }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="slide.screenTable.note" class="mt-4 text-[17px] text-slate-400">{{ slide.screenTable.note }}</p>
          </div>
        </div>
      </div>

      <!-- body: grid cards -->
      <div v-else-if="slide.layout === 'grid'" class="mt-7 flex min-h-0 flex-1 flex-col gap-6">
        <div class="grid min-h-0 flex-1 grid-cols-3 gap-5">
          <article
            v-for="(c, i) in slide.cards"
            :key="c.title"
            class="reveal flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
            :style="{ '--i': 3 + i }"
          >
            <span class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-200">
              <component :is="iconOf(c.icon)" class="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 class="text-[26px] font-bold text-slate-900">{{ c.title }}</h3>
            <p class="mt-2 text-[20px] leading-relaxed text-slate-600">{{ c.body }}</p>
          </article>
        </div>
        <ul v-if="slide.bullets?.length" class="grid shrink-0 grid-cols-3 gap-5">
          <li
            v-for="(b, i) in slide.bullets"
            :key="i"
            class="reveal flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-[19px] leading-snug text-slate-600"
            :style="{ '--i': 9 + i }"
          >
            <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
            <span>{{ b }}</span>
          </li>
        </ul>
        <div v-if="slide.watchouts?.length" class="reveal shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-[19px] leading-snug text-amber-900/90" style="--i:12">
          <span class="font-semibold">Perhatikan: </span>{{ slide.watchouts.join(' · ') }}
        </div>
      </div>

      <!-- body: flow -->
      <div v-else-if="slide.layout === 'flow'" class="mt-8 flex min-h-0 flex-1 flex-col gap-8">
        <div class="flex items-stretch justify-between gap-3">
          <template v-for="(f, i) in slide.flow" :key="f.label">
            <div class="reveal flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-7 text-center shadow-card" :style="{ '--i': 3 + i }">
              <span class="flex h-3 w-3 rounded-full bg-primary-600" aria-hidden="true" />
              <p class="mt-4 text-[24px] font-bold leading-tight text-slate-900">{{ f.label }}</p>
              <p v-if="f.sub" class="mt-1.5 text-[18px] leading-snug text-slate-500">{{ f.sub }}</p>
            </div>
            <div
              v-if="i < slide.flow.length - 1"
              class="reveal flex shrink-0 items-center"
              :style="{ '--i': 4 + i }"
              aria-hidden="true"
            >
              <svg width="34" height="24" viewBox="0 0 34 24" fill="none"><path d="M2 12h26M20 4l10 8-10 8" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
          </template>
        </div>

        <div v-if="slide.stats?.length" class="grid shrink-0 grid-cols-4 gap-5">
          <div v-for="(s, i) in slide.stats" :key="s.label" class="reveal rounded-2xl border border-slate-200 bg-white px-6 py-5" :style="{ '--i': 10 + i }">
            <p class="text-[18px] text-slate-500">{{ s.label }}</p>
            <p class="mt-1 text-[42px] font-bold leading-none text-slate-900 tnum">{{ s.value }}</p>
            <p v-if="s.sub" class="mt-1.5 text-[17px] text-slate-400">{{ s.sub }}</p>
          </div>
        </div>

        <ul v-if="slide.bullets?.length" class="grid shrink-0 grid-cols-2 gap-x-10 gap-y-3">
          <li
            v-for="(b, i) in slide.bullets"
            :key="i"
            class="reveal flex items-start gap-3 text-[22px] leading-snug text-slate-700"
            :style="{ '--i': 12 + i }"
          >
            <span class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
            <span>{{ b }}</span>
          </li>
        </ul>

        <div v-if="slide.watchouts?.length" class="reveal mt-auto shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-[20px] leading-snug text-amber-900/90" style="--i:16">
          <span class="font-semibold">Perhatikan — </span>{{ slide.watchouts.join(' · ') }}
        </div>
      </div>

      <!-- body: lanes (keamanan / e2e / quick ref) -->
      <div v-else-if="slide.layout === 'lanes'" class="mt-7 flex min-h-0 flex-1 flex-col gap-6">
        <div class="grid min-h-0 flex-1 gap-5" :style="{ gridTemplateColumns: `repeat(${slide.lanes?.length || 3}, minmax(0,1fr))` }">
          <section
            v-for="(lane, i) in slide.lanes"
            :key="lane.title"
            class="reveal flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
            :style="{ '--i': 3 + i }"
          >
            <header class="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 class="text-[24px] font-bold text-slate-900">{{ lane.title }}</h3>
            </header>
            <ul class="flex min-h-0 flex-1 flex-col justify-center gap-3 px-6 py-5">
              <li
                v-for="(item, j) in lane.items"
                :key="j"
                class="flex items-start gap-3 text-[21px] leading-snug text-slate-700"
              >
                <span class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" :class="i === 0 ? 'bg-primary-600' : i === 1 ? 'bg-sky-600' : i === 2 ? 'bg-amber-500' : 'bg-rose-600'" aria-hidden="true" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </section>
        </div>
        <div v-if="slide.watchouts?.length" class="reveal shrink-0 rounded-xl border border-primary-200 bg-primary-50 px-5 py-4 text-[20px] leading-snug text-primary-900" style="--i:10">
          {{ slide.watchouts.join(' · ') }}
        </div>
      </div>

      <!-- body: bullets -->
      <div v-else-if="slide.layout === 'bullets'" class="mt-7 flex min-h-0 flex-1 flex-col gap-6">
        <ul class="grid shrink-0 grid-cols-2 gap-x-10 gap-y-4 content-start">
          <li
            v-for="(b, i) in slide.bullets"
            :key="i"
            class="reveal flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-[22px] leading-snug text-slate-700 shadow-card"
            :style="{ '--i': 3 + Math.min(i, 9) }"
          >
            <CheckCircle2 class="mt-1 h-6 w-6 shrink-0 text-primary-600" aria-hidden="true" />
            <span>{{ b }}</span>
          </li>
        </ul>
        <div v-if="slide.watchouts?.length" class="reveal mt-auto shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-[20px] text-amber-900/90" style="--i:12">
          <span class="font-semibold">Perhatikan — </span>{{ slide.watchouts.join(' · ') }}
        </div>
      </div>

      <!-- body: closing (pakai grid) -->
      <div v-else-if="slide.layout === 'closing'" class="mt-7 grid flex-1 grid-cols-2 gap-5">
        <article v-for="(c, i) in slide.cards" :key="c.title" class="reveal rounded-2xl border border-slate-200 bg-white p-6 shadow-card" :style="{ '--i': 3 + i }">
          <h3 class="text-[26px] font-bold text-slate-900">{{ c.title }}</h3>
          <p class="mt-2 text-[20px] leading-relaxed text-slate-600">{{ c.body }}</p>
        </article>
      </div>

      <!-- legend attendance (footer tetap pada slide presensi) -->
      <footer
        v-if="['admin', 'guru', 'intro'].includes(slide.section)"
        class="mt-5 flex shrink-0 items-center gap-6 border-t border-slate-200 pt-4 text-[16px] text-slate-400"
      >
        <span class="flex items-center gap-4">
          <span v-for="a in attendance" :key="a.code" class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full" :style="{ background: a.tone === 'success' ? '#047857' : a.tone === 'info' ? '#0369a1' : a.tone === 'warning' ? '#d97706' : '#be123c' }" />
            {{ a.code }}
          </span>
        </span>
        <span class="ml-auto">Rekonstruksi UI = demo fiktif · bukan data produksi</span>
      </footer>
    </div>
  </section>
</template>
