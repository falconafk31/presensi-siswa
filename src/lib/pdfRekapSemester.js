// Generator PDF Rekap Semester dengan Kop Surat resmi.

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

export async function generateRekapSemesterPDF({
  settings,
  kelas,
  waliKelas,
  nipWaliKelas,
  tahun,
  semester,
  students,
  summary,
}) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 9

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
  
  doc.setFontSize(14)
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageW / 2, 13, { align: 'center' })
  
  if (settings?.kop_baris2) {
    doc.setFontSize(12)
    doc.text(settings.kop_baris2.toUpperCase(), pageW / 2, 19, { align: 'center' })
  }
  
  if (settings?.kop_baris3) {
    doc.setFontSize(11)
    doc.text(settings.kop_baris3.toUpperCase(), pageW / 2, 24.5, { align: 'center' })
  }

  if (settings?.kop_baris4) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(settings.kop_baris4, pageW / 2, 29.5, { align: 'center' })
  }

  if (settings?.kop_baris5) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(settings.kop_baris5, pageW / 2, 33.5, { align: 'center' })
  }

  const hasBaris5 = !!settings?.kop_baris5
  const lineY = hasBaris5 ? 36.5 : 32.5
  
  doc.setLineWidth(0.8)
  doc.line(margin, lineY, pageW - margin, lineY)
  doc.setLineWidth(0.3)
  doc.line(margin, lineY + 1.2, pageW - margin, lineY + 1.2)

  // ---------- JUDUL ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('REKAPITULASI KEHADIRAN SISWA', pageW / 2, lineY + 10, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  
  doc.text(
    `Kelas: ${kelas}   |   Periode: ${semester}`,
    pageW / 2,
    lineY + 16,
    { align: 'center' }
  )

  // ---------- TABEL MATRIKS ----------
  const head = [
    [
      { content: 'No' },
      { content: 'NISN' },
      { content: 'Nama Siswa' },
      { content: 'Hadir' },
      { content: 'Izin' },
      { content: 'Sakit' },
      { content: 'Alfa' },
      { content: '%H' },
      { content: '%I' },
      { content: '%S' },
      { content: '%A' },
    ],
  ]

  const body = students.map((s, i) => {
    const sum = summary[s.nisn] || { H: 0, I: 0, S: 0, A: 0, persen: 0 }
    return [
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
      `${sum.persenA}%`,
    ]
  })

  autoTable(doc, {
    head,
    body,
    startY: lineY + 22,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'times', fontSize: 11, cellPadding: 1.5, lineColor: [120, 120, 120], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0] },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 52, halign: 'left', cellPadding: 1.5 },
      3: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 16, halign: 'center' },
      9: { cellWidth: 16, halign: 'center' },
      10: { cellWidth: 16, halign: 'center' },
    },
  })

  // ---------- TANDA TANGAN ----------
  let y = doc.lastAutoTable.finalY + 15
  const pageH = doc.internal.pageSize.getHeight()
  if (y > pageH - 40) {
    doc.addPage('a4', 'portrait')
    y = 25
  }

  const tglCetak = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const colKiri = margin + 25
  const colKanan = pageW - margin - 35

  doc.setFont('times', 'normal')
  doc.setFontSize(11)
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

  const fileName = `Rekap_Semester_${semester}_${tahun}_Kelas-${kelas}.pdf`
  doc.save(fileName)
  return fileName
}
