<script setup>
// Kerangka "browser aplikasi" untuk rekonstruksi UI: sidebar + topbar
// meniru AppLayout nyata (token & label yang sama), data user FIKTIF.
import { computed } from 'vue'
import {
  LayoutDashboard, ClipboardCheck, FileSpreadsheet, CalendarCheck,
  TriangleAlert, CalendarDays, Users, GraduationCap, History,
  ScrollText, Settings, PieChart, Book, BookOpen, UsersRound,
  Printer, Library, HelpCircle, CalendarRange,
} from 'lucide-vue-next'
import { school, admin, guruLogin, pustakawan, DEMO_PERIOD, DEMO_TODAY_LABEL } from '@/presentation/mock'

const props = defineProps({
  active: { type: String, default: '' }, // key nav aktif
  role: { type: String, default: 'admin' }, // admin|guru|pustakawan
  pageTitle: { type: String, default: 'Dashboard' },
  pageSubtitle: { type: String, default: DEMO_TODAY_LABEL },
})

const NAV = {
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'presensi', label: 'Input Presensi', icon: ClipboardCheck },
    { key: 'rekap', label: 'Rekap Bulanan', icon: FileSpreadsheet },
    { key: 'rekap-semester', label: 'Rekap Semester', icon: CalendarCheck },
    { key: 'statistik', label: 'Statistik Kehadiran', icon: TriangleAlert },
    { key: 'kalender', label: 'Kalender Akademik', icon: CalendarDays },
    { key: 'siswa', label: 'Data Siswa', icon: Users },
    { key: 'guru', label: 'Guru & Wali Kelas', icon: GraduationCap },
    { key: 'aktivitas', label: 'Log Aktivitas', icon: ScrollText },
    { key: 'pengaturan', label: 'Pengaturan', icon: Settings },
    { key: 'dashboard-perpus', label: 'Beranda Perpustakaan', icon: PieChart },
    { key: 'panduan', label: 'Panduan Penggunaan', icon: HelpCircle },
  ],
  guru: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'presensi', label: 'Input Presensi', icon: ClipboardCheck },
    { key: 'rekap', label: 'Rekap Bulanan', icon: FileSpreadsheet },
    { key: 'rekap-semester', label: 'Rekap Semester', icon: CalendarCheck },
    { key: 'statistik', label: 'Statistik Kehadiran', icon: TriangleAlert },
    { key: 'kalender', label: 'Kalender Akademik', icon: CalendarDays },
    { key: 'panduan', label: 'Panduan Penggunaan', icon: HelpCircle },
  ],
  pustakawan: [
    { key: 'dashboard-perpus', label: 'Beranda Perpustakaan', icon: PieChart },
    { key: 'buku', label: 'Data Koleksi', icon: Book },
    { key: 'sirkulasi', label: 'Sirkulasi', icon: BookOpen },
    { key: 'kunjungan', label: 'Data Pengunjung', icon: UsersRound },
    { key: 'kartu', label: 'Kartu Anggota', icon: Printer },
    { key: 'laporan-perpus', label: 'Laporan & Statistik', icon: Library },
    { key: 'panduan', label: 'Panduan Penggunaan', icon: HelpCircle },
  ],
}

const nav = computed(() => NAV[props.role] || NAV.admin)
const user = computed(() =>
  props.role === 'guru'
    ? { nama: guruLogin.nama, role: 'Guru', kelas: guruLogin.kelas }
    : props.role === 'pustakawan'
      ? { nama: pustakawan.nama, role: pustakawan.role, kelas: null }
      : { nama: admin.nama, role: admin.role, kelas: null },
)
const initial = computed(() => user.value.nama.charAt(0))
</script>

<template>
  <div class="mock-frame">
    <!-- Sidebar -->
    <aside class="mock-frame__side">
      <div class="mock-frame__brand">
        <span class="mock-frame__logo">MC</span>
        <div class="min-w-0">
          <p class="truncate text-[13px] font-semibold leading-tight text-slate-900">{{ school.nama_sekolah }}</p>
          <p class="text-[11px] leading-tight text-slate-400">Sistem Presensi</p>
        </div>
      </div>
      <nav class="flex-1 overflow-hidden px-2.5 py-3">
        <template v-for="item in nav" :key="item.key">
          <div
            class="group relative mb-0.5 flex min-h-[34px] items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium"
            :class="active === item.key ? 'bg-primary-50 text-primary-800' : 'text-slate-600'"
          >
            <span
              v-if="active === item.key"
              class="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-600"
              aria-hidden="true"
            />
            <component
              :is="item.icon"
              class="h-[18px] w-[18px] shrink-0"
              :class="active === item.key ? 'text-primary-700' : 'text-slate-400'"
              aria-hidden="true"
            />
            <span class="truncate">{{ item.label }}</span>
          </div>
        </template>
      </nav>
      <div class="shrink-0 border-t border-slate-100 p-2">
        <div class="flex items-center gap-2.5 rounded-lg bg-slate-50 px-2.5 py-2">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">{{ initial }}</span>
          <div class="min-w-0">
            <p class="truncate text-[12.5px] font-semibold leading-tight text-slate-800">{{ user.nama }}</p>
            <p class="text-[11px] leading-tight text-slate-400">
              {{ user.role }}<span v-if="user.kelas"> · Kelas {{ user.kelas }}</span>
            </p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-[52px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white pl-4 pr-24">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] text-slate-500">
            Halo, <span class="font-semibold text-slate-800">{{ user.nama.split(' ')[0] }}</span>
            <span class="mx-1.5 text-slate-300">·</span>
            <span class="hidden lg:inline">{{ pageTitle }}</span>
          </p>
        </div>
        <div class="badge-primary !py-1.5">
          <CalendarRange class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{{ DEMO_PERIOD }}</span>
        </div>
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">{{ initial }}</span>
      </header>
      <main class="flex-1 overflow-hidden bg-base p-4">
        <div class="flex h-full flex-col gap-3">
          <!-- judul halaman -->
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 class="page-title">{{ pageTitle }}</h1>
              <p class="mt-0.5 text-sm text-slate-500">{{ pageSubtitle }}</p>
            </div>
            <slot name="actions" />
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <slot />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.mock-frame {
  display: flex;
  width: 1280px;
  height: 800px;
  overflow: hidden;
  background: #f8fafc;
  color: #1e293b;
}
.mock-frame__side {
  display: flex;
  width: 232px;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  background: #fff;
}
.mock-frame__brand {
  display: flex;
  height: 56px;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #f1f5f9;
  padding: 0 14px;
}
.mock-frame__logo {
  display: flex;
  height: 36px;
  width: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 10px;
  background: #047857;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.no-link {
  pointer-events: none;
}
</style>
