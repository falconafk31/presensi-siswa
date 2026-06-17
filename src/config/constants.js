// KELAS_LIST dihapus karena sekarang dinamis diambil dari app_settings.

// Status presensi + metadata warna untuk segmented control & badge.
export const STATUS_PRESENSI = [
  { code: 'Hadir', short: 'H', color: 'emerald' },
  { code: 'Izin', short: 'I', color: 'sky' },
  { code: 'Sakit', short: 'S', color: 'amber' },
  { code: 'Alfa', short: 'A', color: 'rose' },
]

export const STATUS_SISWA = ['aktif', 'lulus', 'pindah', 'keluar']

// Ambang batas default % kehadiran untuk peringatan (bisa diubah di UI).
export const DEFAULT_THRESHOLD = 75
