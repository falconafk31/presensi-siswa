// Generator PDF Rekap Absensi dengan Kop Surat resmi.
// jsPDF & autotable di-import dinamis agar tidak menambah bundle awal.

import { namaBulan, dayName } from '@/lib/dates'

async function loadImageDataUrl(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    const maxSize = 200
    let { width, height } = bmp
    if (width > maxSize || height > maxSize) {
      if (width > height) {
        height = Math.round((height * maxSize) / width)
        width = maxSize
      } else {
        width = Math.round((width * maxSize) / height)
        height = maxSize
      }
    }
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bmp, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

export async function generateRekapPDF({
  settings,
  period,
  kelas,
  waliKelas,
  nipWaliKelas,
  year,
  month,
  days,
  students,
  matrix,
  summary,
  liburSet,
  submittedDatesSet,
}) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 8

  // ---------- KOP SURAT ----------
  if (settings?.logo_url) {
    const logoData = await loadImageDataUrl(settings.logo_url)
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, 9, 22, 22)
      } catch {
        /* abaikan logo gagal */
      }
    }
  }

  doc.setFont('times', 'bold')
  
  // Baris 1
  doc.setFontSize(14)
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageW / 2, 13, { align: 'center' })
  
  // Baris 2
  if (settings?.kop_baris2) {
    doc.setFontSize(12)
    doc.text(settings.kop_baris2.toUpperCase(), pageW / 2, 19, { align: 'center' })
  }
  
  // Baris 3
  if (settings?.kop_baris3) {
    doc.setFontSize(11)
    doc.text(settings.kop_baris3.toUpperCase(), pageW / 2, 24.5, { align: 'center' })
  }

  // Baris 4
  if (settings?.kop_baris4) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(settings.kop_baris4, pageW / 2, 29.5, { align: 'center' })
  }

  // Baris 5
  if (settings?.kop_baris5) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(settings.kop_baris5, pageW / 2, 33.5, { align: 'center' })
  }

  const hasBaris5 = !!settings?.kop_baris5
  const lineY = hasBaris5 ? 36.5 : 32.5
  
  // Garis bawah ganda (double border)
  doc.setLineWidth(0.8)
  doc.line(margin, lineY, pageW - margin, lineY)
  doc.setLineWidth(0.3)
  doc.line(margin, lineY + 1.2, pageW - margin, lineY + 1.2)

  // ---------- JUDUL ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('REKAPITULASI KEHADIRAN SISWA', pageW / 2, lineY + 8.5, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  const periodeText = period
    ? `Tahun Ajaran ${period.tahun_ajaran} - Semester ${period.semester}`
    : ''
  doc.text(
    `Kelas ${kelas}  |  Bulan ${namaBulan(month)} ${year}  ${periodeText ? '|  ' + periodeText : ''}`,
    pageW / 2,
    lineY + 14,
    { align: 'center' }
  )

  // ---------- TABEL MATRIKS ----------
  const head = [
    [
      { content: 'No', rowSpan: 1 },
      { content: 'NISN', rowSpan: 1 },
      { content: 'Nama Siswa', rowSpan: 1 },
      ...days.map((d) => ({ content: String(Number(d.slice(8, 10))) })),
      { content: 'H' },
      { content: 'I' },
      { content: 'S' },
      { content: 'A' },
      { content: '%H' },
      { content: '%I' },
      { content: '%S' },
      { content: '%A' },
    ],
  ]

  const body = students.map((s, i) => {
    const row = matrix[s.nisn] || {}
    const sum = summary[s.nisn] || { H: 0, I: 0, S: 0, A: 0, persen: 0 }
    return [
      i + 1,
      s.nisn,
      s.nama,
      ...days.map((d) => {
        if (liburSet.has(d)) return 'L'
        if (submittedDatesSet && !submittedDatesSet.has(d)) return '-'
        return row[d] || 'H'
      }),
      sum.H,
      sum.I,
      sum.S,
      sum.A,
      `${sum.persenH}%`,
      `${sum.persenI}%`,
      `${sum.persenS}%`,
      `${sum.persenA}%`,
    ]
  })

  const dayColCount = days.length
  const columnStyles = {
    0: { cellWidth: 6, halign: 'center' },
    1: { cellWidth: 16, halign: 'center' },
    2: { cellWidth: 47, halign: 'left', cellPadding: 1 },
  }
  
  // Tentukan warna kolom libur (Tanggal Merah)
  for (let i = 0; i < dayColCount; i++) {
    const isHoliday = liburSet.has(days[i])
    const isUnsubmitted = submittedDatesSet && !submittedDatesSet.has(days[i])
    
    columnStyles[3 + i] = { 
      cellWidth: 4.6, 
      halign: 'center',
      fillColor: isHoliday ? [255, 230, 230] : (isUnsubmitted ? [240, 240, 240] : undefined),
      textColor: isHoliday ? [200, 0, 0] : (isUnsubmitted ? [150, 150, 150] : undefined)
    }
  }
  const sumStart = 3 + dayColCount
  columnStyles[sumStart] = { cellWidth: 6, fontStyle: 'bold' }
  columnStyles[sumStart + 1] = { cellWidth: 6 }
  columnStyles[sumStart + 2] = { cellWidth: 6 }
  columnStyles[sumStart + 3] = { cellWidth: 6 }
  columnStyles[sumStart + 4] = { cellWidth: 9.5, fontStyle: 'bold' }
  columnStyles[sumStart + 5] = { cellWidth: 9.5 }
  columnStyles[sumStart + 6] = { cellWidth: 9.5 }
  columnStyles[sumStart + 7] = { cellWidth: 9.5 }

  autoTable(doc, {
    head,
    body,
    startY: lineY + 18.5,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, cellPadding: 0.8, lineColor: [120, 120, 120], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0] },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles,
  })

  // ---------- FOOTER REKAPITULASI HARI ----------
  let y = doc.lastAutoTable.finalY + 8
  const totalLibur = liburSet ? liburSet.size : 0
  const hadirEfektif = days.filter(d => !liburSet?.has(d) && submittedDatesSet?.has(d)).length
  
  doc.setFontSize(9)
  doc.setFont('times', 'bold')
  doc.text(`Total Hari Efektif Diabsen: ${hadirEfektif} Hari   |   Total Libur: ${totalLibur} Hari`, pageW / 2, y, { align: 'center' })
  
  doc.setFont('times', 'normal')
  doc.setFontSize(8)
  doc.text(`Keterangan: H = Hadir, I = Izin, S = Sakit, A = Alfa, L = Libur/Akhir Pekan, - = Belum Diabsen`, pageW / 2, y + 4, { align: 'center' })
  doc.text(`*Catatan: Persentase kehadiran diukur berdasarkan proporsi kehadiran terhadap hari efektif Kegiatan Belajar Mengajar (KBM).`, pageW / 2, y + 8, { align: 'center' })

  // ---------- TANDA TANGAN ----------
  y += 18
  const pageH = doc.internal.pageSize.getHeight()
  if (y > pageH - 40) {
    doc.addPage('a4', 'landscape')
    y = 25
  }

  const tglCetak = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const colKiri = margin + 25
  const colKanan = pageW - margin - 55

  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.text('Mengetahui,', colKiri, y, { align: 'center' })
  doc.text('Kepala Madrasah', colKiri, y + 5, { align: 'center' })

  doc.text(`Blora, ${tglCetak}`, colKanan, y, { align: 'center' })
  doc.text('Wali Kelas', colKanan, y + 5, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.text(settings?.kepala_sekolah || '_________________', colKiri, y + 30, { align: 'center' })
  doc.text(waliKelas || '_________________', colKanan, y + 30, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  if (settings?.nip_kepala_sekolah) {
    doc.text(`NIP. ${settings.nip_kepala_sekolah}`, colKiri, y + 35, { align: 'center' })
  }
  if (nipWaliKelas) {
    doc.text(`NIP. ${nipWaliKelas}`, colKanan, y + 35, { align: 'center' })
  }

  const fileName = `Rekap_Absensi_Kelas-${kelas}_${namaBulan(month)}_${year}.pdf`
  doc.save(fileName)
  return fileName
}
