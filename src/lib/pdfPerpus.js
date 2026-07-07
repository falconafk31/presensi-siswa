import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function loadImageDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 300
      let w = img.width || maxSize
      let h = img.height || maxSize
      if (w > maxSize || h > maxSize) {
        if (w > h) {
          h = Math.round((h * maxSize) / w)
          w = maxSize
        } else {
          w = Math.round((w * maxSize) / h)
          h = maxSize
        }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
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

  const margin = 15
  
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
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, 13, { align: 'center' })
  
  // Baris 2
  if (settings?.kop_baris2) {
    doc.setFontSize(12)
    doc.text(settings.kop_baris2.toUpperCase(), pageWidth / 2, 19, { align: 'center' })
  }
  
  // Baris 3
  if (settings?.kop_baris3) {
    doc.setFontSize(11)
    doc.text(settings.kop_baris3.toUpperCase(), pageWidth / 2, 24.5, { align: 'center' })
  }

  // Baris 4
  if (settings?.kop_baris4) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(settings.kop_baris4, pageWidth / 2, 29.5, { align: 'center' })
  }

  // Baris 5
  if (settings?.kop_baris5) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(settings.kop_baris5, pageWidth / 2, 33.5, { align: 'center' })
  }

  const hasBaris5 = !!settings?.kop_baris5
  const lineY = hasBaris5 ? 36.5 : 32.5
  
  // Garis bawah ganda (double border)
  doc.setLineWidth(0.8)
  doc.line(margin, lineY, pageWidth - margin, lineY)
  doc.setLineWidth(0.3)
  doc.line(margin, lineY + 1.2, pageWidth - margin, lineY + 1.2)

  // ---------- JUDUL LAPORAN ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  const namaPerpus = settings?.nama_perpustakaan || 'MIN Blora'
  doc.text(`LAPORAN STATISTIK PERPUSTAKAAN ${namaPerpus.toUpperCase()}`, pageWidth / 2, lineY + 8.5, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  doc.text(`PERIODE: ${periodeText.toUpperCase()}`, pageWidth / 2, lineY + 14, { align: 'center' })
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, lineY + 19, { align: 'center' })

  let currentY = lineY + 28

  // ---------- SUMMARY BLOCK ----------
  doc.setFont('times', 'bold')
  doc.text(`Total Buku Dipinjam Bulan Ini : ${totalDipinjamBulanIni || 0} Buku`, 15, currentY)
  doc.text(`Total Siswa Pernah Meminjam   : ${totalSiswaPeminjam || 0} Siswa`, 15, currentY + 6)
  
  currentY += 16

  // ---------- BUKU TERLARIS ----------
  doc.setFont('times', 'bold')
  doc.text('Daftar Buku Paling Sering Dipinjam', 15, currentY)
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
  doc.text('Daftar Siswa Teraktif Membaca', 15, currentY)
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
