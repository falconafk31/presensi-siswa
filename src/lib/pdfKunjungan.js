import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export async function exportPdfKunjungan({
  topStudents,
  totalKunjungan,
  totalSiswaUnik,
  settings,
  periodeText = 'KESELURUHAN',
}) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width

  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  const namaPerpus = settings?.nama_perpustakaan || 'MIN Blora'
  doc.text(`LAPORAN KUNJUNGAN PERPUSTAKAAN ${namaPerpus.toUpperCase()}`, pageWidth / 2, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  doc.text(`PERIODE: ${periodeText.toUpperCase()}`, pageWidth / 2, 21, { align: 'center' })
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 26, { align: 'center' })
  
  const lineY = 30
  doc.setLineWidth(0.5)
  doc.line(15, lineY, pageWidth - 15, lineY)

  let currentY = lineY + 10

  // ---------- SUMMARY BLOCK ----------
  doc.setFont('times', 'bold')
  doc.text(`Total Kunjungan       : ${totalKunjungan || 0} Kali Kunjungan`, 15, currentY)
  doc.text(`Siswa Unik Berkunjung : ${totalSiswaUnik || 0} Anak`, 15, currentY + 6)
  
  currentY += 16

  // ---------- DAFTAR PENGUNJUNG ----------
  doc.setFont('times', 'bold')
  doc.text('Rekapitulasi Kunjungan Siswa', 15, currentY)
  currentY += 5

  const studentsHead = [['No', 'Nama Siswa', 'Kelas', 'Jumlah Kunjungan']]
  const studentsBody = topStudents.map((s, i) => [
    i + 1,
    s.nama,
    s.kelas || '-',
    `${s.count} kali`
  ])

  if (!studentsBody.length) studentsBody.push(['-', 'Belum ada data kunjungan pada periode ini', '-', '-'])

  autoTable(doc, {
    head: studentsHead,
    body: studentsBody,
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, halign: 'center', font: 'times' },
    bodyStyles: { font: 'times' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 40 }
    }
  })

  // Tanda Tangan
  currentY = doc.lastAutoTable.finalY + 20
  if (currentY > 250) {
    doc.addPage()
    currentY = 20
  }

  const tempatTanggal = `Blora, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
  doc.setFont('times', 'normal')
  doc.text(tempatTanggal, pageWidth - 15, currentY, { align: 'right' })
  doc.text('Petugas Perpustakaan / Admin', pageWidth - 15, currentY + 6, { align: 'right' })
  
  doc.text('_____________________________', pageWidth - 15, currentY + 30, { align: 'right' })

  doc.save(`Laporan_Kunjungan_Perpus_${new Date().toISOString().slice(0, 10)}.pdf`)
}
