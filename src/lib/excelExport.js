import { namaBulan } from '@/lib/dates'

export async function exportExcelBulanan({
  kelas,
  year,
  month,
  days,
  students,
  matrix,
  summary,
  liburSet,
  submittedDatesSet,
  waliKelas,
  nipWaliKelas,
}) {
  const XLSX = await import('xlsx')
  const wsData = []

  // Header 1: Title
  wsData.push([`REKAPITULASI KEHADIRAN SISWA KELAS ${kelas}`])
  wsData.push([`Bulan: ${namaBulan(month)} ${year}`])
  if (waliKelas) {
    wsData.push([`Wali Kelas: ${waliKelas}` + (nipWaliKelas ? ` (NIP. ${nipWaliKelas})` : '')])
  }
  wsData.push([])

  // Header Table
  const headRow = ['No', 'NISN', 'Nama Siswa']
  days.forEach(d => headRow.push(String(Number(d.slice(8, 10)))))
  headRow.push('H', 'I', 'S', 'A', '%H', '%I', '%S', '%A')
  wsData.push(headRow)

  // Body Table
  students.forEach((s, i) => {
    const row = [i + 1, s.nisn, s.nama]
    const m = matrix[s.nisn] || {}
    days.forEach(d => {
      if (liburSet && liburSet.has(d)) row.push('L')
      else if (submittedDatesSet && !submittedDatesSet.has(d)) row.push('-')
      else row.push(m[d] || 'H')
    })
    const sum = summary[s.nisn] || { H: 0, I: 0, S: 0, A: 0, persenH: 0, persenI: 0, persenS: 0, persenA: 0 }
    row.push(sum.H, sum.I, sum.S, sum.A, `${sum.persenH}%`, `${sum.persenI}%`, `${sum.persenS}%`, `${sum.persenA}%`)
    wsData.push(row)
  })

  // Footer Keterangan
  const totalLibur = liburSet ? liburSet.size : 0
  const hadirEfektif = days.filter(d => !liburSet?.has(d) && submittedDatesSet?.has(d)).length

  wsData.push([])
  wsData.push(['', '', `Total Hari Efektif Diabsen: ${hadirEfektif} Hari`])
  wsData.push(['', '', `Total Libur: ${totalLibur} Hari`])
  wsData.push(['', '', `*Catatan: Persentase kehadiran diukur berdasarkan proporsi kehadiran terhadap hari efektif Kegiatan Belajar Mengajar (KBM).`])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Tweak column width
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // NISN
    { wch: 30 }, // Nama
    ...days.map(() => ({ wch: 4 })), // Dates
    { wch: 6 },  // H
    { wch: 6 },  // I
    { wch: 6 },  // S
    { wch: 6 },  // A
    { wch: 6 },  // %H
    { wch: 6 },  // %I
    { wch: 6 },  // %S
    { wch: 6 },  // %A
  ]

  XLSX.utils.book_append_sheet(wb, ws, `Rekap ${namaBulan(month)}`)
  XLSX.writeFile(wb, `Rekap_Absensi_Kelas-${kelas}_${namaBulan(month)}_${year}.xlsx`)
}

