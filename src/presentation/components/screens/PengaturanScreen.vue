<script setup>
// Rekonstruksi Pengaturan (tab Identitas).
import { Building2, CalendarDays, ArrowUpCircle, ShieldAlert, Upload } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { school } from '@/presentation/mock'

const tabs = [
  { label: 'Identitas', icon: Building2, active: true },
  { label: 'Akademik', icon: CalendarDays },
  { label: 'Kenaikan Kelas', icon: ArrowUpCircle },
  { label: 'Pemeliharaan', icon: ShieldAlert },
]
</script>

<template>
  <MockAppFrame active="pengaturan" role="admin" page-title="Pengaturan" page-subtitle="Identitas madrasah, tahun ajaran, dan kenaikan kelas">
    <div class="flex h-full flex-col gap-3">
      <!-- tabs -->
      <div class="tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.label"
          role="tab"
          class="tab-btn inline-flex items-center gap-1.5"
          :aria-selected="t.active ? 'true' : 'false'"
        >
          <component :is="t.icon" class="h-4 w-4" aria-hidden="true" />
          {{ t.label }}
        </button>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-hidden">
        <!-- identitas -->
        <section class="card-flat p-4">
          <h3 class="card-title">Identitas Madrasah</h3>
          <p class="secondary mt-0.5">Tampil di kop & login</p>
          <div class="mt-3 grid grid-cols-2 gap-2.5">
            <div class="col-span-2">
              <label class="input-label">Nama Madrasah</label>
              <input class="input-field" type="text" :value="school.nama_sekolah" readonly />
            </div>
            <div class="col-span-2">
              <label class="input-label">Teks Kop Surat (PDF) — baris2</label>
              <input class="input-field" type="text" :value="school.kop[1]" readonly />
            </div>
            <div>
              <label class="input-label">Tahun Ajaran</label>
              <input class="input-field tnum" type="text" value="2026/2027" readonly />
            </div>
            <div>
              <label class="input-label">Semester</label>
              <input class="input-field" type="text" value="Ganjil" readonly />
            </div>
          </div>
          <span class="btn-primary mt-3 !py-1.5 !text-xs"><Upload class="h-3.5 w-3.5" />Simpan Identitas</span>
        </section>

        <!-- daftar kelas -->
        <section class="card-flat p-4">
          <h3 class="card-title">Daftar Kelas</h3>
          <p class="secondary mt-0.5">Kelas aktif untuk presensi (demo:3 kelas)</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="k in school.daftar_kelas" :key="k" class="badge-primary !px-3 !py-1 !text-sm">Kelas {{ k }}</span>
            <span class="chip-tab">+ Tambah kelas</span>
          </div>
          <div class="mt-4 border-t border-slate-100 pt-3">
            <h4 class="text-[13px] font-semibold text-slate-700">Hari Libur Mingguan</h4>
            <p class="secondary mt-0.5">Ditandai merah di kalender & rekap</p>
            <div class="mt-2 flex gap-2">
              <span v-for="d in ['Sen','Sel','Rab','Kam','Jum','Sab','Min']" :key="d"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold"
                :class="d === 'Sab' || d === 'Min' ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'"
              >{{ d }}</span>
            </div>
          </div>
        </section>

        <!-- periode aktif -->
        <section class="card-flat p-4">
          <h3 class="card-title">Tahun Ajaran & Semester</h3>
          <p class="secondary mt-0.5">Periode aktif ditampilkan di header</p>
          <div class="mt-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5 text-[13px] text-primary-800">
            Periode aktif: <strong>2026/2027 — Ganjil</strong> · berlaku s.d 31 Des2026
          </div>
        </section>

        <!-- pemeliharaan -->
        <section class="card-flat p-4">
          <h3 class="card-title">Pencadangan Database</h3>
          <p class="secondary mt-0.5">Unduh seluruh master + log dalam1 file Excel multi-sheet</p>
          <span class="btn-secondary mt-3 !py-1.5 !text-xs"><Upload class="h-3.5 w-3.5" />Unduh Cadangan</span>
          <p class="mt-3 border-t border-slate-100 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-rose-500">Zona berbahaya</p>
          <p class="text-[12px] text-slate-500">Reset data presensi / log — memerlukan konfirmasi ganda.</p>
        </section>
      </div>
    </div>
  </MockAppFrame>
</template>
