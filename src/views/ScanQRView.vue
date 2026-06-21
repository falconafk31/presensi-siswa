<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { CheckCircle2, XCircle, ScanLine, Clock, ArrowLeft } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const scannerRef = ref(null)
let html5QrcodeScanner = null

const scanning = ref(false)
const lastScanned = ref(null)
const recentScans = ref([]) // History of scans in this session

// Web Audio API untuk suara offline yang 100% andal
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

function playTone(frequency, duration, type = 'sine') {
  if (audioCtx.state === 'suspended') audioCtx.resume()
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()
  
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)
  
  // Fade out effect
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration)
  
  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  
  oscillator.start()
  oscillator.stop(audioCtx.currentTime + duration)
}

onMounted(() => {
  // Pancing AudioContext agar aktif dengan interaksi pertama (wajib untuk iOS/Chrome ketat)
  const unlockAudio = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume()
    document.removeEventListener('click', unlockAudio)
    document.removeEventListener('touchstart', unlockAudio)
  }
  document.addEventListener('click', unlockAudio)
  document.addEventListener('touchstart', unlockAudio)

  initScanner()
  fetchTodayHistory()
})

onUnmounted(() => {
  stopScanner()
})

function initScanner() {
  html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
      rememberLastUsedCamera: true
    },
    /* verbose= */ false
  )
  html5QrcodeScanner.render(onScanSuccess, onScanFailure)
  scanning.value = true
}

function stopScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear().catch(error => {
      console.error("Failed to clear html5QrcodeScanner. ", error)
    })
    scanning.value = false
  }
}

async function fetchTodayHistory() {
  try {
    const today = todayISO()
    const { data, error } = await supabase
      .from('library_visits')
      .select('created_at, student_nisn, students(nama, kelas)')
      .eq('tanggal', today)
      .order('created_at', { ascending: false })
      .limit(5)
      
    if (error) throw error
    
    if (data) {
      recentScans.value = data.map(v => ({
        success: true,
        time: new Date(v.created_at).getTime(),
        message: 'Kunjungan tercatat di database',
        student: {
          nama: v.students?.nama || 'Siswa',
          kelas: v.students?.kelas || '-',
          nisn: v.student_nisn
        }
      }))
    }
  } catch (err) {
    console.error('Gagal memuat riwayat:', err)
  }
}

let isProcessing = false

async function onScanSuccess(decodedText, decodedResult) {
  // Prevent double scanning the same code rapidly
  if (isProcessing) return
  
  if (lastScanned.value?.nisn === decodedText && (Date.now() - lastScanned.value.time) < 3000) {
    return // ignore same scan within 3 seconds
  }

  isProcessing = true
  
  try {
    // 1. Cari siswa berdasarkan NISN
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, nama, kelas, nisn')
      .eq('nisn', decodedText)
      .eq('active', true)
      .single()

    if (studentError || !student) {
      throw new Error('Siswa tidak ditemukan atau tidak aktif')
    }

    // 2. Cek apakah sudah absen hari ini
    const today = todayISO()
    const { data: existingVisit } = await supabase
      .from('library_visits')
      .select('id')
      .eq('student_nisn', decodedText)
      .eq('tanggal', today)
      .single()

    if (existingVisit) {
      // Sudah absen
      playError()
      const record = { success: false, student, time: Date.now(), message: 'Sudah berkunjung hari ini' }
      lastScanned.value = record
      addToHistory(record)
      toast.warning(`${student.nama} sudah tercatat hari ini`)
    } else {
      // 3. Catat kunjungan baru
      const { error: insertError } = await supabase
        .from('library_visits')
        .insert({
          student_nisn: decodedText,
          tanggal: today
        })
      
      if (insertError) throw insertError

      playSuccess()
      const record = { success: true, student, time: Date.now(), message: 'Kunjungan berhasil dicatat' }
      lastScanned.value = record
      addToHistory(record)
      toast.success(`${student.nama} berhasil absen perpus!`)
    }

  } catch (error) {
    console.error(error)
    playError()
    toast.error(error.message || 'Gagal memproses QR Code')
  } finally {
    setTimeout(() => {
      isProcessing = false
    }, 1500) // cooldown
  }
}

function onScanFailure(error) {
  // handle scan failure, usually better to ignore and keep scanning
  // console.warn(`Code scan error = ${error}`)
}

function addToHistory(record) {
  recentScans.value.unshift(record)
  if (recentScans.value.length > 5) {
    recentScans.value.pop()
  }
}

