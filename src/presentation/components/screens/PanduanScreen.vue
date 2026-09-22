<script setup>
// Rekonstruksi Panduan Penggunaan (tab per peran) — bantuan dalam aplikasi.
import { CheckCircle2, Book, ShieldCheck } from 'lucide-vue-next'
import MockAppFrame from './MockAppFrame.vue'

const props = defineProps({ role: { type: String, default: 'guru' } })

const activeTab = props.role === 'admin' ? 'admin' : props.role === 'pustakawan' ? 'perpus' : 'guru'
const tabs = [
  { value: 'guru', label: 'Guru & Wali Kelas' },
  { value: 'perpus', label: 'Pustakawan' },
  { value: 'admin', label: 'Administrator' },
]
const content = {
  guru: {
    icon: CheckCircle2,
    title: 'Alur Presensi Harian',
    steps: [
      'Buka menu Input Presensi.',
      'Tanyakan: "Siapa yang tidak masuk hari ini?"',
      'Klik status (Izin / Sakit / Alfa) hanya pada yang tidak masuk.',
      'Klik Simpan Presensi. Selesai!',
    ],
    note: 'Anda hanya dapat mengisi presensi kelas yang ditugaskan.',
  },
  perpus: {
    icon: Book,
    title: 'Sirkulasi & Kunjungan',
    steps: [
      'Katalog Buku → tambah judul + jumlah stok.',
      'Kunjungan harian → pilih siswa, atau Scanner QR.',
      'Sirkulasi → Tambah Peminjaman (stok berkurang otomatis).',
      'Pengembalian → Kembalikan (stok kembali otomatis).',
    ],
    note: 'Kartu anggota: pilih kelas → Download PDF (Ctrl+P).',
  },
  admin: {
    icon: ShieldCheck,
    title: 'Kenaikan Kelas & Impor Excel',
    steps: [
      'Pengaturan → tab Kenaikan Kelas → Proses (sekali setahun).',
      'Kelas naik otomatis; kelas6 ditandai Lulus.',
      'Upload Excel untuk impor massal siswa/guru (pakai template).',
      'Log Aktivitas = audit trail semua perubahan.',
    ],
    note: 'Kenaikan kelas TIDAK dapat dibatalkan — jalankan di akhir Genap.',
  },
}
const c = content[activeTab]
</script>

<template>
  <MockAppFrame active="panduan" :role="role" page-title="Panduan Penggunaan" page-subtitle="Pusat bantuan untuk setiap peran di madrasah">
    <div class="flex h-full flex-col gap-3">
      <div class="tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.value"
          role="tab"
          class="tab-btn"
          :aria-selected="t.value === activeTab ? 'true' : 'false'"
        >{{ t.label }}</button>
      </div>

      <section class="card-flat p-4">
        <h3 class="flex items-center gap-2 text-[15px] font-bold text-slate-900">
          <component :is="c.icon" class="h-5 w-5 text-primary-600" aria-hidden="true" />
          {{ c.title }}
        </h3>
        <p class="mt-1.5 text-sm leading-relaxed text-slate-600">Panduan ringkas langkah demi langkah untuk peran aktif.</p>
        <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-sm font-medium text-slate-700">
          <li v-for="s in c.steps" :key="s">{{ s }}</li>
        </ol>
        <div class="alert-info mt-3 !py-2.5">
          <p class="text-[13px]">{{ c.note }}</p>
        </div>
      </section>

      <section class="card-flat p-4">
        <h3 class="card-title">Masalah umum?</h3>
        <div class="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="mb-1 text-[13px] font-bold text-slate-800">Layar blank / putih</p>
            <p class="text-[13px]">Menu profil → Refresh App (clear cache), atau hapus cache site di browser.</p>
          </div>
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="mb-1 text-[13px] font-bold text-slate-800">Login menggantung</p>
            <p class="text-[13px]">Tunggu panel muncul → tombol Pulihkan Sesi (aman di jaringan jelek).</p>
          </div>
        </div>
      </section>

      <section class="card-flat mx-auto w-full max-w-xl text-center">
        <h3 class="text-base font-bold text-slate-900">Tutorial Interaktif</h3>
        <p class="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Buka <strong>/tutorial</strong> untuk dokumentasi visual lengkap & mode presentasi16:9.
        </p>
      </section>
    </div>
  </MockAppFrame>
</template>
