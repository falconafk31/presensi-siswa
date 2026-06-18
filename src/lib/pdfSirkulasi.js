import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPdfSirkulasi(loans, title = 'Laporan Sirkulasi Perpustakaan') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageW / 2, 20, { align: 'center' })
  
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
