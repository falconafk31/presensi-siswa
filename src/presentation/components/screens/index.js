/**
 * Registry rekonstruksi UI — memetakan slide.screen → komponen.
 * Semua layar dirender pada ukuran tetap1280×800 (lihat ScreenFrame).
 */

import ScreenFrame from './ScreenFrame.vue'
import LoginScreen from './LoginScreen.vue'
import DashboardScreen from './DashboardScreen.vue'
import PresensiScreen from './PresensiScreen.vue'
import RekapScreen from './RekapScreen.vue'
import RekapSemesterScreen from './RekapSemesterScreen.vue'
import StatistikScreen from './StatistikScreen.vue'
import SiswaScreen from './SiswaScreen.vue'
import GuruScreen from './GuruScreen.vue'
import KalenderScreen from './KalenderScreen.vue'
import PengaturanScreen from './PengaturanScreen.vue'
import AktivitasScreen from './AktivitasScreen.vue'
import PanduanScreen from './PanduanScreen.vue'
import PerpusDashboardScreen from './PerpusDashboardScreen.vue'
import BukuScreen from './BukuScreen.vue'
import SirkulasiScreen from './SirkulasiScreen.vue'
import KunjunganScreen from './KunjunganScreen.vue'
import KartuScreen from './KartuScreen.vue'
import LaporanPerpusScreen from './LaporanPerpusScreen.vue'

export { ScreenFrame }

/** screen key → { comp, props } */
export const SCREENS = {
  login: { comp: LoginScreen, props: {} },
  'dashboard-admin': { comp: DashboardScreen, props: { variant: 'admin' } },
  'dashboard-guru': { comp: DashboardScreen, props: { variant: 'guru' } },
  'dashboard-perpus': { comp: PerpusDashboardScreen, props: {} },
  siswa: { comp: SiswaScreen, props: {} },
  guru: { comp: GuruScreen, props: {} },
  kalender: { comp: KalenderScreen, props: { role: 'admin' } },
  presensi: { comp: PresensiScreen, props: { role: 'guru' } },
  rekap: { comp: RekapScreen, props: { role: 'guru' } },
  'rekap-semester': { comp: RekapSemesterScreen, props: { role: 'guru' } },
  statistik: { comp: StatistikScreen, props: { role: 'guru' } },
  pengaturan: { comp: PengaturanScreen, props: {} },
  aktivitas: { comp: AktivitasScreen, props: {} },
  buku: { comp: BukuScreen, props: {} },
  sirkulasi: { comp: SirkulasiScreen, props: {} },
  kunjungan: { comp: KunjunganScreen, props: {} },
  kartu: { comp: KartuScreen, props: {} },
  'laporan-perpus': { comp: LaporanPerpusScreen, props: {} },
  panduan: { comp: PanduanScreen, props: { role: 'guru' } },
}

export function resolveScreen(key) {
  return SCREENS[key] || null
}
