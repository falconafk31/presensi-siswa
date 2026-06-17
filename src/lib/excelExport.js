import * as XLSX from 'xlsx'
import { namaBulan } from '@/lib/dates'

export function exportExcelBulanan({
  kelas,
  year,
  month,
  days,
  students,
  matrix,
  summary,
  liburSet,
  submittedDatesSet,
}) {
  const wsData = []

  // Header 1: Title
  wsData.push([`REKAPITULASI KEHADIRAN SISWA KELAS ${kelas}`])
  wsData.push([`Bulan: ${namaBulan(month)} ${year}`])
  wsData.push([])

  // Header Table
  const headRow = ['No', 'NISN', 'Nama Siswa']
  days.forEach(d => headRow.push(String(Number(d.slice(8, 10)))))
  headRow.push('Hadir', 'Izin', 'Sakit', 'Alfa', '% Hadir')
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
    const sum = summary[s.nisn] || { H: 0, I: 0, S: 0, A: 0, persen: 0 }
    row.push(sum.H, sum.I, sum.S, sum.A, `${sum.persen}%`)
    wsData.push(row)
  })

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
    { wch: 10 }, // %
  ]

  XLSX.utils.book_append_sheet(wb, ws, `Rekap ${namaBulan(month)}`)
  XLSX.writeFile(wb, `Rekap_Absensi_Kelas-${kelas}_${namaBulan(month)}_${year}.xlsx`)
}

export function exportExcelSemester({
  kelas,
  semesterText,
  students,
  summary,
}) {
  const wsData = []

  wsData.push([`REKAPITULASI KEHADIRAN SEMESTER KELAS ${kelas}`])
  wsData.push([`Periode: ${semesterText}`])
  wsData.push([])

  const headRow = ['No', 'NISN', 'Nama Siswa', 'Hadir', 'Izin', 'Sakit', 'Alfa', '% Hadir']
  wsData.push(headRow)

  students.forEach((s, i) => {
    const sum = summary[s.nisn] || { H: 0, I: 0, S: 0, A: 0, persen: 0 }
    wsData.push([
      i + 1,
      s.nisn,
      s.nama,
      sum.H,
      sum.I,
      sum.S,
      sum.A,
      `${sum.persen}%`
    ])
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  ws['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 35 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, `Rekap Semester`)
  XLSX.writeFile(wb, `Rekap_Semester_Kelas-${kelas}.xlsx`)
}
