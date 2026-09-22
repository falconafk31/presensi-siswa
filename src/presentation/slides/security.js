/** SECTION5 — SECURITY / SESSION · SECTION6 — END-TO-END FLOW. */

export const securitySlides = [
  {
    id: 'security-divider',
    section: 'security',
    role: 'all',
    layout: 'divider',
    sectionNo: 5,
    title: 'Keamanan & Sesi',
    description: 'Bagaimana aplikasi menjaga data — tanpa pernah menampilkan kredensial.',
    sectionItems: [
      'Login',
      'Session',
      'Role & Permission',
      'Protected Route',
      'Logout',
      'Recovery Session',
    ],
  },
  {
    id: 'security-login-session',
    section: 'security',
    role: 'all',
    layout: 'lanes',
    kicker: 'Keamanan ·01',
    title: 'Login & Session',
    description: 'Satu sesi aman per perangkat: login → profil tersimpan → navigasi dilindungi.',
    lanes: [
      {
        title: 'Login',
        items: [
          'Form username + password',
          'Dipetakan ke email internal madrasah',
          'Auth provider menangani verifikasi',
          'Gagal → pesan umum (tanpa detail akun)',
        ],
      },
      {
        title: 'Session',
        items: [
          'Sesi tersimpan di perangkat (persist)',
          'Profil & role di-cache lokal → boot cepat',
          'Refresh token ditangani otomatis',
          'Tutup browser? sesi tetap sampai logout',
        ],
      },
      {
        title: 'Profil',
        items: [
          'Ambil baris profil by auth id',
          'Role + kelas wali menentukan menu',
          'Nama tampil di header/sidebar',
          'Cache diperbarui bila profil berubah',
        ],
      },
    ],
    watchouts: [
      'Tutorial ini TIDAK pernah menampilkan token, password, atau API key apa pun.',
    ],
  },
  {
    id: 'security-roles',
    section: 'security',
    role: 'all',
    layout: 'lanes',
    kicker: 'Keamanan ·02',
    title: 'Role & Permission',
    description: 'Matriks akses sederhana namun tegas — frontend memfilter menu, server tetap berdaulat.',
    lanes: [
      {
        title: 'Admin',
        items: [
          'Semua menu presensi',
          'Master data & pengaturan',
          'Monitoring seluruh kelas',
          'Modul perpustakaan juga terbuka',
        ],
      },
      {
        title: 'Guru',
        items: [
          'Presensi kelas binaan saja',
          'Rekap & statistik kelas sendiri',
          'Kalender baca-saja',
          'Tidak ada menu admin',
        ],
      },
      {
        title: 'Pustakawan',
        items: [
          'Koleksi, sirkulasi, kunjungan',
          'Kartu anggota & laporan',
          'Tidak ada akses presensi siswa',
          'Gabungan "Guru & Pustakawan" didukung',
        ],
      },
    ],
    watchouts: [
      'Row-Level Security (RLS) di database menegakkan aturan yang sama di sisi server.',
    ],
  },
  {
    id: 'security-routes',
    section: 'security',
    role: 'all',
    layout: 'flow',
    kicker: 'Keamanan ·03',
    title: 'Protected Route',
    description: 'Setiap navigasi melewati guard berlapis sebelum view dirender.',
    flow: [
      { label: 'Navigasi', sub: 'klik menu' },
      { label: 'Router Guard', sub: 'beforeEach' },
      { label: 'Cek Session', sub: 'authenticated?' },
      { label: 'Cek Role', sub: 'admin/perpus/presensi' },
      { label: 'Render View', sub: 'atau redirect' },
    ],
    bullets: [
      'Belum login → dialihkan ke /login?redirect=<tujuan>.',
      'Role tidak cocok → kembali ke dashboard yang sah.',
      '/login sudah masuk? → langsung ke dashboard sesuai role.',
      '/tutorial & /tutorial/presentation: publik, tanpa login.',
      'Guard frontend = kenyamanan; otorisasi sesungguhnya = RLS server.',
    ],
  },
  {
    id: 'security-logout-recovery',
    section: 'security',
    role: 'all',
    layout: 'grid',
    kicker: 'Keamanan ·04',
    title: 'Logout & Recovery Session',
    description: 'Keluar bersih dari perangkat, atau pulihkan saat login menggantung.',
    cards: [
      { title: 'Logout', body: 'Menu profil kanan atas → Keluar. Sesi ditutup, cache profil dihapus, redirect ke /login.', icon: 'logout' },
      { title: 'Cache profile', body: 'Hanya data profil lokal yang dibersihkan — bukan seluruh storage browser.', icon: 'shield' },
      { title: 'Pulihkan Sesi', body: 'Muncul otomatis bila login >12 detik. Membersihkan sesi lokal lalu reload — aman di jaringan jelek.', icon: 'refresh' },
      { title: 'Refresh App', body: 'Tombol di menu profil: unregister service worker + hapus cache aset, lalu muat ulang.', icon: 'refresh' },
    ],
    watchouts: [
      'Recovery TIDAK mengirim/reset password — hanya memulihkan state sesi lokal.',
    ],
  },
  {
    id: 'security-hygiene',
    section: 'security',
    role: 'all',
    layout: 'bullets',
    kicker: 'Keamanan ·05',
    title: 'Prinsip Kebersihan Data',
    description: 'Kebijakan yang dipegang aplikasi (dan tutorial ini).',
    bullets: [
      'Kredensial tidak pernah ditampilkan di UI mana pun.',
      'Anon key Supabase bersifat publik-terproteksi RLS — bukan rahasia admin.',
      'Log aktivitas mencatat aksi penting (audit trail).',
      'Zona berbahaya pengaturan memerlukan konfirmasi ganda.',
      'Data demo tutorial bersifat fiktif & lokal — tidak pernah masuk database.',
      'Jangan simpan password akun madrasah di browser bersama.',
      'Gunakan akun berbeda untuk Admin & Pustakawan bila orangnya berbeda.',
      'Cetak rekap hanya dibagikan internal (berisi data siswa).',
    ],
  },
]

