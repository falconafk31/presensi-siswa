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

export async function exportPdfPerpus({
  topBooks,
  topStudents,
  totalDipinjamBulanIni,
  totalSiswaPeminjam,
  settings,
  periodeText = 'KESELURUHAN',
}) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width

  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  const namaPerpus = settings?.nama_perpustakaan || 'MIN Blora'
  doc.text(`LAPORAN STATISTIK PERPUSTAKAAN ${namaPerpus.toUpperCase()}`, pageWidth / 2, 15, { align: 'center' })
  
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
  doc.text(`Total Buku Dipinjam Bulan Ini : ${totalDipinjamBulanIni || 0} Buku`, 15, currentY)
  doc.text(`Total Siswa Pernah Meminjam   : ${totalSiswaPeminjam || 0} Siswa`, 15, currentY + 6)
  
  currentY += 16

  // ---------- BUKU TERLARIS ----------
  doc.setFont('times', 'bold')
  doc.text('10 Buku Paling Sering Dipinjam', 15, currentY)
  currentY += 5

  const booksHead = [['Peringkat', 'Judul Buku', 'Jumlah Peminjaman']]
  const booksBody = topBooks.map((b, i) => [
    i + 1,
    b.judul,
    `${b.count} kali`
  ])

  if (!booksBody.length) booksBody.push(['-', 'Belum ada data peminjaman buku', '-'])

  autoTable(doc, {
    head: booksHead,
    body: booksBody,
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, halign: 'center', font: 'times' },
    bodyStyles: { font: 'times' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 40 }
    }
  })

  currentY = doc.lastAutoTable.finalY + 15

  // ---------- SISWA TERAKTIF ----------
  doc.setFont('times', 'bold')
  doc.text('10 Siswa Teraktif Membaca', 15, currentY)
  currentY += 5

  const studentsHead = [['Peringkat', 'Nama Siswa', 'Kelas', 'Jumlah Buku Dipinjam']]
  const studentsBody = topStudents.map((s, i) => [
    i + 1,
    s.nama,
    s.kelas || '-',
    `${s.count} buku`
  ])

  if (!studentsBody.length) studentsBody.push(['-', 'Belum ada data siswa meminjam', '-', '-'])

  autoTable(doc, {
    head: studentsHead,
    body: studentsBody,
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199], textColor: 255, halign: 'center', font: 'times' },
    bodyStyles: { font: 'times' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 20 },
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

  doc.save(`Laporan_Perpus_${new Date().toISOString().slice(0, 10)}.pdf`)
}
