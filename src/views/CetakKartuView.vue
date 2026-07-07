<script setup>
import { ref, computed, onMounted } from 'vue'
import { Printer, ChevronDown, School, Download } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { toast } from 'vue-sonner'
import { useSettingsStore } from '@/stores/settings'
import PageHeader from '@/components/PageHeader.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import QRCodeVue from 'qrcode.vue'

const settingsStore = useSettingsStore()
const daftarKelas = computed(() => settingsStore.settings?.daftar_kelas || [])
const namaSekolah = computed(() => settingsStore.settings?.nama_sekolah || 'MIN Blora')

const selectedKelas = ref('')
const students = ref([])
const loading = ref(false)

const todayStr = computed(() => {
  const d = new Date()
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
})

async function loadStudents() {
  if (!selectedKelas.value) {
    students.value = []
    return
  }
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('kelas', selectedKelas.value)
      .eq('active', true)
      .order('nama')
    
    if (error) throw error
    students.value = data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const generating = ref(false)

async function handleDownloadPDF() {
  generating.value = true
  try {
    const cards = document.querySelectorAll('.id-card')
    if (!cards.length) return

    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    // Ambil logo utama ke base64 agar bisa dirender jsPDF
    let logoData = null;
    if (settingsStore.settings?.logo_url) {
      try {
        logoData = await new Promise((resolve) => {
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
          img.src = settingsStore.settings.logo_url
        })
      } catch (e) {
        console.warn('Gagal memuat logo untuk PDF', e)
      }
    }

    const xOffset = 15
    const yOffset = 25
    const cardWidth = 86
    const cardHeight = 54
    const marginX = 10
    const marginY = 10
    
    let currentCount = 0
    
    for (let i = 0; i < students.value.length; i++) {
      const s = students.value[i]
      const cardEl = cards[i]

      const col = currentCount % 2
      const row = Math.floor(currentCount / 2)
      
      const x = xOffset + (col * (cardWidth + marginX))
      const y = yOffset + (row * (cardHeight + marginY))

      // 1. Background Kartu (Putih, dengan Border)
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F')
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'D')

      // 2. Header (Hijau Emerald)
      pdf.setFillColor(5, 150, 105)
      pdf.roundedRect(x, y, cardWidth, 12, 2, 2, 'F')
      pdf.rect(x, y + 2, cardWidth, 10, 'F') // Tutup radius bagian bawah header

      // Logo
      if (logoData) {
        pdf.addImage(logoData, 'PNG', x + 3, y + 2, 8, 8)
        
        // Watermark transparan di tengah body
        try {
          pdf.setGState(new pdf.GState({ opacity: 0.05 }))
          pdf.addImage(logoData, 'PNG', x + (cardWidth - 25)/2, y + 18, 25, 25)
          pdf.setGState(new pdf.GState({ opacity: 1.0 })) // kembalikan normal
        } catch(e) {}
      }

      // Teks Header
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text('KARTU PERPUSTAKAAN', x + cardWidth / 2, y + 5.5, { align: 'center' })
      pdf.setFontSize(9)
      pdf.text(namaSekolah.value.toUpperCase(), x + cardWidth / 2, y + 9.5, { align: 'center' })

      // 3. Body Data
      pdf.setTextColor(30, 30, 30)
      let startY = y + 17
      
      const drawRow = (label, value, isBold) => {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(5.5) // sedikit dikecilkan agar rapi
        pdf.text(label, x + 4, startY)
        pdf.text(':', x + 25, startY)
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
        pdf.text(value || '-', x + 27, startY)
      }

      drawRow('Nama', s.nama.toUpperCase(), true)
      startY += 4.5
      drawRow('Tempat, Tgl. Lahir', getTTL(s.tempat_lahir, s.tanggal_lahir), false)
      startY += 4.5
      drawRow('Jenis Kelamin', s.jk === 'L' ? 'Laki-Laki' : 'Perempuan', false)
      startY += 4.5
      
      // NISM
      drawRow('NISM', s.nism || '-', true)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(4.5)
      pdf.setTextColor(120, 120, 120)
      pdf.text('(Nomor Induk Siswa Madrasah)', x + 27, startY + 2.5)
      pdf.setTextColor(30, 30, 30)
      startY += 5.5

      // NISN
      drawRow('NISN', s.nisn, true)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(4.5)
      pdf.setTextColor(120, 120, 120)
      pdf.text('(Nomor Induk Siswa Nasional)', x + 27, startY + 2.5)
      pdf.setTextColor(30, 30, 30)

      // 4. QR Code
      const qrCanvas = cardEl?.querySelector('canvas')
      if (qrCanvas) {
        const qrData = qrCanvas.toDataURL('image/png')
        pdf.addImage(qrData, 'PNG', x + 65, y + 20, 18, 18)
      }

      // 5. Footer
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.setTextColor(120, 120, 120)
      pdf.text(`* Kartu perpus aktif selama menjadi siswa di ${namaSekolah.value}.`, x + 3, y + cardHeight - 3)
      pdf.text(`Tanggal Cetak: ${todayStr.value}`, x + cardWidth - 3, y + cardHeight - 3, { align: 'right' })

      currentCount++
      if (currentCount === 8 && i < students.value.length - 1) {
        pdf.addPage()
        currentCount = 0
      }
    }
    
    pdf.save(`ID_Card_Kelas_${selectedKelas.value}.pdf`)
    toast.success('PDF berhasil di-download dalam format Vector')
  } catch (error) {
    console.error(error)
    toast.error('Gagal membuat PDF')
  } finally {
    generating.value = false
  }
}

