import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPdfKunjungan({
  topStudents,
  totalKunjungan,
  totalSiswaUnik,
  settings,
  periodeText = 'KESELURUHAN',
}) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width

  // ---------- KOP SURAT ----------
  if (settings?.nama_sekolah) {
    doc.setFont('times', 'bold')
    doc.setFontSize(14)
    doc.text(settings.nama_sekolah.toUpperCase(), pageWidth / 2, 15, { align: 'center' })
  }
  
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  
  if (settings?.alamat) {
    doc.text(settings.alamat, pageWidth / 2, 21, { align: 'center' })
  }
  
  const lineY = 28
  doc.setLineWidth(0.8)
  doc.line(15, lineY, pageWidth - 15, lineY)
  doc.setLineWidth(0.3)
  doc.line(15, lineY + 1.2, pageWidth - 15, lineY + 1.2)

  // ---------- JUDUL LAPORAN ----------
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('LAPORAN KUNJUNGAN PERPUSTAKAAN', pageWidth / 2, lineY + 10, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`PERIODE: ${periodeText.toUpperCase()}`, pageWidth / 2, lineY + 15, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, lineY + 21, { align: 'center' })

  let currentY = lineY + 30

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
