/**
 * Mock data — Presensi harian & rekap (FIKTIF, presentation only).
 * Angka dikonsistenkan antar layar:
 *  - 22 Sep 2026 (Selasa, hari efektif):
 *      5A sudah presensi  → H8 I1 S1 A0
 *      5B sudah presensi  → H9 I0 S1 A0
 *      6A BELUM presensi  → perhatian admin di dashboard
 *  - Hari efektif Sep 2026 s.d 22 Sep = 16 hari; hari submit 5A = 15.
 */

export type Status = 'Hadir' | 'Izin' | 'Sakit' | 'Alfa'

/** Status per siswa pada 22 Sep 2026 per kelas (default 'Hadir'). */
export const presensiHariIni: Record<string, Record<string, Status>> = {
  '5A': {
    '0072341506': 'Izin', // Nabila Putri
    '0072341507': 'Sakit', // Rizky Maulana
  },
  '5B': {
    '0072341513': 'Sakit', // Farhan Abdillah
  },
  '6A': {}, // belum presensi
}

export const kelasSudahPresensi = ['5A', '5B']
export const kelasBelumPresensi = ['6A']

/** Ringkasan dashboard admin (dari kelas yang sudah submit: 20 siswa). */
export const dashboardAdmin = {
  totalSiswa: 32,
  tercatat: 20, // siswa di kelas yang sudah submit
  hadir: 17,
  izin: 1,
  sakit: 2,
  alfa: 0,
  persen: 85, // 17/20
  submitted: 2,
  totalKelas: 3,
}

/** Ringkasan dashboard guru kelas 5A (10 siswa). */
export const dashboardGuru5A = {
  kelas: '5A',
  total: 10,
  hadir: 8,
  izin: 1,
  sakit: 1,
  alfa: 0,
  persen: 80, // 8/10
}

/**
 * Tren harian "Hadir" (semua kelas) Sep 2026 untuk chart dashboard.
 * Weekend & libur =0. Tanggal depan (setelah22) = null (belum ada data).
 * Tanggal 22 =17 karena6A belum submit.
 */
export const trenBulanan: { day: number; hadir: number | null }[] = [
  { day: 1, hadir: null }, // sebelum bulan berjalan? tetap hari kerja → isi
  { day: 2, hadir: 31 },
  { day: 3, hadir: 32 },
  { day: 4, hadir: 30 },
  { day: 5, hadir: 31 },
  { day: 6, hadir: 0 }, // Sabtu
  { day: 7, hadir: 0 }, // Minggu
  { day: 8, hadir: 32 },
  { day: 9, hadir: 31 },
  { day: 10, hadir: 30 },
  { day: 11, hadir: 32 },
  { day: 12, hadir: 0 },
  { day: 13, hadir: 0 },
  { day: 14, hadir: 0 }, //14 Sep libur kegiatan
  { day: 15, hadir: 32 },
  { day: 16, hadir: 29 },
  { day: 17, hadir: 31 },
  { day: 18, hadir: 32 },
  { day: 19, hadir: 0 },
  { day: 20, hadir: 0 },
  { day: 21, hadir: 31 },
  { day: 22, hadir: 17 }, // hari ini —6A belum presensi
]
// hari1 juga hari kerja (Selasa? 1 Sep 2026 = Rabu) → rapikan:
trenBulanan[0] = { day: 1, hadir: 30 }

/** Matriks rekap bulanan kelas5A (hanya hari submit; selain Hadir disimpan). */
export const rekap5A = {
  kelas: '5A',
  bulan: 'September',
  tahun: 2026,
  hariEfektifSubmit: 15, // hari submit kelas5A pada bulan ini
  // baris per siswa: H/I/S/A dihitung atas hari submit
  rows: [
    { nisn: '0072341501', nama: 'Ahmad Fauzan', H: 15, I: 0, S: 0, A: 0 },
    { nisn: '0072341502', nama: 'Fatimah Az-Zahra', H: 15, I: 0, S: 0, A: 0 },
    { nisn: '0072341503', nama: 'Hamdan Fadhilah', H: 12, I: 0, S: 1, A: 2 },
    { nisn: '0072341504', nama: 'Khadijah Aulia', H: 15, I: 0, S: 0, A: 0 },
    { nisn: '0072341505', nama: 'Muhammad Rafi', H: 15, I: 0, S: 0, A: 0 },
    { nisn: '0072341506', nama: 'Nabila Putri', H: 14, I: 1, S: 0, A: 0 },
    { nisn: '0072341507', nama: 'Rizky Maulana', H: 14, I: 0, S: 1, A: 0 },
    { nisn: '0072341508', nama: 'Salsabila Aulia', H: 15, I: 0, S: 0, A: 0 },
    { nisn: '0072341509', nama: 'Yusuf Ibrahim', H: 11, I: 1, S: 1, A: 2 },
    { nisn: '0072341510', nama: 'Zainal Abidin', H: 15, I: 0, S: 0, A: 0 },
  ],
  /** Pengecualian per tanggal (ISO tanpa bulan) untuk sel rekap. */
  exceptions: {
    '0072341503': { 8: 'A', 15: 'A', 21: 'S' },
    '0072341506': { 22: 'I' },
    '0072341507': { 22: 'S' },
    '0072341509': { 3: 'S', 7: 'A', 10: 'I', 16: 'A', 18: 'A', 21: 'S' },
  },
  libur: [6, 7, 13, 14, 20, 21], // weekend Sep2026 (Sab/Ming) — wait: 5,6 /12,13/19,20
}
// Perbaiki weekend Sep 2026:1=Wed → Sab=5,12,19 · Ming=6,13,20
rekap5A.libur = [5, 6, 12, 13, 14, 19, 20] // weekend +14 Sep (libur kegiatan)
// Exceptions hanya pada hari sekolah (bukan weekend/libur):
rekap5A.exceptions['0072341503'] = { 4: 'A', 15: 'A', 17: 'S' } // H12 I0 S1 A2
rekap5A.exceptions['0072341509'] = { 3: 'S', 4: 'A', 10: 'I', 17: 'A' } // H11 I1 S1 A2

/** Rekap semester — kelas5A, rentang13 Jul –22 Sep2026 (50 hari efektif submit). */
export const rekapSemester5A = {
  kelas: '5A',
  rentang: '13 Juli 2026 –22 September 2026',
  hariEfektif: 50,
  perBulan: [
    { bulan: 'Juli', hari: 14 },
    { bulan: 'Agustus', hari: 21 },
    { bulan: 'September', hari: 15 },
  ],
  rows: [
    { nama: 'Ahmad Fauzan', H: 50, I: 0, S: 0, A: 0 },
    { nama: 'Fatimah Az-Zahra', H: 50, I: 0, S: 0, A: 0 },
    { nama: 'Hamdan Fadhilah', H: 46, I: 0, S: 1, A: 3 },
    { nama: 'Khadijah Aulia', H: 50, I: 0, S: 0, A: 0 },
    { nama: 'Muhammad Rafi', H: 49, I: 1, S: 0, A: 0 },
    { nama: 'Nabila Putri', H: 49, I: 1, S: 0, A: 0 },
    { nama: 'Rizky Maulana', H: 49, I: 0, S: 1, A: 0 },
    { nama: 'Salsabila Aulia', H: 50, I: 0, S: 0, A: 0 },
    { nama: 'Yusuf Ibrahim', H: 45, I: 2, S: 1, A: 2 },
    { nama: 'Zainal Abidin', H: 48, I: 0, S: 0, A: 2 },
  ],
}