function playSuccess() {
  // Nada naik bahagia (Success)
  playTone(880, 0.1, 'sine')
  setTimeout(() => playTone(1760, 0.2, 'sine'), 100)
}

function playError() {
  // Nada rendah/buzz (Error)
  playTone(300, 0.3, 'sawtooth')
}

function formatTime(ms) {
  const d = new Date(ms)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`
}
</script>

<template>
  <div>
    <PageHeader title="Scan Kunjungan" subtitle="Gunakan kamera untuk memindai QR Code Kartu Pelajar">
      <template #actions>
        <button class="rounded-xl px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition flex items-center gap-2" @click="router.push({ name: 'kunjungan-perpus' })">
          <ArrowLeft class="w-4 h-4" /> Kembali
        </button>
        <button v-if="scanning" class="rounded-xl px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium text-sm transition flex items-center gap-2" @click="stopScanner">
          Matikan Kamera
        </button>
        <button v-else class="btn-primary flex items-center gap-2" @click="initScanner">
          <ScanLine class="w-4 h-4" /> Nyalakan Kamera
        </button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Scanner Column -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card p-4">
          <div class="min-h-[400px] md:min-h-0 md:aspect-video w-full bg-black rounded-xl overflow-hidden relative shadow-inner">
            <div id="qr-reader" class="w-full h-full"></div>
            
            <!-- Overlay when not scanning -->
            <div v-if="!scanning" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white backdrop-blur-sm z-10">
              <ScanLine class="w-16 h-16 mb-4 opacity-50" />
              <p class="font-medium text-lg">Kamera Nonaktif</p>
              <p class="text-sm text-gray-300 mt-1">Klik tombol di atas untuk menyalakan kamera</p>
            </div>
          </div>
          <div class="mt-4 text-center text-sm text-gray-500">
            Pastikan memberikan izin akses kamera (Allow Camera) pada browser Anda.
          </div>
        </div>
      </div>

      <!-- Result & History Column -->
      <div class="space-y-6">
        
        <!-- Last Scanned Result -->
        <div class="card p-0 overflow-hidden">
          <div class="bg-gray-50 p-4 border-b border-gray-100 font-medium text-sm flex items-center gap-2">
            Status Terakhir
          </div>
          <div class="p-6 text-center" v-if="!lastScanned">
            <ScanLine class="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p class="text-gray-500 text-sm">Menunggu scan QR Code...</p>
          </div>
          
          <div v-else class="p-6 text-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 v-if="lastScanned.success" class="w-16 h-16 mx-auto text-emerald-500 mb-4" />
            <XCircle v-else class="w-16 h-16 mx-auto text-rose-500 mb-4" />
            
            <h3 class="text-xl font-bold text-gray-800 mb-1">{{ lastScanned.student.nama }}</h3>
            <p class="text-gray-500 font-medium mb-3">Kelas {{ lastScanned.student.kelas || '-' }} • NISN: {{ lastScanned.student.nisn }}</p>
            
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" 
                 :class="lastScanned.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
              {{ lastScanned.message }}
            </div>
          </div>
        </div>

        <!-- Recent History -->
        <div class="card p-0 overflow-hidden">
          <div class="bg-gray-50 p-4 border-b border-gray-100 font-medium text-sm flex items-center gap-2">
            <Clock class="w-4 h-4 text-gray-400" /> Riwayat Scan Hari Ini
          </div>
          <div class="divide-y divide-gray-100">
            <div v-if="recentScans.length === 0" class="p-6 text-center text-sm text-gray-500">
              Belum ada riwayat
            </div>
            <div v-for="scan in recentScans" :key="scan.time" class="p-4 flex items-start gap-3 hover:bg-gray-50 transition">
              <CheckCircle2 v-if="scan.success" class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <XCircle v-else class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-800 truncate">{{ scan.student.nama }}</p>
                <p class="text-xs text-gray-500 truncate">{{ scan.message }}</p>
              </div>
              <div class="text-xs text-gray-400 font-medium shrink-0">
                {{ formatTime(scan.time) }}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style>
/* Override default styling dari html5-qrcode */
#qr-reader {
  border: none !important;
}

#qr-reader__scan_region {
  background-color: #000;
}

#qr-reader__dashboard_section_csr span {
  color: white !important;
  font-family: inherit;
}

#qr-reader__dashboard_section_csr button {
  background-color: #064e3b !important;
  color: white !important;
  border: none !important;
  padding: 8px 16px !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
  cursor: pointer;
  margin-top: 10px;
}

#qr-reader a {
  color: #fbbf24 !important;
}
</style>
