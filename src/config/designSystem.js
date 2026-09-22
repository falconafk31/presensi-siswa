/** Unified Design Tokens — single source of truth for JS-driven UI (charts, badges, statuses).
 * CSS-driven styling lives in src/style.css + tailwind.config.js.
 * Keep semantic meaning: color must carry meaning, never decoration.
 */

export const COLORS = {
  primary: '#047857', // emerald-700
  primaryDark: '#065f46',
  primarySoft: '#ecfdf5',
  gold: '#d97706',
  goldBright: '#fbbf24',
  success: '#059669',
  warning: '#d97706',
  danger: '#e11d48',
  info: '#2563eb',
  library: '#1d4ed8',
  ink: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
}

export const CHART_COLORS = {
  // Sama dengan ATTENDANCE_COLORS — konsisten dengan tabel Rekap (source of truth).
  hadir: '#047857',
  izin: '#0369a1',
  sakit: '#d97706',
  alfa: '#be123c',
  grid: '#e2e8f0',
  tick: '#64748b',
  line: '#047857',
  lineFill: 'rgba(4, 120, 87, 0.10)',
  libraryLine: '#1d4ed8',
  libraryFill: 'rgba(29, 78, 216, 0.10)',
}

// Warna status kehadiran — source of truth: header kolom tabel Rekap.
// WAJIB dipakai persis: Hadir #047857, Izin #0369a1, Sakit #d97706, Alfa #be123c.
export const ATTENDANCE_COLORS = {
  Hadir: '#047857', // emerald-700
  Izin: '#0369a1',  // sky-700
  Sakit: '#d97706', // amber-600
  Alfa: '#be123c',  // rose-700
}

// Attendance status metadata — single source for segmented controls, badges, legends.
// icon names map to lucide icons in components; short = compact label for tight spaces.
export const ATTENDANCE_STATUS = [
  { code: 'Hadir', short: 'H', tone: 'success', dot: CHART_COLORS.hadir },
  { code: 'Izin', short: 'I', tone: 'info', dot: CHART_COLORS.izin },
  { code: 'Sakit', short: 'S', tone: 'warning', dot: CHART_COLORS.sakit },
  { code: 'Alfa', short: 'A', tone: 'danger', dot: CHART_COLORS.alfa },
]

export const STATUS_TONE_CLASSES = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  primary: 'bg-primary-50 text-primary-700 ring-primary-600/20',
  library: 'bg-blue-50 text-blue-700 ring-blue-600/20',
}

// Consistent chart defaults — calm, readable for operators.
export const CHART_DEFAULTS = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize: 11,
  color: COLORS.muted,
}

// Format kotak ikon yang seragam untuk seluruh dashboard (chip KPI, aksi cepat, ringkasan).
export const ICON_CHIP = {
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  info: 'bg-sky-50 text-sky-600 ring-sky-200',
  warning: 'bg-amber-50 text-amber-600 ring-amber-200',
  danger: 'bg-rose-50 text-rose-600 ring-rose-200',
  neutral: 'bg-slate-50 text-slate-600 ring-slate-200',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  library: 'bg-blue-50 text-blue-600 ring-blue-200',
}

export const RADIUS = { sm: 8, md: 10, lg: 12, xl: 14, '2xl': 16 }
export const TOUCH_TARGET = 44 // minimum px for mobile tap targets
