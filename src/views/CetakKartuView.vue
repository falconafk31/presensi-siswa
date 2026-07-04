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

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])

    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const xOffset = 15
    const yOffset = 25
    const cardWidth = 86
    const cardHeight = 54
    const marginX = 10
    const marginY = 10
    
    let currentCount = 0
    
    for (let i = 0; i < cards.length; i++) {
      const canvas = await html2canvas(cards[i], { scale: 3, useCORS: true })
      // Optimasi: Gunakan JPEG (kualitas 80%) alih-alih PNG untuk menekan ukuran file drastis
      const imgData = canvas.toDataURL('image/jpeg', 0.8)
      
      const col = currentCount % 2
      const row = Math.floor(currentCount / 2)
      
      const x = xOffset + (col * (cardWidth + marginX))
      const y = yOffset + (row * (cardHeight + marginY))
      
      pdf.addImage(imgData, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST')
      
      currentCount++
      if (currentCount === 8 && i < cards.length - 1) {
        pdf.addPage()
        currentCount = 0
      }
    }
    
    pdf.save(`ID_Card_Kelas_${selectedKelas.value}.pdf`)
    toast.success('PDF berhasil di-download')
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
      <PageHeader title="Cetak ID Card" subtitle="Cetak kartu perpustakaan siswa berbasis QR Code (Generate PDF)">
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
      <div class="id-card" v-for="s in students" :key="s.id">
        <!-- Header Kartu -->
        <div class="id-card-header">
          <div class="logo-box">
            <img v-if="settingsStore.settings?.logo_url" :src="settingsStore.settings?.logo_url" alt="Logo" class="logo-img" />
            <School v-else class="h-5 w-5 text-emerald-800" />
          </div>
          <div class="header-text">
            <h2>KARTU PERPUSTAKAAN</h2>
            <h1>{{ namaSekolah.toUpperCase() }}</h1>
          </div>
        </div>

        <!-- Body Kartu -->
        <div class="id-card-body relative overflow-hidden">
          <!-- Watermark Logo/Icon -->
          <div class="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0">
            <img v-if="settingsStore.settings?.logo_url" :src="settingsStore.settings?.logo_url" alt="Watermark" class="w-28 h-28 object-contain grayscale" />
            <School v-else class="w-28 h-28" />
          </div>

          <div class="data-area flex-1 flex flex-col justify-center items-center mt-2 pr-12 w-full relative z-10">
            <table class="text-left w-auto mx-auto mb-2" style="border-spacing: 0 3px; border-collapse: separate;">
              <tbody>
                <tr>
                  <td class="text-[7.5pt] font-bold text-gray-900 text-right pr-1 align-top whitespace-nowrap">Nama</td>
                  <td class="text-[7.5pt] font-bold text-gray-900 px-1 align-top">:</td>
                  <td class="text-[7.5pt] font-bold text-gray-900 align-top leading-tight">{{ s.nama.toUpperCase() }}</td>
                </tr>
                <tr>
                  <td class="text-[5.5pt] font-bold text-gray-900 text-right pr-1 align-top whitespace-nowrap">Tempat, Tgl. Lahir</td>
                  <td class="text-[5.5pt] font-bold text-gray-900 px-1 align-top">:</td>
                  <td class="text-[5.5pt] text-gray-800 align-top">{{ getTTL(s.tempat_lahir, s.tanggal_lahir) }}</td>
                </tr>
                <tr>
                  <td class="text-[5.5pt] font-bold text-gray-900 text-right pr-1 align-top whitespace-nowrap">Jenis Kelamin</td>
                  <td class="text-[5.5pt] font-bold text-gray-900 px-1 align-top">:</td>
                  <td class="text-[5.5pt] text-gray-800 align-top">{{ s.jk === 'L' ? 'Laki-Laki' : 'Perempuan' }}</td>
                </tr>
                <tr>
                  <td class="text-[5.5pt] font-bold text-gray-900 text-right pr-1 align-top whitespace-nowrap">NISM</td>
                  <td class="text-[5.5pt] font-bold text-gray-900 px-1 align-top">:</td>
                  <td class="text-[5.5pt] text-gray-800 align-top">
                    <span class="font-bold">{{ s.nism || '-' }}</span>
                    <div class="text-[4pt] text-gray-500 italic mt-[1px]">(Nomor Induk Siswa Madrasah)</div>
                  </td>
                </tr>
                <tr>
                  <td class="text-[5.5pt] font-bold text-gray-900 text-right pr-1 align-top whitespace-nowrap">NISN</td>
                  <td class="text-[5.5pt] font-bold text-gray-900 px-1 align-top">:</td>
                  <td class="text-[5.5pt] text-gray-800 align-top">
                    <span class="font-bold">{{ s.nisn }}</span>
                    <div class="text-[4pt] text-gray-500 italic mt-[1px]">(Nomor Induk Siswa Nasional)</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="qr-area absolute right-3 top-1/2 -translate-y-1/2">
            <QRCodeVue :value="s.nisn" :size="50" level="M" />
          </div>
        </div>

        <!-- Footer Kartu -->
        <div class="id-card-footer absolute bottom-1 w-full flex justify-between px-2 items-end">
          <div class="footer-text">
            * Kartu perpus aktif selama menjadi siswa di {{ namaSekolah }}.
          </div>
          <div class="footer-date">
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
  width: 8.6cm;
  height: 5.4cm;
  background-color: #ffffff;
  /* Modern premium background: subtle wave + soft gradient */
  background-image: 
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23064e3b' fill-opacity='0.04' d='M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,149.3C672,139,768,149,864,170.7C960,192,1056,224,1152,218.7C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E"), 
    radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0) 40%),
    linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(240,253,244,0.6) 100%);
  background-position: bottom center;
  background-repeat: no-repeat;
  background-size: cover;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

