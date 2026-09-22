/**
 * Mock data — Statistik kehadiran (FIKTIF, presentation only).
 * Konsisten dengan mock/presensi.ts:
 *  - Kelas5A: hari submit bulan Sep s.d22 =15 (bebas alfa = (15−A)/15).
 *  - Ambang batas demo90% →2 siswa di bawah ambang.
 */

export const statistikBulan = 'September 2026'
export const statistikHariEfektif = 15
export const statistikThreshold = 90

export interface StatistikRow {
  nisn: string
  nama: string
  kelas: string
  i: number
  s: number
  a: number
  hadir: number
  total: number
  persen: number // % bebas alfa — sama dengan rumus aplikasi
}

const total = statistikHariEfektif
const row = (
  nisn: string,
  nama: string,
  i: number,
  s: number,
  a: number,
): StatistikRow => ({
  nisn,
  nama,
  kelas: '5A',
  i,
  s,
  a,
  hadir: total - (i + s + a),
  total,
  persen: Math.round(((total - a) / total) * 100),
})

// Diurutkan aplikasi: persen naik, lalu nama — konsisten dengan tampilan.
export const statistikRows: StatistikRow[] = [
  row('0072341503', 'Hamdan Fadhilah', 0, 1, 2),
  row('0072341509', 'Yusuf Ibrahim', 1, 1, 2),
  row('0072341501', 'Ahmad Fauzan', 0, 0, 0),
  row('0072341502', 'Fatimah Az-Zahra', 0, 0, 0),
  row('0072341504', 'Khadijah Aulia', 0, 0, 0),
  row('0072341505', 'Muhammad Rafi', 0, 0, 0),
  row('0072341508', 'Salsabila Aulia', 0, 0, 0),
  row('0072341510', 'Zainal Abidin', 0, 0, 0),
  row('0072341506', 'Nabila Putri', 1, 0, 0),
  row('0072341507', 'Rizky Maulana', 0, 1, 0),
].sort((a, b) => a.persen - b.persen || a.nama.localeCompare(b.nama, 'id'))

export const statistikDiBawah = statistikRows.filter((r) => r.persen < statistikThreshold).length
