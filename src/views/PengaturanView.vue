<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Save, Upload, Plus, CheckCircle2, Circle, GraduationCap, Loader2 } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activityLog'
import { useSettingsStore } from '@/stores/settings'
import { usePeriodStore } from '@/stores/period'

const settingsStore = useSettingsStore()
const periodStore = usePeriodStore()

const form = ref({ nama_sekolah: '', alamat: '', kepala_sekolah: '', nip_kepala_sekolah: '', logo_url: '', daftar_kelas: [], kop_baris2: '', kop_baris3: '', kop_baris4: '', kop_baris5: '' })
const savingSettings = ref(false)
const uploading = ref(false)
const fileInput = ref(null)

const periods = ref([])
const showPeriodForm = ref(false)
const periodForm = ref({ tahun_ajaran: '', semester: 'Ganjil' })
const savingPeriod = ref(false)

const showKenaikan = ref(false)
const prosesKenaikan = ref(false)

const newKelas = ref('')

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

async function loadSettings() {
  const s = await settingsStore.fetchSettings()
  if (s) form.value = { ...form.value, ...s }
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
    await settingsStore.fetchSettings()
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
    const { data: guru } = await supabase.from('users').select('nama, kelas').eq('role', 'Guru')
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

onMounted(() => {
  loadSettings()
  loadPeriods()
  if (!periodStore.activePeriod) periodStore.fetchActivePeriod()
})
</script>

<template>
  <div>
    <PageHeader title="Pengaturan" subtitle="Identitas madrasah, tahun ajaran, dan kenaikan kelas" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Identitas Madrasah -->
      <div class="card">
        <h3 class="mb-4 text-sm font-semibold text-gray-700">Identitas Madrasah</h3>
        <div class="mb-4 flex items-center gap-4">
          <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary-accent">
            <img v-if="form.logo_url" :src="form.logo_url" class="h-full w-full object-contain" alt="Logo" />
            <span v-else class="text-xs text-gray-400">No Logo</span>
          </div>
          <div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onLogoSelected" />
            <button class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50" :disabled="uploading" @click="fileInput.click()">
              <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
              <Upload v-else class="h-4 w-4" />
              {{ uploading ? 'Mengunggah...' : 'Unggah Logo' }}
            </button>
            <p class="mt-1 text-xs text-gray-400">PNG/JPG, rasio 1:1 disarankan.</p>
          </div>
        </div>
        

        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Nama Madrasah</label>
            <input v-model="form.nama_sekolah" class="input-field" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">Alamat</label>
            <input v-model="form.alamat" class="input-field" />
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Kepala Madrasah</label>
              <input v-model="form.kepala_sekolah" class="input-field" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">NIP Kepala</label>
              <input v-model="form.nip_kepala_sekolah" class="input-field" />
            </div>
          </div>
          <button class="btn-primary w-full" :disabled="savingSettings" @click="saveSettings">
            <Save class="h-4 w-4" /> {{ savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan' }}
          </button>
        </div>
      </div>

      <!-- Kop Surat PDF & Daftar Kelas -->
      <div class="space-y-4">
        <div class="card">
          <h3 class="mb-3 text-sm font-semibold text-gray-700">Teks Kop Surat (PDF)</h3>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-[11px] font-medium text-gray-500">Baris 1 (Otomatis)</label>
              <input class="input-field bg-gray-50 text-gray-400" value="KEMENTERIAN AGAMA REPUBLIK INDONESIA" disabled />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Baris 2</label>
              <input v-model="form.kop_baris2" class="input-field" placeholder="KANTOR KEMENTERIAN AGAMA KABUPATEN BLORA" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Baris 3</label>
              <input v-model="form.kop_baris3" class="input-field" placeholder="MADRASAH IBTIDAIYAH NEGERI BLORA" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Baris 4</label>
              <input v-model="form.kop_baris4" class="input-field" placeholder="Alamat: Jl. Pendidikan No. 1, Blora. Telp: (0296) 123456" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Baris 5 (Opsional)</label>
              <input v-model="form.kop_baris5" class="input-field" placeholder="Website: www.minblora.sch.id | Email: minblora@kemenag.go.id" />
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="mb-3 text-sm font-semibold text-gray-700">Daftar Kelas</h3>
          <div class="mb-3 flex gap-2">
            <input v-model="newKelas" @keyup.enter="addKelas" class="input-field" placeholder="Misal: 1A, 1B" />
            <button class="btn-primary shrink-0" @click="addKelas"><Plus class="h-4 w-4" /> Tambah</button>
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-for="k in form.daftar_kelas" :key="k" class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 border border-emerald-200">
              {{ k }}
              <button class="text-emerald-400 hover:text-emerald-600" @click="removeKelas(k)">&times;</button>
            </span>
            <span v-if="!form.daftar_kelas?.length" class="text-xs text-gray-400">Belum ada kelas.</span>
          </div>
        </div>
      </div>

      <!-- Tahun Ajaran + Kenaikan -->
      <div class="space-y-4 lg:col-span-2">
        <div class="card">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-700">Tahun Ajaran & Semester</h3>
            <button class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50" @click="showPeriodForm = true">
              <Plus class="h-3.5 w-3.5" /> Tambah
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="p in periods" :key="p.id" class="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <div>
                <p class="text-sm font-medium text-gray-800">{{ p.tahun_ajaran }} <span class="text-gray-400">·</span> {{ p.semester }}</p>
              </div>
              <button
                class="inline-flex items-center gap-1.5 text-sm"
                :class="p.is_active ? 'font-semibold text-primary' : 'text-gray-400 hover:text-gray-600'"
                @click="!p.is_active && setActive(p)"
              >
                <CheckCircle2 v-if="p.is_active" class="h-4 w-4" />
                <Circle v-else class="h-4 w-4" />
                {{ p.is_active ? 'Aktif' : 'Jadikan aktif' }}
              </button>
            </div>
            <p v-if="!periods.length" class="text-sm text-gray-400">Belum ada periode.</p>
          </div>
        </div>

        <div class="card border border-amber-200 bg-amber-50/40">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-amber-700">
              <GraduationCap class="h-5 w-5" />
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-semibold text-gray-800">Kenaikan Kelas Otomatis</h3>
              <p class="mt-0.5 text-xs text-gray-500">
                Promosikan semua siswa (angka depan kelas ditambah 1, misal 1A → 2A). Kelas berawalan 6 → lulus & nonaktif. Snapshot riwayat kelas akan disimpan.
              </p>
              <button class="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600" @click="showKenaikan = true">
                <GraduationCap class="h-4 w-4" /> Proses Kenaikan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal tambah periode -->
    <BaseModal v-model="showPeriodForm" title="Tambah Tahun Ajaran" max-width="max-w-md">
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Tahun Ajaran</label>
          <input v-model="periodForm.tahun_ajaran" class="input-field" placeholder="2025/2026" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Semester</label>
          <select v-model="periodForm.semester" class="input-field">
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showPeriodForm = false">Batal</button>
        <button class="btn-primary" :disabled="savingPeriod" @click="savePeriod">Simpan</button>
      </template>
    </BaseModal>

    <!-- Modal konfirmasi kenaikan -->
    <BaseModal v-model="showKenaikan" title="Konfirmasi Kenaikan Kelas" max-width="max-w-md">
      <div class="space-y-2 text-sm text-gray-600">
        <p>Aksi ini akan, untuk periode aktif <strong>{{ periodStore.label }}</strong>:</p>
        <ul class="list-disc space-y-1 pl-5">
          <li>Menyimpan snapshot kelas semua siswa aktif ke <strong>Riwayat Kelas</strong>.</li>
          <li>Menaikkan angka kelas (misal: 1A menjadi 2A, 2 menjadi 3).</li>
          <li>Menandai siswa berkelas awalan 6 sebagai <strong>lulus</strong> & nonaktif.</li>
        </ul>
        <p class="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
          Pastikan periode aktif sudah benar sebelum melanjutkan. Aksi ini sebaiknya dijalankan sekali di akhir tahun ajaran.
        </p>
      </div>
      <template #footer>
        <button class="rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" @click="showKenaikan = false">Batal</button>
        <button class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600" :disabled="prosesKenaikan" @click="jalankanKenaikan">
          <Loader2 v-if="prosesKenaikan" class="h-4 w-4 animate-spin" />
          <GraduationCap v-else class="h-4 w-4" />
          {{ prosesKenaikan ? 'Memproses...' : 'Ya, Proses' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