/* Header Kemenag Green (#064e3b) - Modernized */
.id-card-header {
  height: 1.15cm;
  background: linear-gradient(135deg, #022c22 0%, #064e3b 40%, #047857 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 0.2cm;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);
  z-index: 20;
}

/* Gradient Gold Border for Header */
.id-card-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  background: linear-gradient(90deg, #d97706 0%, #fbbf24 50%, #fcd34d 100%);
}

/* Subtle Overlay Pattern */
.id-card-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('data:image/svg+xml;utf8,<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M0 20L20 0H10L0 10Z" fill="rgba(255,255,255,0.03)"/></svg>');
  background-size: 20px;
  opacity: 0.8;
  pointer-events: none;
}

.logo-box {
  width: 0.8cm;
  height: 0.8cm;
  background-color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 0.2cm;
  overflow: hidden;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-placeholder {
  font-size: 5pt;
  font-weight: bold;
  color: #064e3b;
}

.header-text {
  flex: 1;
}

.header-text h2 {
  font-size: 4.5pt;
  margin: 0;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #fde68a; /* Soft Gold */
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
}

.header-text h1 {
  font-size: 8pt;
  margin: 0;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: 0.2px;
  text-shadow: 0 2px 3px rgba(0,0,0,0.5);
}

/* Body Layout */
.id-card-body {
  flex: 1;
  display: flex;
  padding: 0.15cm 0.2cm;
  gap: 0.15cm;
}

.photo-area {
  width: 1.5cm;
}

.photo-box {
  width: 1.5cm;
  height: 2cm;
  border: 1px dashed #9ca3af;
  border-radius: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 5pt;
  color: #9ca3af;
  background-color: rgba(255,255,255,0.8);
}

.data-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table td {
  font-size: 5.5pt;
  padding: 1px 0;
  vertical-align: top;
  line-height: 1.2;
}

.data-table .label {
  width: 0.8cm;
  font-weight: 600;
}

.data-table .separator {
  width: 0.1cm;
}

.data-table .value {
  color: #1f2937;
}

/* NISM & NISN styling */
.flex-ids {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.id-box {
  line-height: 1.1;
}

.id-title {
  font-size: 5.5pt;
  font-weight: bold;
  display: inline-block;
  width: 0.8cm;
}

.id-desc {
  font-size: 4pt;
  color: #4b5563;
  font-style: italic;
  display: block;
  margin-top: 1px;
}

.id-number {
  font-size: 5.5pt;
  font-weight: bold;
  display: block;
}

.qr-area {
  width: 1.5cm;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Footer Layout */
.id-card-footer {
  /* Removed background color and borders to make it float */
}

.footer-text {
  font-size: 4.5pt;
  color: #4b5563;
}

.footer-date {
  font-size: 4pt;
  color: #6b7280;
  font-weight: 600;
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
