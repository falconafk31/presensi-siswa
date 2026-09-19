<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Save, Upload, Plus, X, CheckCircle2, Circle, GraduationCap, Trash2, AlertTriangle, Building2, CalendarDays, ArrowUpCircle, ShieldAlert, Database, FileDown } from 'lucide-vue-next'
import {
  AppPageHeader, AppCard, AppTabs, AppInput, AppSelect,
  AppModal, AppButton, AppAlert,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { useSettingsStore } from '@/stores/settings'
import { usePeriodStore } from '@/stores/period'

const settingsStore = useSettingsStore()
const periodStore = usePeriodStore()

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const form = ref({ nama_sekolah: '', alamat: '', kepala_sekolah: '', nip_kepala_sekolah: '', logo_url: '', daftar_kelas: [], kop_baris2: '', kop_baris3: '', kop_baris4: '', kop_baris5: '', nama_perpustakaan: 'MIN Blora', hari_libur_mingguan: [0, 6] })
const savingSettings = ref(false)
const uploading = ref(false)
const fileInput = ref(null)

const periods = ref([])
const showPeriodForm = ref(false)
const periodForm = ref({ tahun_ajaran: '', semester: 'Ganjil' })
const savingPeriod = ref(false)

const showKenaikan = ref(false)
const prosesKenaikan = ref(false)

const showResetAbsensi = ref(false)
const prosesResetAbsensi = ref(false)
const konfirmasiResetAbsensi = ref('')

const showResetLog = ref(false)
const prosesResetLog = ref(false)

const showResetPerpusKunjungan = ref(false)
const prosesResetPerpusKunjungan = ref(false)
const konfirmasiResetPerpusKunjungan = ref('')

const showResetPerpusPinjaman = ref(false)
const prosesResetPerpusPinjaman = ref(false)

const prosesBackup = ref(false)

const newKelas = ref('')

const activeSettingsTab = ref('identitas')
const settingsTabs = [
  { value: 'identitas', label: 'Identitas', icon: Building2 },
  { value: 'akademik', label: 'Akademik', icon: CalendarDays },
  { value: 'kenaikan', label: 'Kenaikan Kelas', icon: ArrowUpCircle },
  { value: 'pemeliharaan', label: 'Pemeliharaan', icon: ShieldAlert },
]

function addKelas() {
  const k = newKelas.value.trim().toUpperCase()
  if (k && !form.value.daftar_kelas.includes(k)) {
    form.value.daftar_kelas.push(k)
    form.value.daftar_kelas.sort((a,b) => a.localeCompare(b, undefined, {numeric: true}))
  }
  newKelas.value = ''
}

function removeKelas(k) {
  form.value.daftar_kelas = form.value.daftar_kelas.filter(x => x !== k)
}

function toggleHariLibur(index) {
  const libur = form.value.hari_libur_mingguan || []
  if (libur.includes(index)) {
    form.value.hari_libur_mingguan = libur.filter(h => h !== index)
  } else {
    form.value.hari_libur_mingguan = [...libur, index]
  }
}

async function loadSettings() {
  const s = await settingsStore.fetchSettings()
  if (s) {
    form.value = { ...form.value, ...s }
    if (!form.value.hari_libur_mingguan) form.value.hari_libur_mingguan = [0]
  }
}

async function loadPeriods() {
  const { data } = await supabase
    .from('academic_periods')
    .select('*')
    .order('tahun_ajaran', { ascending: false })
    .order('semester')
  periods.value = data || []
}

async function saveSettings() {
  savingSettings.value = true
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, ...form.value, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
    // Force refresh cache Pinia agar seluruh halaman (Dashboard, dll) langsung up-to-date tanpa F5
    await settingsStore.fetchSettings(true)
    await logActivity({ aksi: 'update_pengaturan', tabel_terkait: 'app_settings', record_id: '1' })
    toast.success('Identitas madrasah disimpan')
  } catch (e) {
    toast.error('Gagal: ' + e.message)
  } finally {
    savingSettings.value = false
  }
}

