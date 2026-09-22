<script setup>
// Rekonstruksi Input Presensi (pola pengecualian, segmented H/I/S/A).
import { computed } from 'vue'
import { Save, Search, CheckCheck } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'
import { siswaPerKelas, presensiHariIni, DEMO_TODAY_LABEL } from '@/presentation/mock'
import { ATTENDANCE_STATUS } from '@/config/designSystem'

const props = defineProps({
  role: { type: String, default: 'guru' }, // guru (5A) | admin (5B preview)
})
const kelas = props.role === 'admin' ? '5B' : '5A'
const siswa = computed(() => siswaPerKelas[kelas])
const marked = presensiHariIni[kelas]

const statusOf = (nisn) => marked[nisn] || 'Hadir'
const ringkasan = computed(() => {
  const r = { Hadir: 0, Izin: 0, Sakit: 0, Alfa: 0 }
  for (const s of siswa.value) r[statusOf(s.nisn)]++
  return r
})

// Warna solid EXACT ATTENDANCE_COLORS (penting `!` — sama dengan AppSegmentedControl)
const activeTone = {
  Hadir: '!bg-emerald-700 !text-white !ring-1 !ring-inset !ring-emerald-700',
  Izin: '!bg-sky-700 !text-white !ring-1 !ring-inset !ring-sky-700',
  Sakit: '!bg-amber-600 !text-white !ring-1 !ring-inset !ring-amber-600',
  Alfa: '!bg-rose-700 !text-white !ring-1 !ring-inset !ring-rose-700',
}
const cardTone = {
  Hadir: '',
  Izin: '!border-sky-700/40 !bg-sky-50/60',
  Sakit: '!border-amber-600/40 !bg-amber-50/60',
  Alfa: '!border-rose-700/40 !bg-rose-50/60',
}
</script>

<template>
  <MockAppFrame
    active="presensi"
    :role="role"
    page-title="Input Presensi"
    :page-subtitle="`${DEMO_TODAY_LABEL} · Kelas ${kelas}`"
  >
    <template #actions>
      <span class="badge-warning"><span class="badge-dot" />Tersimpan</span>
    </template>

    <div class="flex h-full flex-col gap-2.5">
      <!-- filter bar -->
      <div class="card-flat grid grid-cols-3 gap-2.5 p-3">
        <div>
          <label class="input-label">Tanggal</label>
          <input class="input-field" type="text" value="22 September 2026" readonly />
        </div>
        <div>
          <label class="input-label">Kelas</label>
          <div class="flex items-center gap-2">
            <select class="input-field" :disabled="role === 'guru'">
              <option>Kelas {{ kelas }}</option>
              <option v-if="role === 'admin'">Kelas 5B</option>
              <option v-if="role === 'admin'">Kelas 6A</option>
            </select>
          </div>
        </div>
        <div>
          <label class="input-label">Cari siswa</label>
          <div class="input-with-icon relative">
            <Search class="leading-icon h-4 w-4" aria-hidden="true" />
            <input class="input-field pl-9" type="text" placeholder="Nama atau NISN…" />
          </div>
        </div>
      </div>

      <!-- alert sudah presensi -->
      <div class="alert-success !py-2.5">
        <p class="text-[13px]"><strong>Sudah presensi.</strong> Kelas {{ kelas }} sudah mengisi presensi pada tanggal ini. Perubahan akan menimpa data sebelumnya.</p>
      </div>

      <!-- bulk + ringkasan -->
      <div class="card-flat flex items-center gap-4 p-3">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="secondary mr-1 font-medium">Tandai semua:</span>
          <span v-for="s in ATTENDANCE_STATUS" :key="s.code" class="chip-tab">{{ s.code }}</span>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <CheckCheck class="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <p class="text-[13px] font-medium text-slate-600 tnum">
            H <span class="font-bold text-emerald-700">{{ ringkasan.Hadir }}</span>
            · I <span class="font-bold text-sky-700">{{ ringkasan.Izin }}</span>
            · S <span class="font-bold text-amber-600">{{ ringkasan.Sakit }}</span>
            · A <span class="font-bold text-rose-700">{{ ringkasan.Alfa }}</span>
          </p>
        </div>
      </div>

      <!-- daftar siswa -->
      <ol class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <li
          v-for="(s, i) in siswa.slice(0, 7)"
          :key="s.nisn"
          class="card-flat flex items-center justify-between gap-3 px-2.5 py-1"
          :class="cardTone[statusOf(s.nisn)]"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="hidden w-5 shrink-0 text-right text-xs text-slate-300 tnum sm:inline">{{ i + 1 }}</span>
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              :class="s.jk === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'"
            >{{ s.nama.charAt(0) }}</span>
            <div class="min-w-0">
              <p class="truncate text-[13px] font-medium leading-tight text-slate-900">{{ s.nama }}</p>
              <p class="truncate text-[11px] leading-tight text-slate-400 tnum">{{ s.nisn }} · {{ s.jk === 'L' ? 'L' : 'P' }}</p>
            </div>
          </div>
          <div class="segmented shrink-0 !gap-0.5 !p-0.5">
            <button
              v-for="st in ATTENDANCE_STATUS"
              type="button"
              class="!min-h-[1.75rem] !px-2 !py-1 !text-[12px]"
              :aria-pressed="statusOf(s.nisn) === st.code ? 'true' : 'false'"
              :class="statusOf(s.nisn) === st.code ? activeTone[st.code] : ''"
            >{{ st.code }}</button>
          </div>
        </li>
        <li class="py-0.5 text-center text-[11px] text-slate-400">
          … {{ siswa.length - 7 }} siswa lainnya (potongan demo dari {{ siswa.length }} siswa kelas {{ kelas }})
        </li>
      </ol>

      <!-- save bar -->
      <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-card">
        <p class="hidden text-[13px] text-slate-500 sm:block">Pastikan semua kehadiran sudah sesuai sebelum menyimpan.</p>
        <p class="text-[13px] font-medium text-slate-600 tnum sm:hidden">
          H {{ ringkasan.Hadir }} · I {{ ringkasan.Izin }} · S {{ ringkasan.Sakit }} · A {{ ringkasan.Alfa }}
        </p>
        <span class="btn-primary pointer-events-none">
          <Save class="h-5 w-5" aria-hidden="true" />
          Perbarui Presensi
        </span>
      </div>
    </div>
  </MockAppFrame>
</template>
