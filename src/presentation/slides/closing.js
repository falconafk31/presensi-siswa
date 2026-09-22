/** SECTION7 — CLOSING. */

export const closingSlides = [
  {
    id: 'closing-summary',
    section: 'closing',
    role: 'all',
    layout: 'grid',
    kicker: 'Penutup ·01',
    title: 'Ringkasan Penggunaan',
    description: 'Tiga kalimat yang perlu diingat setelah tutorial ini.',
    cards: [
      { title: 'Admin menyiapkan', body: 'Master data, kalender, dan pengaturan diatur sekali — sisanya berjalan otomatis.', icon: 'shield' },
      { title: 'Guru mencatat setiap pagi', body: 'Pola pengecualian: hanya tandai yang tidak hadir, lalu Simpan.5 menit selesai.', icon: 'clipboard' },
      { title: 'Semua membaca data yang sama', body: 'Dashboard, rekap, dan statistik adalah turunan dari satu log presensi.', icon: 'chart' },
      { title: 'Perpustakaan paralel', body: 'Katalog → pinjam → kembali → laporan, dengan kunjungan ber-QR.', icon: 'book' },
      { title: 'Keamanan melekat', body: 'Session + role + guard + RLS. Keluar dari perangkat bersama.', icon: 'lock' },
      { title: 'Dokumentasi ini', body: '/tutorial untuk membaca, /tutorial/presentation untuk presentasi16:9.', icon: 'help' },
    ],
  },
  {
    id: 'closing-quickref',
    section: 'closing',
    role: 'all',
    layout: 'lanes',
    kicker: 'Penutup ·02',
    title: 'Quick Reference',
    description: 'Peta menu cepat — apa, di mana, untuk siapa.',
    lanes: [
      {
        title: 'Presensi',
        items: ['Dashboard → ringkasan harian', 'Input Presensi → tandai & simpan', 'Rekap Bulanan → matriks + cetak', 'Rekap Semester → kumulatif', 'Statistik → % per siswa'],
      },
      {
        title: 'Administrasi',
        items: ['Data Siswa → master siswa', 'Guru & Wali Kelas → akun login', 'Kalender → hari efektif', 'Riwayat Kelas → histori', 'Log Aktivitas → audit'],
      },
      {
        title: 'Perpustakaan',
        items: ['Beranda → KPI & tren', 'Data Koleksi → stok buku', 'Sirkulasi → pinjam/kembali', 'Pengunjung → QR scanner', 'Laporan → periode & peringkat'],
      },
    ],
  },
  {
    id: 'closing-shortcuts',
    section: 'closing',
    role: 'all',
    layout: 'grid',
    kicker: 'Penutup ·03',
    title: 'Shortcut Penting',
    description: 'Mulai dari mode presentasi hingga trik harian di aplikasi.',
    cards: [
      { title: '← / →', body: 'Slide sebelumnya / berikutnya pada mode presentasi.', icon: 'keyboard' },
      { title: 'Home / End', body: 'Lompat ke slide pertama / terakhir.', icon: 'keyboard' },
      { title: 'F', body: 'Masuk/keluar fullscreen saat presentasi.', icon: 'keyboard' },
      { title: 'Ctrl+P', body: 'Cetak kartu anggota / halaman terbuka (dialog cetak browser).', icon: 'sheet' },
      { title: 'Enter pada login', body: 'Langsung submit form login tanpa klik tombol.', icon: 'login' },
      { title: 'Refresh App', body: 'Menu profil → bersihkan cache bila layar bermasalah.', icon: 'refresh' },
    ],
  },
  {
    id: 'closing-help',
    section: 'closing',
    role: 'all',
    layout: 'feature',
    kicker: 'Penutup ·04',
    title: 'Bantuan & Langkah Berikutnya',
    description: 'Masih ada yang belum jelas? Semua jalur bantuan ada di aplikasi.',
    goal: 'Memberi pengguna jalan keluar yang jelas ketika macet.',
    steps: [
      'Menu Panduan Penggunaan di aplikasi (per peran, offline-ready).',
      'Halaman ini: /tutorial — dokumentasi dengan rekonstruksi UI.',
      'Mode presentasi: /tutorial/presentation (Alt+F11 feel,16:9).',
      'Export PDF/PPTX dari halaman tutorial untuk dibagikan.',
      'Source code & issue tracker: repository GitHub resmi.',
      'Laporkan bug menyertakan langkah reproduksi (tanpa data siswa asli).',
    ],
    watchouts: [
      'Untuk bantuan akun/reset password: hubungi Admin madrasah.',
      'Semua angka pada tutorial ini fiktif — jangan dikutip sebagai data produksi.',
    ],
    screen: 'panduan',
    screenTable: {
      caption: 'Jalur bantuan',
      headers: ['Kebutuhan', 'Tujuan'],
      rows: [
        ['Panduan pemakaian', 'Menu Panduan (dalam aplikasi)'],
        ['Tutorial interaktif', '/tutorial'],
        ['Presentasi16:9', '/tutorial/presentation'],
        ['Sumber kode', 'GitHub falconafk31/presensi-siswa'],
      ],
    },
  },
]