async function onLogoSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const ext = file.name.split('.').pop()
    const path = `logo/logo-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('assets').upload(path, file, { upsert: true })
    if (upErr) throw upErr
    const { data } = supabase.storage.from('assets').getPublicUrl(path)
    form.value.logo_url = data.publicUrl
    toast.success('Logo terunggah. Klik Simpan untuk menerapkan.')
  } catch (e) {
    toast.error('Gagal unggah: ' + e.message)
  } finally {
    uploading.value = false
  }
}


async function savePeriod() {
  if (!periodForm.value.tahun_ajaran.match(/^\d{4}\/\d{4}$/)) {
    toast.error('Format tahun ajaran: 2025/2026')
    return
  }
  savingPeriod.value = true
  try {
    const { error } = await supabase
      .from('academic_periods')
      .insert({ tahun_ajaran: periodForm.value.tahun_ajaran, semester: periodForm.value.semester, is_active: false })
    if (error) throw error
    toast.success('Periode ditambahkan')
    showPeriodForm.value = false
    periodForm.value = { tahun_ajaran: '', semester: 'Ganjil' }
    await loadPeriods()
  } catch (e) {
    toast.error('Gagal: ' + (e.message?.includes('duplicate') ? 'Periode sudah ada' : e.message))
  } finally {
    savingPeriod.value = false
  }
}

async function setActive(p) {
  try {
    // Nonaktifkan semua, lalu aktifkan yang dipilih (partial unique index menjaga konsistensi).
    const { error: offErr } = await supabase
      .from('academic_periods')
      .update({ is_active: false })
      .neq('id', p.id)
    if (offErr) throw offErr
    const { error } = await supabase.from('academic_periods').update({ is_active: true }).eq('id', p.id)
    if (error) throw error
    await periodStore.fetchActivePeriod()
    await loadPeriods()
    await logActivity({ aksi: 'set_periode_aktif', tabel_terkait: 'academic_periods', record_id: p.id, detail: { tahun_ajaran: p.tahun_ajaran, semester: p.semester } })
    toast.success(`Periode aktif: ${p.tahun_ajaran} ${p.semester}`)
  } catch (e) {
    toast.error('Gagal: ' + e.message)
  }
}

async function jalankanKenaikan() {
  prosesKenaikan.value = true
  try {
    const period = periodStore.activePeriod
    if (!period) throw new Error('Belum ada periode aktif')

    const { data: aktif, error } = await supabase
      .from('students')
      .select('id, nisn, nama, kelas')
      .eq('active', true)
      .eq('status', 'aktif')
    if (error) throw error

    // Ambil wali kelas per kelas untuk snapshot.
    const { data: guru } = await supabase.from('users').select('nama, kelas').in('role', ['Guru', 'Guru & Pustakawan'])
    const waliByKelas = {}
    for (const g of guru || []) if (g.kelas) waliByKelas[g.kelas] = g.nama

    const historyRows = []
    const lulusIds = []
    const updates = []

    for (const s of aktif) {
      let isLulus = false
      let isNaik = false
      let nextKelas = s.kelas

      if (s.kelas) {
        const match = s.kelas.match(/^(\d+)(.*)$/)
        if (match) {
          const num = Number(match[1])
          const suffix = match[2]
          if (num === 6) {
            isLulus = true
          } else {
            isNaik = true
            nextKelas = `${num + 1}${suffix}`
          }
        }
      }

      historyRows.push({
        student_nisn: s.nisn,
        tahun_ajaran: period.tahun_ajaran,
        kelas: s.kelas,
        wali_kelas: waliByKelas[s.kelas] || null,
        status: isLulus ? 'lulus' : (isNaik ? 'naik' : 'tetap'),
      })

      if (isLulus) {
        lulusIds.push(s.id)
      } else if (isNaik) {
        updates.push({ id: s.id, kelas: nextKelas })
      }
    }

    // Snapshot ke class_history (upsert untuk idempoten per tahun ajaran).
    if (historyRows.length) {
      const { error: hErr } = await supabase
        .from('class_history')
        .upsert(historyRows, { onConflict: 'student_nisn,tahun_ajaran' })
      if (hErr) throw hErr
    }

    // Promosi kelas 1..5 -> +1
    for (const u of updates) {
      const { error: uErr } = await supabase.from('students').update({ kelas: u.kelas }).eq('id', u.id)
      if (uErr) throw uErr
    }

    // Kelas 6 -> lulus + nonaktif
    if (lulusIds.length) {
      const { error: lErr } = await supabase
        .from('students')
        .update({ status: 'lulus', active: false })
        .in('id', lulusIds)
      if (lErr) throw lErr
    }

    await logActivity({
      aksi: 'kenaikan_kelas',
      tabel_terkait: 'students',
      detail: { tahun_ajaran: period.tahun_ajaran, naik: updates.length, lulus: lulusIds.length },
    })
    toast.success(`Kenaikan selesai: ${updates.length} naik, ${lulusIds.length} lulus`)
    showKenaikan.value = false
  } catch (e) {
    toast.error('Gagal: ' + e.message)
  } finally {
    prosesKenaikan.value = false
  }
}

async function jalankanResetAbsensi() {
  if (konfirmasiResetAbsensi.value !== 'HAPUS SEMUA') {
    toast.error('Ketik HAPUS SEMUA untuk konfirmasi')
    return
  }
  
  prosesResetAbsensi.value = true
  try {
    const { error } = await supabase.from('attendance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Trick to delete all rows
    if (error) throw error
    
    toast.success('Seluruh data absensi berhasil dihapus')
    await logActivity({ aksi: 'reset_data_absensi', tabel_terkait: 'attendance_logs' })
    showResetAbsensi.value = false
    konfirmasiResetAbsensi.value = ''
  } catch (e) {
    toast.error('Gagal menghapus data absensi: ' + e.message)
  } finally {
    prosesResetAbsensi.value = false
  }
}

async function jalankanResetLog() {
  prosesResetLog.value = true
  try {
    const { error } = await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Trick to delete all rows
    if (error) throw error
    
    toast.success('Seluruh log aktivitas berhasil dibersihkan')
    showResetLog.value = false
  } catch (e) {
    toast.error('Gagal membersihkan log: ' + e.message)
  } finally {
    prosesResetLog.value = false
  }
}

async function jalankanResetPerpusKunjungan() {
  prosesResetPerpusKunjungan.value = true
  try {
    const { error } = await supabase.from('library_visits').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    toast.success('Seluruh data kunjungan perpustakaan berhasil dihapus')
    await logActivity({ aksi: 'reset_data_kunjungan_perpus', tabel_terkait: 'library_visits' })
    showResetPerpusKunjungan.value = false
  } catch (e) {
    toast.error('Gagal menghapus kunjungan perpus: ' + e.message)
  } finally {
    prosesResetPerpusKunjungan.value = false
  }
}

async function jalankanResetPerpusPinjaman() {
  prosesResetPerpusPinjaman.value = true
  try {
    const { error } = await supabase.from('book_loans').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    
    // Status semua buku harus di reset ke tersedia (jika ada flag)
    // Dalam desain kita stok buku dan loan saling terhubung by query, jadi menghapus loan otomatis membuat buku tersedia lagi
    
    toast.success('Seluruh data riwayat peminjaman buku berhasil dihapus')
    await logActivity({ aksi: 'reset_data_pinjaman_perpus', tabel_terkait: 'book_loans' })
    showResetPerpusPinjaman.value = false
  } catch (e) {
    toast.error('Gagal reset: ' + e.message)
  } finally {
    prosesResetPerpusPinjaman.value = false
  }
}

async function jalankanBackup() {
  prosesBackup.value = true
  try {
    toast.info('Memproses backup, mohon tunggu...', { duration: 3000 })
    
    // Fetch all necessary data
    const [
      { data: siswa },
      { data: guru },
      { data: buku },
      { data: logs }
    ] = await Promise.all([
      supabase.from('students').select('*').order('kelas').order('nama'),
      supabase.from('users').select('*').order('role').order('nama'),
      supabase.from('books').select('*').order('judul'),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(1000)
    ])

    const xlsx = await import('xlsx')
    const wb = xlsx.utils.book_new()

    // Sheet Siswa
    if (siswa && siswa.length) {
      const ws = xlsx.utils.json_to_sheet(siswa.map(s => ({
        NISN: s.nisn, Nama: s.nama, JK: s.jk, Kelas: s.kelas,
        Status: s.status, Aktif: s.active, 'Tgl Masuk': s.tanggal_masuk
      })))
      xlsx.utils.book_append_sheet(wb, ws, 'Siswa')
    }

    // Sheet Guru
    if (guru && guru.length) {
      const ws = xlsx.utils.json_to_sheet(guru.map(g => ({
        Username: g.username, Nama: g.nama, Role: g.role, 
        NIP: g.nip, 'Wali Kelas': g.kelas
      })))
      xlsx.utils.book_append_sheet(wb, ws, 'Guru')
    }

    // Sheet Buku
    if (buku && buku.length) {
      const ws = xlsx.utils.json_to_sheet(buku.map(b => ({
        Judul: b.judul, Pengarang: b.pengarang, Penerbit: b.penerbit,
        Tahun: b.tahun_terbit, ISBN: b.isbn, Stok: b.stok, Kategori: b.kategori
      })))
      xlsx.utils.book_append_sheet(wb, ws, 'Buku')
    }

    // Sheet Log Aktivitas
    if (logs && logs.length) {
      const ws = xlsx.utils.json_to_sheet(logs.map(l => ({
        Waktu: new Date(l.created_at).toLocaleString('id-ID'),
        Aksi: l.aksi,
        Tabel: l.tabel_terkait,
        Keterangan: JSON.stringify(l.detail || {})
      })))
      xlsx.utils.book_append_sheet(wb, ws, 'Log Aktivitas')
    }

    const tgl = new Date().toISOString().split('T')[0]
    xlsx.writeFile(wb, `Backup_Presensi_MINBlora_${tgl}.xlsx`)
    
    await logActivity({ aksi: 'backup_database', tabel_terkait: 'all' })
    toast.success('Backup berhasil diunduh!')
  } catch (e) {
    toast.error('Gagal membuat backup: ' + e.message)
  } finally {
    prosesBackup.value = false
  }
}

onMounted(() => {
  loadSettings()
  loadPeriods()
  if (!periodStore.activePeriod) periodStore.fetchActivePeriod()
})
</script>

<template>
  <div class="page-stack">
    <AppPageHeader title="Pengaturan" subtitle="Identitas madrasah, tahun ajaran, dan kenaikan kelas" />

    <AppTabs v-model="activeSettingsTab" :options="settingsTabs" variant="chip" ariaLabel="Bagian pengaturan" />

    <!-- Tab: Identitas -->
    <div v-if="activeSettingsTab === 'identitas'" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Identitas Madrasah -->
      <AppCard title="Identitas Madrasah">
        <div class="mb-4 flex items-center gap-4">
          <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-50 ring-1 ring-primary-100">
            <img v-if="form.logo_url" :src="form.logo_url" class="h-full w-full object-contain" alt="Logo madrasah" />
            <span v-else class="text-xs text-slate-400">No Logo</span>
          </div>
          <div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onLogoSelected" />
            <AppButton variant="secondary" size="sm" :loading="uploading" @click="fileInput.click()">
              <template #icon><Upload class="h-4 w-4" aria-hidden="true" /></template>
              {{ uploading ? 'Mengunggah…' : 'Unggah Logo' }}
            </AppButton>
            <p class="mt-1.5 text-xs text-slate-400">PNG/JPG, rasio 1:1 disarankan.</p>
          </div>
        </div>

        <div class="space-y-3">
          <AppInput v-model="form.nama_sekolah" label="Nama Madrasah" />
          <AppInput v-model="form.alamat" label="Alamat" />
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AppInput v-model="form.kepala_sekolah" label="Kepala Madrasah" />
            <AppInput v-model="form.nip_kepala_sekolah" label="NIP Kepala" />
            <AppInput
              v-model="form.nama_perpustakaan"
              label="Nama Perpustakaan (Kustom)"
              placeholder="Contoh: BAITUL HIKMAH"
              class="sm:col-span-2"
            />
          </div>
        </div>
      </AppCard>

      <!-- Kop Surat PDF -->
      <AppCard title="Teks Kop Surat (PDF)" subtitle="Digunakan pada kop dokumen PDF">
        <div class="space-y-3">
          <AppInput label="Baris 1 (Otomatis)" value="KEMENTERIAN AGAMA REPUBLIK INDONESIA" disabled />
          <AppInput v-model="form.kop_baris2" label="Baris 2" placeholder="KANTOR KEMENTERIAN AGAMA KABUPATEN BLORA" />
          <AppInput v-model="form.kop_baris3" label="Baris 3" placeholder="MADRASAH IBTIDAIYAH NEGERI BLORA" />
          <AppInput v-model="form.kop_baris4" label="Baris 4" placeholder="Alamat: Jl. Pendidikan No. 1, Blora. Telp: (0296) 123456" />
          <AppInput v-model="form.kop_baris5" label="Baris 5 (Opsional / Website)" placeholder="Website: www.minblora.sch.id | Email: minblora@kemenag.go.id" />
        </div>
      </AppCard>

      <div class="flex justify-end pb-14 lg:col-span-2 lg:pb-2">
        <AppButton class="w-full sm:w-auto" :loading="savingSettings" @click="saveSettings">
          <template #icon><Save class="h-4 w-4" aria-hidden="true" /></template>
          {{ savingSettings ? 'Menyimpan…' : 'Simpan Identitas & Kop' }}
        </AppButton>
      </div>
    </div>

    <!-- Tab: Akademik -->
    <div v-else-if="activeSettingsTab === 'akademik'" class="flex flex-col gap-4">

      <AppCard title="Daftar Kelas">
        <div class="mb-3 flex gap-2">
          <AppInput v-model="newKelas" placeholder="Misal: 1A, 1B" aria-label="Nama kelas baru" class="flex-1" @keyup.enter="addKelas" />
          <AppButton class="shrink-0" @click="addKelas">
            <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
            Tambah
          </AppButton>
        </div>
        <ul class="flex flex-wrap gap-2" aria-label="Daftar kelas">
          <li v-for="k in form.daftar_kelas" :key="k">
            <span class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1.5 text-sm font-medium text-emerald-700">
              {{ k }}
              <button
                class="rounded-full p-1 text-emerald-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                :aria-label="`Hapus kelas ${k}`"
                @click="removeKelas(k)"
              >
                <X class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          </li>
          <li v-if="!form.daftar_kelas?.length" class="text-xs text-slate-400">Belum ada kelas.</li>
        </ul>
      </AppCard>

      <AppCard title="Tahun Ajaran & Semester">
        <template #actions>
          <AppButton size="sm" variant="secondary" @click="showPeriodForm = true">
            <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
            Tambah
          </AppButton>
        </template>
        <ul class="flex flex-col gap-2">
          <li v-for="p in periods" :key="p.id" class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5">
            <p class="text-sm font-medium text-slate-800">{{ p.tahun_ajaran }} <span class="text-slate-300">·</span> Semester {{ p.semester }}</p>
            <button
              class="inline-flex shrink-0 items-center gap-1.5 text-sm"
              :class="p.is_active ? 'font-semibold text-primary-700' : 'text-slate-400 hover:text-slate-600'"
              :aria-pressed="p.is_active ? 'true' : 'false'"
              @click="!p.is_active && setActive(p)"
            >
              <CheckCircle2 v-if="p.is_active" class="h-4 w-4" aria-hidden="true" />
              <Circle v-else class="h-4 w-4" aria-hidden="true" />
              {{ p.is_active ? 'Aktif' : 'Jadikan aktif' }}
            </button>
          </li>
          <li v-if="!periods.length" class="text-sm text-slate-400">Belum ada periode.</li>
        </ul>
      </AppCard>

      <AppCard title="Hari Libur Mingguan" subtitle="Ditandai merah di kalender dan rekapitulasi">
        <fieldset>
          <legend class="sr-only">Pilih hari libur mingguan</legend>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label
              v-for="(hari, idx) in NAMA_HARI"
              :key="idx"
              class="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors"
              :class="(form.hari_libur_mingguan || []).includes(idx)
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
            >
              <input
                type="checkbox"
                :checked="(form.hari_libur_mingguan || []).includes(idx)"
                class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                @change="toggleHariLibur(idx)"
              />
              <span class="font-medium">{{ hari }}</span>
            </label>
          </div>
        </fieldset>
      </AppCard>

      <div class="flex justify-end pb-14 lg:pb-2">
        <AppButton class="w-full sm:w-auto" :loading="savingSettings" @click="saveSettings">
          <template #icon><Save class="h-4 w-4" aria-hidden="true" /></template>
          {{ savingSettings ? 'Menyimpan…' : 'Simpan Pengaturan Akademik' }}
        </AppButton>
      </div>
    </div>

    <!-- Tab: Kenaikan Kelas -->
    <div v-else-if="activeSettingsTab === 'kenaikan'" class="flex flex-col gap-4">
      <AppCard tone="warning">
        <div class="flex items-start gap-3.5">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-light text-amber-700">
            <GraduationCap class="h-5 w-5" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-[15px] font-semibold text-slate-900">Kenaikan Kelas Otomatis</h3>
            <p class="mt-1 text-[13px] leading-relaxed text-slate-500">
              Menaikkan angka depan kelas seluruh siswa (misal 1A → 2A). Kelas berawalan 6 diluluskan &amp; dinonaktifkan.
              Snapshot riwayat kelas disimpan otomatis.
            </p>
            <AppButton variant="warning" size="sm" class="mt-3" @click="showKenaikan = true">
              <template #icon><GraduationCap class="h-4 w-4" aria-hidden="true" /></template>
              Proses Kenaikan
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Tab: Pemeliharaan -->
    <div v-else-if="activeSettingsTab === 'pemeliharaan'" class="flex flex-col gap-4">
      <AppCard title="Pencadangan Database" subtitle="Unduh seluruh data master (Siswa, Guru, Buku) dan Log Aktivitas dalam 1 file Excel multi-sheet. Disarankan tiap bulan.">
        <template #actions>
          <Database class="h-5 w-5 text-primary-600" aria-hidden="true" />
        </template>
        <AppButton :loading="prosesBackup" @click="jalankanBackup">
          <template #icon><FileDown class="h-4 w-4" aria-hidden="true" /></template>
          {{ prosesBackup ? 'Mengekstrak Data…' : 'Download Full Backup (Excel)' }}
        </AppButton>
      </AppCard>

      <AppCard title="Zona Berbahaya" subtitle="Tindakan di bawah ini tidak dapat dibatalkan." tone="danger">
        <template #actions>
          <AlertTriangle class="h-5 w-5 text-rose-500" aria-hidden="true" />
        </template>
        <ul class="flex flex-col gap-2.5">
          <li class="flex flex-col gap-2.5 rounded-xl border border-rose-100 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-800">Reset Data Absensi</p>
              <p class="mt-0.5 text-xs text-slate-500">Hapus permanen seluruh riwayat presensi siswa dari awal sampai akhir.</p>
            </div>
            <AppButton variant="danger-soft" size="sm" class="shrink-0 self-start sm:self-center" @click="showResetAbsensi = true">
              <template #icon><Trash2 class="h-3.5 w-3.5" aria-hidden="true" /></template>
              Hapus Absensi
            </AppButton>
          </li>
          <li class="flex flex-col gap-2.5 rounded-xl border border-rose-100 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-800">Bersihkan Log Aktivitas</p>
              <p class="mt-0.5 text-xs text-slate-500">Hapus riwayat aktivitas pengguna untuk menghemat ruang penyimpanan.</p>
            </div>
            <AppButton variant="danger-soft" size="sm" class="shrink-0 self-start sm:self-center" @click="showResetLog = true">
              <template #icon><Trash2 class="h-3.5 w-3.5" aria-hidden="true" /></template>
              Hapus Log
            </AppButton>
          </li>
          <li class="flex flex-col gap-2.5 rounded-xl border border-rose-100 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-800">Reset Data Kunjungan Perpustakaan</p>
              <p class="mt-0.5 text-xs text-slate-500">Hapus permanen seluruh riwayat buku tamu perpustakaan.</p>
            </div>
            <AppButton variant="danger-soft" size="sm" class="shrink-0 self-start sm:self-center" @click="showResetPerpusKunjungan = true">
              <template #icon><Trash2 class="h-3.5 w-3.5" aria-hidden="true" /></template>
              Hapus Kunjungan
            </AppButton>
          </li>
          <li class="flex flex-col gap-2.5 rounded-xl border border-rose-100 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-800">Reset Riwayat Peminjaman Buku</p>
              <p class="mt-0.5 text-xs text-slate-500">Hapus permanen seluruh riwayat sirkulasi peminjaman &amp; pengembalian buku.</p>
            </div>
            <AppButton variant="danger-soft" size="sm" class="shrink-0 self-start sm:self-center" @click="showResetPerpusPinjaman = true">
              <template #icon><Trash2 class="h-3.5 w-3.5" aria-hidden="true" /></template>
              Hapus Peminjaman
            </AppButton>
          </li>
        </ul>
      </AppCard>
    </div>

    <!-- Modals -->
    <AppModal v-model="showPeriodForm" title="Tambah Tahun Ajaran" max-width="max-w-md">
      <div class="flex flex-col gap-3">
        <AppInput v-model="periodForm.tahun_ajaran" label="Tahun Ajaran" placeholder="2025/2026" />
        <AppSelect v-model="periodForm.semester" label="Semester">
          <option value="Ganjil">Ganjil</option>
          <option value="Genap">Genap</option>
        </AppSelect>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showPeriodForm = false">Batal</AppButton>
        <AppButton :loading="savingPeriod" @click="savePeriod">Simpan</AppButton>
      </template>
    </AppModal>

    <AppModal v-model="showKenaikan" title="Konfirmasi Kenaikan Kelas" max-width="max-w-md">
      <div class="flex flex-col gap-3 text-sm text-slate-600">
        <p>Aksi ini akan — untuk periode aktif <strong class="text-slate-800">{{ periodStore.label }}</strong>:</p>
        <ul class="list-disc space-y-1 pl-5">
          <li>Menyimpan snapshot kelas semua siswa aktif ke <strong>Riwayat Kelas</strong>.</li>
          <li>Menaikkan angka kelas (misal: 1A → 2A, 2 → 3).</li>
          <li>Menandai siswa berkelas awalan 6 sebagai <strong>lulus</strong> &amp; nonaktif.</li>
        </ul>
        <AppAlert tone="warning" title="Jalankan sekali di akhir tahun ajaran">
          Pastikan periode aktif sudah benar sebelum melanjutkan.
        </AppAlert>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showKenaikan = false">Batal</AppButton>
        <AppButton variant="warning" :loading="prosesKenaikan" @click="jalankanKenaikan">
          <template #icon><GraduationCap class="h-4 w-4" aria-hidden="true" /></template>
          {{ prosesKenaikan ? 'Memproses…' : 'Ya, Proses' }}
        </AppButton>
      </template>
    </AppModal>

    <AppModal v-model="showResetAbsensi" title="Peringatan Keras!" max-width="max-w-md">
      <div class="flex flex-col gap-4">
        <AppAlert tone="danger" title="Anda akan MENGHAPUS SELURUH data presensi!">
          Tabel presensi akan dikosongkan dari awal aplikasi digunakan. Data yang dihapus tidak dapat dikembalikan.
        </AppAlert>
        <AppInput v-model="konfirmasiResetAbsensi" label="Ketik &quot;HAPUS SEMUA&quot; untuk konfirmasi" placeholder="HAPUS SEMUA" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showResetAbsensi = false">Batal</AppButton>
        <AppButton variant="danger" :loading="prosesResetAbsensi" :disabled="konfirmasiResetAbsensi !== 'HAPUS SEMUA'" @click="jalankanResetAbsensi">
          <template #icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
          {{ prosesResetAbsensi ? 'Menghapus…' : 'Ya, Hapus Permanen' }}
        </AppButton>
      </template>
    </AppModal>

    <AppModal v-model="showResetLog" title="Bersihkan Log Aktivitas" max-width="max-w-sm">
      <p class="text-sm leading-relaxed text-slate-600">
        Hapus seluruh rekaman log aktivitas aplikasi? Data master (siswa, guru, absensi, dll) tidak ikut terhapus.
      </p>
      <template #footer>
        <AppButton variant="secondary" @click="showResetLog = false">Batal</AppButton>
        <AppButton variant="danger" :loading="prosesResetLog" @click="jalankanResetLog">
          <template #icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
          {{ prosesResetLog ? 'Membersihkan…' : 'Bersihkan' }}
        </AppButton>
      </template>
    </AppModal>

    <AppModal v-model="showResetPerpusKunjungan" title="Reset Kunjungan Perpustakaan" max-width="max-w-sm">
      <p class="text-sm leading-relaxed text-slate-600">
        Anda akan menghapus SELURUH riwayat buku tamu perpustakaan. Lanjutkan?
      </p>
      <template #footer>
        <AppButton variant="secondary" @click="showResetPerpusKunjungan = false">Batal</AppButton>
        <AppButton variant="danger" :loading="prosesResetPerpusKunjungan" @click="jalankanResetPerpusKunjungan">
          <template #icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
          {{ prosesResetPerpusKunjungan ? 'Menghapus…' : 'Ya, Hapus' }}
        </AppButton>
      </template>
    </AppModal>

    <AppModal v-model="showResetPerpusPinjaman" title="Reset Sirkulasi Peminjaman" max-width="max-w-sm">
      <p class="text-sm leading-relaxed text-slate-600">
        Anda akan menghapus SELURUH riwayat peminjaman buku (termasuk yang sedang dipinjam).
        Buku terdampak otomatis kembali berstatus tersedia. Lanjutkan?
      </p>
      <template #footer>
        <AppButton variant="secondary" @click="showResetPerpusPinjaman = false">Batal</AppButton>
        <AppButton variant="danger" :loading="prosesResetPerpusPinjaman" @click="jalankanResetPerpusPinjaman">
          <template #icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
          {{ prosesResetPerpusPinjaman ? 'Menghapus…' : 'Ya, Hapus' }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