export const flowSlides = [
  {
    id: 'e2e-divider',
    section: 'flow',
    role: 'all',
    layout: 'divider',
    sectionNo: 6,
    title: 'Alur End-to-End',
    description: 'Satu gambar: bagaimana semua peran bekerja pada satu data presensi.',
    sectionItems: ['Siklus harian', 'Siklus pelaporan'],
  },
  {
    id: 'e2e-flow',
    section: 'flow',
    role: 'all',
    layout: 'lanes',
    kicker: 'End-to-End',
    title: 'Dari Master Data sampai Statistik',
    description: 'Tahapan lengkap yang dijalankan madrasah — setiap kotak adalah menu nyata di aplikasi.',
    lanes: [
      {
        title: '1 · ADMIN menyiapkan',
        items: ['Login sebagai Admin', 'Master Data: Guru + Siswa + Kelas', 'Kalender: hari efektif & libur', 'Tahun ajaran aktif di Pengaturan'],
      },
      {
        title: '2 · GURU mencatat',
        items: ['Login wali kelas', 'Input Presensi pagi hari', 'Tandai Izin/Sakit/Alfa saja', 'Simpan → data resmi hari itu'],
      },
      {
        title: '3 · ADMIN memantau',
        items: ['Dashboard: strip perhatian', 'Kelas ketinggalan → diingatkan', 'Rekap Bulanan per kelas', 'Cetak PDF/Excel pimpinan'],
      },
      {
        title: '4 · SEKOLAH mengevaluasi',
        items: ['Rekap Semester (rapor)', 'Statistik: siswa < ambang', 'Pembinaan wali kelas', 'Laporan perpus paralel'],
      },
    ],
    watchouts: ['Satu sumber data: attendance_logs → semua turunan (dashboard, rekap, statistik) otomatis konsisten.'],
  },
  {
    id: 'e2e-lifecycle',
    section: 'flow',
    role: 'all',
    layout: 'flow',
    kicker: 'End-to-End',
    title: 'Siklus Sehari di Madrasah',
    description: 'Rentang waktu satu hari sekolah — dari login pertama sampai arsip.',
    flow: [
      { label: '06.45', sub: 'Admin login, cek kalender' },
      { label: '07.00', sub: 'Guru input presensi' },
      { label: '07.15', sub: 'Dashboard hijau (monitoring)' },
      { label: 'Siang', sub: 'Sirkulasi perpus & kunjungan' },
      { label: 'Akhir bulan', sub: 'Rekap bulanan + cetak' },
      { label: 'Akhir semester', sub: 'Rekap semester + statistik' },
    ],
    bullets: [
      'Kunci keberhasilan: wali kelas menekan Simpan setiap pagi.',
      'Admin menutup hari dengan dashboard berwarna hijau.',
    ],
  },
]