function formatProper(text) {
  if (!text) return '-'
  return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function formatTanggalLahir(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function getTTL(tempat, tanggal) {
  const t = tempat ? formatProper(tempat) : '-'
  const d = tanggal ? formatTanggalLahir(tanggal) : '-'
  return `${t}, ${d}`
}
</script>

<template>
  <div>
    <!-- Tampilan Aplikasi (Tidak tercetak saat diprint) -->
    <div class="print:hidden">
      <PageHeader title="Kartu Anggota" subtitle="Cetak kartu keanggotaan berbasis QR Code (Generate PDF)">
        <template #actions>
          <button v-if="students.length > 0" class="btn-primary" @click="handleDownloadPDF" :disabled="generating">
            <Download v-if="!generating" class="h-4 w-4" />
            <span v-if="generating" class="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span>
            {{ generating ? 'Membuat PDF...' : 'Download PDF' }}
          </button>
        </template>
      </PageHeader>

      <div class="card mb-6 p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div class="flex-1 w-full relative">
          <select v-model="selectedKelas" class="input-field appearance-none w-full" @change="loadStudents">
            <option value="">-- Pilih Kelas --</option>
            <option v-for="k in daftarKelas" :key="k" :value="k">Kelas {{ k }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <p class="text-sm text-gray-500 w-full sm:w-auto">
          Menampilkan: <strong>{{ students.length }}</strong> siswa
        </p>
      </div>

      <SkeletonLoader v-if="loading" type="card" :rows="3" />
      
      <div v-else-if="!selectedKelas" class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p class="text-gray-500">Pilih kelas terlebih dahulu untuk melihat preview kartu.</p>
      </div>
      
      <div v-else-if="students.length === 0" class="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p class="text-gray-500">Tidak ada siswa aktif di kelas ini.</p>
      </div>
    </div>

    <!-- Tampilan Kertas Print (Disembunyikan di layar, muncul saat print) -->
    <div class="print-container" v-if="students.length > 0">
      <div class="id-card relative" v-for="s in students" :key="s.id">
        <!-- Header Kartu -->
        <div class="id-card-header absolute top-0 left-0 w-full h-[12mm] bg-[#059669] flex items-center justify-center text-white rounded-t-[2mm]">
          <div class="absolute left-[3mm] top-[2mm] w-[8mm] h-[8mm]">
            <img v-if="settingsStore.settings?.logo_url" :src="settingsStore.settings?.logo_url" alt="Logo" class="w-full h-full object-contain" />
            <School v-else class="w-full h-full text-white" />
          </div>
          <div class="text-center">
            <h2 class="text-[8pt] font-bold m-0 leading-tight">KARTU PERPUSTAKAAN</h2>
            <h1 class="text-[9pt] font-bold m-0 leading-tight mt-[1px]">{{ namaSekolah.toUpperCase() }}</h1>
          </div>
        </div>
        <!-- Tutup radius bawah header -->
        <div class="absolute top-[2mm] left-0 w-full h-[10mm] bg-[#059669] z-[-1]"></div>

        <!-- Body Kartu -->
        <div class="id-card-body absolute top-[12mm] left-0 w-full h-[42mm] overflow-hidden">
          <!-- Watermark Logo/Icon -->
          <div class="absolute left-[30.5mm] top-[6mm] w-[25mm] h-[25mm] opacity-5 pointer-events-none">
            <img v-if="settingsStore.settings?.logo_url" :src="settingsStore.settings?.logo_url" alt="Watermark" class="w-full h-full object-contain" />
            <School v-else class="w-full h-full text-black" />
          </div>

          <div class="data-area absolute left-0 top-[5mm] w-full text-[#1e1e1e]">
            <div class="data-row absolute left-[4mm] top-[0mm] flex w-full">
              <span class="text-[5.5pt] font-bold w-[21mm]">Nama</span>
              <span class="text-[5.5pt] font-bold absolute left-[21mm]">:</span>
              <span class="text-[5.5pt] font-bold absolute left-[23mm] leading-tight">{{ s.nama.toUpperCase() }}</span>
            </div>
            
            <div class="data-row absolute left-[4mm] top-[4.5mm] flex w-full">
              <span class="text-[5.5pt] font-bold w-[21mm]">Tempat, Tgl. Lahir</span>
              <span class="text-[5.5pt] font-bold absolute left-[21mm]">:</span>
              <span class="text-[5.5pt] absolute left-[23mm]">{{ getTTL(s.tempat_lahir, s.tanggal_lahir) }}</span>
            </div>
            
            <div class="data-row absolute left-[4mm] top-[9mm] flex w-full">
              <span class="text-[5.5pt] font-bold w-[21mm]">Jenis Kelamin</span>
              <span class="text-[5.5pt] font-bold absolute left-[21mm]">:</span>
              <span class="text-[5.5pt] absolute left-[23mm]">{{ s.jk === 'L' ? 'Laki-Laki' : 'Perempuan' }}</span>
            </div>
            
            <div class="data-row absolute left-[4mm] top-[13.5mm] flex w-full">
              <span class="text-[5.5pt] font-bold w-[21mm]">NISM</span>
              <span class="text-[5.5pt] font-bold absolute left-[21mm]">:</span>
              <div class="absolute left-[23mm] flex flex-col">
                <span class="text-[5.5pt] font-bold leading-none">{{ s.nism || '-' }}</span>
                <span class="text-[4.5pt] italic text-[#787878] mt-[1mm] leading-none">(Nomor Induk Siswa Madrasah)</span>
              </div>
            </div>
            
            <div class="data-row absolute left-[4mm] top-[19mm] flex w-full">
              <span class="text-[5.5pt] font-bold w-[21mm]">NISN</span>
              <span class="text-[5.5pt] font-bold absolute left-[21mm]">:</span>
              <div class="absolute left-[23mm] flex flex-col">
                <span class="text-[5.5pt] font-bold leading-none">{{ s.nisn }}</span>
                <span class="text-[4.5pt] italic text-[#787878] mt-[1mm] leading-none">(Nomor Induk Siswa Nasional)</span>
              </div>
            </div>
          </div>

          <div class="qr-area absolute left-[65mm] top-[8mm] w-[18mm] h-[18mm]">
            <!-- Peningkatan size sedikit agar tajam saat pdf -->
            <QRCodeVue :value="s.nisn" :size="68" level="M" />
          </div>
        </div>

        <!-- Footer Kartu -->
        <div class="id-card-footer absolute bottom-[1.5mm] left-0 w-full px-[3mm] flex justify-between items-end">
          <div class="text-[5pt] italic text-[#787878]">
            * Kartu perpus aktif selama menjadi siswa di {{ namaSekolah }}.
          </div>
          <div class="text-[5pt] italic text-[#787878] text-right">
            Tanggal Cetak: {{ todayStr }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pengaturan Preview di Layar Komputer */
.print-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

/* 
  Ukuran standar CR80 (ID Card) adalah 85.6 mm x 53.98 mm.
  Kita pakai 8.6cm x 5.4cm untuk mempermudah presisi cetak.
*/
.id-card {
  width: 86mm;
  height: 54mm;
  background-color: #ffffff;
  border: 0.3mm solid #c8c8c8;
  border-radius: 2mm;
  overflow: hidden;
  box-sizing: border-box;
  font-family: 'Helvetica', 'Arial', sans-serif;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  z-index: 10;
}

/* Override padding/margin bawaan tailwind jika mengganggu */
.id-card * {
  box-sizing: border-box;
}

/* Pengaturan Cetak Asli (Window.print) */
@media print {
  @page {
    margin: 1cm;
    size: A4 portrait;
  }

  body * {
    visibility: hidden;
  }

  .print-container, .print-container * {
    visibility: visible;
  }

  .print-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5cm;
    justify-items: center;
  }

  .id-card {
    box-shadow: none;
    break-inside: avoid;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>

