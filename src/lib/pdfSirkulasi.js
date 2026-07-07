import { jsPDF } from 'jspdf'
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

export async function exportPdfSirkulasi(loans, settings, title = 'Laporan Sirkulasi') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

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

  // ---------- JUDUL LAPORAN ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  const namaPerpus = settings?.nama_perpustakaan || 'MIN Blora'
  doc.text(`${title.toUpperCase()} PERPUSTAKAAN ${namaPerpus.toUpperCase()}`, pageW / 2, lineY + 8.5, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('times', 'normal')
  const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Dicetak pada: ${dateStr}`, pageW / 2, lineY + 14, { align: 'center' })

  const tableData = loans.map((l, i) => [
    i + 1,
    l.tanggal_pinjam,
    l.students?.nama || '-',
    l.books?.judul || '-',
    l.tanggal_kembali_seharusnya,
    l.status === 'dikembalikan' ? `Dikembalikan (${l.tanggal_kembali_aktual})` : 'Dipinjam'
  ])

  autoTable(doc, {
    startY: lineY + 28,
    head: [['No', 'Tgl Pinjam', 'Peminjam', 'Judul Buku', 'Batas Kembali', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 60 },
      3: { cellWidth: 100 },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 40, halign: 'center' }
    }
  })

  doc.save('Laporan_Sirkulasi_Perpus.pdf')
}
