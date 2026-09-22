/** Mock data — Guru & wali kelas (FIKTIF, presentation only). */

export interface GuruProfile {
  nip: string
  nama: string
  role: string
  kelas: string | null
  username: string
}

export const guruLogin: GuruProfile = {
  nip: '198703122010011003',
  nama: 'Siti Rahmawati',
  role: 'Guru',
  kelas: '5A',
  username: 'guru.siti',
}

export const daftarGuru: GuruProfile[] = [
  guruLogin,
  {
    nip: '198905172012021004',
    nama: 'Dewi Lestari',
    role: 'Guru',
    kelas: '5B',
    username: 'guru.dewi',
  },
  {
    nip: '198511092011011006',
    nama: 'Agus Setiawan',
    role: 'Guru',
    kelas: '6A',
    username: 'guru.agus',
  },
  {
    nip: '197902282008011012',
    nama: 'Budi Santoso',
    role: 'Admin',
    kelas: null,
    username: 'admin.demo',
  },
  {
    nip: '199007142015032005',
    nama: 'Nur Aini',
    role: 'Pustakawan',
    kelas: null,
    username: 'pustakawan.aini',
  },
]
