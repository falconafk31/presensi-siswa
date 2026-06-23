import { useSettingsStore } from '@/stores/settings'

// Util tanggal — semua dalam zona waktu lokal (WIB), format YYYY-MM-DD.

export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

// Semua tanggal dalam satu bulan (year, month 1-12) sebagai array YYYY-MM-DD.
export function daysInMonth(year, month) {
  const total = new Date(year, month, 0).getDate()
  return Array.from({ length: total }, (_, i) => toISODate(new Date(year, month - 1, i + 1)))
}

export function dayNumber(iso) {
  return Number(iso.slice(8, 10))
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function dayName(iso) {
  return HARI[new Date(iso + 'T00:00:00').getDay()]
}

export function isWeekend(iso) {
  const d = new Date(iso + 'T00:00:00').getDay()
  try {
    const store = useSettingsStore()
    const libur = store.settings?.hari_libur_mingguan || [0] // Default hanya hari Minggu
    return libur.includes(d)
  } catch {
    return d === 0 // Default hanya hari Minggu
  }
}

export function formatTanggalPanjang(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

export function namaBulan(month) {
  return BULAN[month - 1]
}

export function formatWaktu(ts) {
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
