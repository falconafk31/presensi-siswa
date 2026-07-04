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

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const namaPerpus = settings?.nama_perpustakaan || 'MIN Blora'
  doc.text(`${title.toUpperCase()} PERPUSTAKAAN ${namaPerpus.toUpperCase()}`, pageW / 2, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Dicetak pada: ${dateStr}`, pageW / 2, 26, { align: 'center' })

  const tableData = loans.map((l, i) => [
    i + 1,
    l.tanggal_pinjam,
    l.students?.nama || '-',
    l.books?.judul || '-',
    l.tanggal_kembali_seharusnya,
    l.status === 'dikembalikan' ? `Dikembalikan (${l.tanggal_kembali_aktual})` : 'Dipinjam'
  ])

  autoTable(doc, {
    startY: 35,
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
