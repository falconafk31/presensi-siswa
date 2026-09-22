/**
 * Mock data — Admin & identitas aplikasi (PRESENTATION ONLY).
 * Semua data FIKTIF untuk demo/tutorial. Tidak dibaca dari Supabase
 * dan tidak pernah ditulis kembali ke database produksi.
 */

export const DEMO_TODAY = '2026-09-22' // Selasa
export const DEMO_TODAY_LABEL = 'Selasa, 22 September 2026'
export const DEMO_PERIOD = '2026/2027 — Ganjil'
export const DEMO_PERIOD_SHORT = '2026/2027 Ganjil'

export interface AdminProfile {
  nama: string
  role: string
  username: string
}

export const admin: AdminProfile = {
  nama: 'Budi Santoso',
  role: 'Admin',
  username: 'admin.demo',
}

export interface SchoolIdentity {
  nama_sekolah: string
  kop: string[]
  tahun_ajaran: string
  semester: string
  daftar_kelas: string[]
  hari_libur: string[]
}

export const school: SchoolIdentity = {
  nama_sekolah: 'MIN Cendekia (Demo)',
  kop: [
    'Kementerian Agama Republik Indonesia',
    'Madrasah Ibtidaiyah Negeri Cendekia — Blora (Demo)',
    'Jl. Pendidikan No. 1, Blora 58219 · NPSN 99999999',
  ],
  tahun_ajaran: '2026/2027',
  semester: 'Ganjil',
  daftar_kelas: ['5A', '5B', '6A'],
  hari_libur: ['Sabtu', 'Minggu'],
}
