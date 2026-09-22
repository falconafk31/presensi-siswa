/** Mock data — Daftar kelas (FIKTIF, presentation only). */

export interface KelasInfo {
  kelas: string
  wali: string
  jumlah: number
}

export const daftarKelas: KelasInfo[] = [
  { kelas: '5A', wali: 'Siti Rahmawati', jumlah: 10 },
  { kelas: '5B', wali: 'Dewi Lestari', jumlah: 10 },
  { kelas: '6A', wali: 'Agus Setiawan', jumlah: 12 },
]

export const totalSiswaAktif = daftarKelas.reduce((n, k) => n + k.jumlah, 0) // 32
