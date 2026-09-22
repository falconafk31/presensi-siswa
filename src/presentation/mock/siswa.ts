/** Mock data — Daftar siswa (FIKTIF, presentation only). */

export interface SiswaRow {
  nisn: string
  nama: string
  jk: 'L' | 'P'
  kelas: string
  active: boolean
}

const s = (nisn: string, nama: string, jk: 'L' | 'P', kelas: string): SiswaRow => ({
  nisn,
  nama,
  jk,
  kelas,
  active: true,
})

export const siswaPerKelas: Record<string, SiswaRow[]> = {
  '5A': [
    s('0072341501', 'Ahmad Fauzan', 'L', '5A'),
    s('0072341502', 'Fatimah Az-Zahra', 'P', '5A'),
    s('0072341503', 'Hamdan Fadhilah', 'L', '5A'),
    s('0072341504', 'Khadijah Aulia', 'P', '5A'),
    s('0072341505', 'Muhammad Rafi', 'L', '5A'),
    s('0072341506', 'Nabila Putri', 'P', '5A'),
    s('0072341507', 'Rizky Maulana', 'L', '5A'),
    s('0072341508', 'Salsabila Aulia', 'P', '5A'),
    s('0072341509', 'Yusuf Ibrahim', 'L', '5A'),
    s('0072341510', 'Zainal Abidin', 'L', '5A'),
  ],
  '5B': [
    s('0072341511', 'Abdurrahman Hakim', 'L', '5B'),
    s('0072341512', 'Bilqis Nuraini', 'P', '5B'),
    s('0072341513', 'Farhan Abdillah', 'L', '5B'),
    s('0072341514', 'Gita Purnama', 'P', '5B'),
    s('0072341515', 'Iqbal Ramadhan', 'L', '5B'),
    s('0072341516', 'Laila Safitri', 'P', '5B'),
    s('0072341517', 'Nadia Zahra', 'P', '5B'),
    s('0072341518', 'Rafa Ardiansyah', 'L', '5B'),
    s('0072341519', 'Sinta Dewi', 'P', '5B'),
    s('0072341520', 'Yoga Pratama', 'L', '5B'),
  ],
  '6A': [
    s('0072341521', 'Alifia Rahma', 'P', '6A'),
    s('0072341522', 'Arkan Maulana', 'L', '6A'),
    s('0072341523', 'Azzahra Putri', 'P', '6A'),
    s('0072341524', 'Bintang Prakoso', 'L', '6A'),
    s('0072341525', 'Camelia Sari', 'P', '6A'),
    s('0072341526', 'Daffa Rizky', 'L', '6A'),
    s('0072341527', 'Eka Wulandari', 'P', '6A'),
    s('0072341528', 'Gilang Ramadhan', 'L', '6A'),
    s('0072341529', 'Hana Maulida', 'P', '6A'),
    s('0072341530', 'Ilham Fauzi', 'L', '6A'),
    s('0072341531', 'Jihan Azzahra', 'P', '6A'),
    s('0072341532', 'Kelvin Ardiansyah', 'L', '6A'),
  ],
}

export const semuaSiswa: SiswaRow[] = Object.values(siswaPerKelas).flat()

/** Riwayat kelas (untuk menu Riwayat Kelas). */
export const riwayatKelas = [
  { nama: 'Ahmad Fauzan', nisn: '0072341501', tahun: '2026/2027', kelas: '5A', wali: 'Siti Rahmawati' },
  { nama: 'Ahmad Fauzan', nisn: '0072341501', tahun: '2025/2026', kelas: '4B', wali: 'Dewi Lestari' },
  { nama: 'Nabila Putri', nisn: '0072341506', tahun: '2026/2027', kelas: '5A', wali: 'Siti Rahmawati' },
  { nama: 'Nabila Putri', nisn: '0072341506', tahun: '2025/2026', kelas: '4B', wali: 'Dewi Lestari' },
  { nama: 'Alifia Rahma', nisn: '0072341521', tahun: '2026/2027', kelas: '6A', wali: 'Agus Setiawan' },
  { nama: 'Alifia Rahma', nisn: '0072341521', tahun: '2025/2026', kelas: '5B', wali: 'Dewi Lestari' },
]
