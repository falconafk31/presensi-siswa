<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { CheckCircle2, XCircle, ScanLine, Clock, ArrowLeft } from 'lucide-vue-next'
import {
  AppPageHeader, AppCard, AppBadge, AppEmptyState, AppButton,
} from '@/components/ui'
import { useRouter } from 'vue-router'

const router = useRouter()
const scannerRef = ref(null)
let html5QrcodeScanner = null

const scanning = ref(false)
const lastScanned = ref(null)
const recentScans = ref([]) // History of scans in this session

let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function playTone(frequency, duration, type = 'sine') {
  const ctx = getAudioCtx()
  if (ctx.state === 'suspended') ctx.resume()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  
  // Fade out effect
  gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration)
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.start()
  oscillator.stop(ctx.currentTime + duration)
}

let wakeLock = null
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock dilepas')
      })
      console.log('Wake Lock aktif')
    } catch (err) {
      console.error(`Wake Lock error: ${err.name}, ${err.message}`)
    }
  }
}
function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release()
    wakeLock = null
  }
}

const handleVisibilityChange = async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock()
  }
}

onMounted(() => {
  // Pancing AudioContext agar aktif dengan interaksi pertama (wajib untuk iOS/Chrome ketat)
  const unlockAudio = () => {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    document.removeEventListener('click', unlockAudio)
    document.removeEventListener('touchstart', unlockAudio)
  }
  document.addEventListener('click', unlockAudio)
  document.addEventListener('touchstart', unlockAudio)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  initScanner()
  fetchTodayHistory()
  requestWakeLock()
})

onUnmounted(() => {
  stopScanner()
  releaseWakeLock()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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
  <div class="page-stack">
    <AppPageHeader title="Scan Kunjungan" subtitle="Pindai QR Code pada kartu pelajar dengan kamera">
      <template #actions>
        <AppButton variant="secondary" size="sm" @click="router.push({ name: 'kunjungan-perpus' })">
          <template #icon><ArrowLeft class="h-4 w-4" aria-hidden="true" /></template>
          Kembali
        </AppButton>
        <AppButton v-if="scanning" variant="danger-soft" size="sm" @click="stopScanner">
          Matikan Kamera
        </AppButton>
        <AppButton v-else variant="library" size="sm" @click="initScanner">
          <template #icon><ScanLine class="h-4 w-4" aria-hidden="true" /></template>
          Nyalakan Kamera
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Scanner — fokus utama halaman -->
      <AppCard class="lg:col-span-2" title="Kamera Scanner" subtitle="Arahkan QR Code ke dalam bingkai">
        <div class="relative min-h-[380px] w-full overflow-hidden rounded-xl bg-slate-950 sm:min-h-[420px]">
          <div id="qr-reader" class="h-full w-full" />

          <div v-if="!scanning" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/85 px-4 text-center text-white">
            <ScanLine class="mb-3 h-14 w-14 opacity-40" aria-hidden="true" />
            <p class="text-[15px] font-semibold">Kamera nonaktif</p>
            <p class="mt-1 text-[13px] text-slate-300">Nyalakan kamera untuk mulai memindai</p>
            <AppButton variant="library" size="sm" class="mt-4" @click="initScanner">
              <template #icon><ScanLine class="h-4 w-4" aria-hidden="true" /></template>
              Nyalakan Kamera
            </AppButton>
          </div>
        </div>
        <p class="mt-3 text-center text-[13px] text-slate-400">
          Izinkan akses kamera (Allow Camera) pada browser agar scanner berfungsi.
        </p>
      </AppCard>

      <div class="flex flex-col gap-4">
        <!-- Status terakhir -->
        <AppCard title="Status Terakhir" :padded="true">
          <div v-if="!lastScanned" class="py-4 text-center">
            <ScanLine class="mx-auto mb-2 h-10 w-10 text-slate-200" aria-hidden="true" />
            <p class="text-sm text-slate-400">Menunggu scan QR Code…</p>
          </div>
          <div v-else class="py-2 text-center" aria-live="polite">
            <CheckCircle2 v-if="lastScanned.success" class="mx-auto mb-3 h-14 w-14 text-emerald-500" aria-hidden="true" />
            <XCircle v-else class="mx-auto mb-3 h-14 w-14 text-rose-500" aria-hidden="true" />
            <h3 class="text-lg font-bold text-slate-900">{{ lastScanned.student.nama }}</h3>
            <p class="mb-3 text-[13px] text-slate-500 tnum">Kelas {{ lastScanned.student.kelas || '–' }} · {{ lastScanned.student.nisn }}</p>
            <AppBadge :label="lastScanned.message" :tone="lastScanned.success ? 'success' : 'danger'" />
          </div>
        </AppCard>

        <!-- Riwayat -->
        <AppCard title="Riwayat Hari Ini" :subtitle="`${recentScans.length} pindaian`" :padded="false">
          <AppEmptyState
            v-if="recentScans.length === 0"
            title="Belum ada riwayat"
            description="Hasil pindaian hari ini akan tercatat di sini."
            :icon="Clock"
          />
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="scan in recentScans" :key="scan.time" class="flex items-start gap-3 p-3.5">
              <CheckCircle2 v-if="scan.success" class="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
              <XCircle v-else class="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-800">{{ scan.student.nama }}</p>
                <p class="truncate text-xs text-slate-400">{{ scan.message }}</p>
              </div>
              <span class="shrink-0 text-xs font-medium text-slate-400 tnum">{{ formatTime(scan.time) }}</span>
            </li>
          </ul>
        </AppCard>
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