export async function exportExcelSemester({
  kelas,
  semesterText,
  students,
  summary,
  waliKelas,
  nipWaliKelas,
}) {
  const XLSX = await import('xlsx')
  const wsData = []

  wsData.push([`REKAPITULASI KEHADIRAN SEMESTER KELAS ${kelas}`])
  wsData.push([`Periode: ${semesterText}`])
  if (waliKelas) {
    wsData.push([`Wali Kelas: ${waliKelas}` + (nipWaliKelas ? ` (NIP. ${nipWaliKelas})` : '')])
  }
  wsData.push([])

  const headRow = ['No', 'NISN', 'Nama Siswa', 'H', 'I', 'S', 'A', '%H', '%I', '%S', '%A']
  wsData.push(headRow)

  students.forEach((s, i) => {
    const sum = summary[s.nisn] || { H: 0, I: 0, S: 0, A: 0, persenH: 0, persenI: 0, persenS: 0, persenA: 0 }
    wsData.push([
      i + 1,
      s.nisn,
      s.nama,
      sum.H,
      sum.I,
      sum.S,
      sum.A,
      `${sum.persenH}%`,
      `${sum.persenI}%`,
      `${sum.persenS}%`,
      `${sum.persenA}%`
    ])
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  ws['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 35 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, `Rekap Semester`)
  XLSX.writeFile(wb, `Rekap_Semester_Kelas-${kelas}.xlsx`)
}

export async function exportExcelKunjungan({
  topStudents,
  periodeText,
}) {
  const XLSX = await import('xlsx')
  const wsData = []

  wsData.push([`REKAPITULASI KUNJUNGAN PERPUSTAKAAN`])
  wsData.push([`Periode: ${periodeText}`])
  wsData.push([])

  const headRow = ['No', 'Nama Siswa', 'Kelas', 'Jumlah Kunjungan']
  wsData.push(headRow)

  if (!topStudents || topStudents.length === 0) {
    wsData.push(['-', 'Belum ada data kunjungan pada periode ini', '-', '-'])
  } else {
    topStudents.forEach((s, i) => {
      wsData.push([
        i + 1,
        s.nama,
        s.kelas || '-',
        s.count
      ])
    })
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 35 }, // Nama
    { wch: 15 }, // Kelas
    { wch: 20 }, // Jumlah
  ]

  XLSX.utils.book_append_sheet(wb, ws, `Kunjungan`)
  XLSX.writeFile(wb, `Rekap_Kunjungan_Perpus_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function exportExcelSirkulasi({
  topBooks,
  topStudents,
  periodeText,
}) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sheet 1: Buku Paling Sering Dipinjam
  const wsBooksData = []
  wsBooksData.push([`LAPORAN STATISTIK BUKU PERPUSTAKAAN`])
  wsBooksData.push([`Periode: ${periodeText}`])
  wsBooksData.push([])

  wsBooksData.push(['No', 'Judul Buku', 'Jumlah Peminjaman'])

  if (!topBooks || topBooks.length === 0) {
    wsBooksData.push(['-', 'Belum ada data peminjaman buku', '-'])
  } else {
    topBooks.forEach((b, i) => {
      wsBooksData.push([
        i + 1,
        b.judul,
        b.count
      ])
    })
  }

  const wsBooks = XLSX.utils.aoa_to_sheet(wsBooksData)
  wsBooks['!cols'] = [
    { wch: 5 },  // No
    { wch: 50 }, // Judul Buku
    { wch: 20 }, // Jumlah Peminjaman
  ]
  XLSX.utils.book_append_sheet(wb, wsBooks, `Statistik Buku`)

  // Sheet 2: Siswa Teraktif
  const wsStudentsData = []
  wsStudentsData.push([`LAPORAN STATISTIK PEMINJAM PERPUSTAKAAN`])
  wsStudentsData.push([`Periode: ${periodeText}`])
  wsStudentsData.push([])

  wsStudentsData.push(['No', 'Nama Siswa', 'Kelas', 'Jumlah Buku Dipinjam'])

  if (!topStudents || topStudents.length === 0) {
    wsStudentsData.push(['-', 'Belum ada data siswa meminjam', '-', '-'])
  } else {
    topStudents.forEach((s, i) => {
      wsStudentsData.push([
        i + 1,
        s.nama,
        s.kelas || '-',
        s.count
      ])
    })
  }

  const wsStudents = XLSX.utils.aoa_to_sheet(wsStudentsData)
  wsStudents['!cols'] = [
    { wch: 5 },  // No
    { wch: 35 }, // Nama Siswa
    { wch: 15 }, // Kelas
    { wch: 25 }, // Jumlah Peminjaman
  ]
  XLSX.utils.book_append_sheet(wb, wsStudents, `Siswa Teraktif`)

  XLSX.writeFile(wb, `Laporan_Statistik_Sirkulasi_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
