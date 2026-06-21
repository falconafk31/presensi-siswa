<script setup>
import { ref, computed, onMounted } from 'vue'
import { Printer, ChevronDown, School, Download } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { toast } from 'vue-sonner'
import { useSettingsStore } from '@/stores/settings'
import PageHeader from '@/components/PageHeader.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import QRCodeVue from 'qrcode.vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
        <div class="id-card-body">
          <div class="photo-area">
            <div class="photo-box">
              <span>Pas Foto<br>3x4</span>
            </div>
          </div>
          
          <div class="data-area">
            <table class="data-table">
              <tbody>
                <tr>
                  <td class="label">Nama</td>
                  <td class="separator">:</td>
                  <td class="value font-bold">{{ s.nama.toUpperCase() }}</td>
                </tr>
                <tr>
                  <td class="label">TTL</td>
                  <td class="separator">:</td>
                  <td class="value">{{ getTTL(s.tempat_lahir, s.tanggal_lahir) }}</td>
                </tr>
                <tr>
                  <td class="label">JK</td>
                  <td class="separator">:</td>
                  <td class="value">{{ s.jk === 'L' ? 'Laki-Laki' : 'Perempuan' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="flex-ids mt-1">
              <div class="id-box mb-1">
                <div class="id-number">NISM : {{ s.nism || '-' }}</div>
                <div class="id-desc">(Nomor Induk Siswa Madrasah)</div>
              </div>
              <div class="id-box">
                <div class="id-number">NISN : {{ s.nisn }}</div>
                <div class="id-desc">(Nomor Induk Siswa Nasional)</div>
              </div>
            </div>
          </div>

          <div class="qr-area">
            <QRCodeVue :value="s.nisn" :size="55" level="M" />
          </div>
        </div>

        <!-- Footer Kartu -->
        <div class="id-card-footer">
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
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: Arial, sans-serif;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  background-image: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="%23f0fdf4"/></pattern></defs><rect width="100%" height="100%" fill="url(%23dots)"/></svg>');
}

/* Header Kemenag Green (#064e3b) */
.id-card-header {
  height: 1.1cm;
  background-color: #064e3b;
  display: flex;
  align-items: center;
  padding: 0 0.2cm;
  color: white;
  border-bottom: 2px solid #fbbf24; /* Aksen Gold */
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
  font-size: 5pt;
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #fbbf24;
}

.header-text h1 {
  font-size: 7.5pt;
  margin: 0;
  font-weight: 800;
  line-height: 1;
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
  height: 0.4cm;
  background-color: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.2cm;
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
