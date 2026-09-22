/** Mock data — Perpustakaan (FIKTIF, presentation only). */

export const pustakawan = {
  nama: 'Nur Aini',
  role: 'Pustakawan',
  username: 'pustakawan.aini',
}

export const perpusStats = {
  totalJudul: 128,
  totalEksemplar: 462,
  dipinjam: 37,
  terlambat: 4,
  kunjunganHariIni: 24,
}

export interface BukuRow {
  id: number
  judul: string
  pengarang: string
  tahun: number
  stok: number
  dipinjam: number
}

export const daftarBuku: BukuRow[] = [
  { id: 1, judul: 'Laskar Pelangi', pengarang: 'Andrea Hirata', tahun: 2005, stok: 5, dipinjam: 2 },
  { id: 2, judul: 'Bumi Manusia', pengarang: 'Pramoedya Ananta Toer', tahun: 1980, stok: 4, dipinjam: 1 },
  { id: 3, judul: 'Sang Pemimpi', pengarang: 'Andrea Hirata', tahun: 2006, stok: 3, dipinjam: 0 },
  { id: 4, judul: 'Perahu Kertas', pengarang: 'Dee Lestari', tahun: 2010, stok: 4, dipinjam: 2 },
  { id: 5, judul: 'Negeri 5 Menara', pengarang: 'A. Fuadi', tahun: 2011, stok: 5, dipinjam: 1 },
  { id: 6, judul: 'Dilan: Dia Adalah Dilanku 1990', pengarang: 'Pidi Baiq', tahun: 2014, stok: 6, dipinjam: 3 },
]

export interface SirkulasiRow {
  siswa: string
  kelas: string
  buku: string
  pinjam: string
  kembali: string
  status: 'Dipinjam' | 'Dikembalikan' | 'Terlambat7 hari'
}

export const sirkulasi: SirkulasiRow[] = [
  {
    siswa: 'Ahmad Fauzan',
    kelas: '5A',
    buku: 'Laskar Pelangi',
    pinjam: '19 Sep 2026',
    kembali: '26 Sep 2026',
    status: 'Dipinjam',
  },
  {
    siswa: 'Nabila Putri',
    kelas: '5A',
    buku: 'Bumi Manusia',
    pinjam: '12 Sep 2026',
    kembali: '19 Sep 2026',
    status: 'Dikembalikan',
  },
  {
    siswa: 'Rizky Maulana',
    kelas: '5A',
    buku: 'Perahu Kertas',
    pinjam: '08 Sep 2026',
    kembali: '15 Sep 2026',
    status: 'Terlambat7 hari',
  },
  {
    siswa: 'Bilqis Nuraini',
    kelas: '5B',
    buku: 'Negeri 5 Menara',
    pinjam: '20 Sep 2026',
    kembali: '27 Sep 2026',
    status: 'Dipinjam',
  },
  {
    siswa: 'Ilham Fauzi',
    kelas: '6A',
    buku: 'Dilan: Dia Adalah Dilanku 1990',
    pinjam: '21 Sep 2026',
    kembali: '28 Sep 2026',
    status: 'Dipinjam',
  },
]

export const kunjunganHariIni = [
  { nama: 'Ahmad Fauzan', kelas: '5A', jam: '09:15' },
  { nama: 'Nabila Putri', kelas: '5A', jam: '09:20' },
  { nama: 'Bilqis Nuraini', kelas: '5B', jam: '10:02' },
  { nama: 'Ilham Fauzi', kelas: '6A', jam: '10:18' },
  { nama: 'Salsabila Aulia', kelas: '5A', jam: '11:40' },
]

export const laporanPerpus = {
  periode: 'Bulan Ini (September 2026)',
  kunjunganTotal: 342,
  peminjamanTotal: 89,
  peringkatPengunjung: [
    { nama: 'Nabila Putri', kelas: '5A', kunjungan: 14 },
    { nama: 'Ahmad Fauzan', kelas: '5A', kunjungan: 12 },
    { nama: 'Bilqis Nuraini', kelas: '5B', kunjungan: 11 },
    { nama: 'Ilham Fauzi', kelas: '6A', kunjungan: 9 },
  ],
  bukuFavorit: [
    { judul: 'Laskar Pelangi', kali: 11 },
    { judul: 'Dilan: Dia Adalah Dilanku 1990', kali: 9 },
    { judul: 'Perahu Kertas', kali: 7 },
  ],
}
