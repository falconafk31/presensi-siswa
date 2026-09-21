import {
  LayoutDashboard,
  ClipboardCheck,
  FileSpreadsheet,
  Users,
  GraduationCap,
  CalendarDays,
  Settings,
  History,
  TriangleAlert,
  ScrollText,
  CalendarCheck,
  Book,
  BookOpen,
  Library,
  PieChart,
  UsersRound,
  HelpCircle,
  Printer
} from 'lucide-vue-next'

// adminOnly: true -> hanya tampil untuk role 'Admin'
export const navItems = [
  { isHeader: true, label: 'MAIN MENU', presensiOnly: true },
  { to: { name: 'dashboard' }, label: 'Dashboard', icon: LayoutDashboard, presensiOnly: true },
  { to: { name: 'presensi' }, label: 'Input Presensi', icon: ClipboardCheck, presensiOnly: true },
  { to: { name: 'rekap' }, label: 'Rekap Bulanan', icon: FileSpreadsheet, presensiOnly: true },
  { to: { name: 'rekap-semester' }, label: 'Rekap Semester', icon: CalendarCheck, presensiOnly: true },
  { to: { name: 'statistik' }, label: 'Statistik Kehadiran', icon: TriangleAlert, presensiOnly: true },
  { to: { name: 'kalender' }, label: 'Kalender Akademik', icon: CalendarDays, presensiOnly: true },
  
  { isHeader: true, label: 'PERPUSTAKAAN', perpusOnly: true },
  { to: { name: 'dashboard-perpus' }, label: 'Beranda Perpustakaan', icon: PieChart, perpusOnly: true },
  { to: { name: 'buku' }, label: 'Data Koleksi', icon: Book, perpusOnly: true },
  { to: { name: 'peminjaman' }, label: 'Sirkulasi', icon: BookOpen, perpusOnly: true },
  { to: { name: 'kunjungan-perpus' }, label: 'Data Pengunjung', icon: UsersRound, perpusOnly: true },
  { to: { name: 'cetak-kartu' }, label: 'Kartu Anggota', icon: Printer, perpusOnly: true },
  { to: { name: 'rekap-perpus' }, label: 'Laporan & Statistik', icon: Library, perpusOnly: true },
  
  { isHeader: true, label: 'ADMINISTRASI', adminOnly: true },
  { to: { name: 'siswa' }, label: 'Data Siswa', icon: Users, adminOnly: true },
  { to: { name: 'guru' }, label: 'Guru & Wali Kelas', icon: GraduationCap, adminOnly: true },
  { to: { name: 'riwayat-kelas' }, label: 'Riwayat Kelas', icon: History, adminOnly: true },
  { to: { name: 'aktivitas' }, label: 'Log Aktivitas', icon: ScrollText, adminOnly: true },
  { to: { name: 'pengaturan' }, label: 'Pengaturan', icon: Settings, adminOnly: true },
  
  { isHeader: true, label: 'BANTUAN' },
  { to: { name: 'panduan' }, label: 'Panduan Penggunaan', icon: HelpCircle },
]

// Bottom tabs for mobile — role-specific quick access
export const bottomTabsPresensi = [
  { to: { name: 'dashboard' }, label: 'Home', icon: LayoutDashboard },
  { to: { name: 'presensi' }, label: 'Absen', icon: ClipboardCheck },
  { to: { name: 'rekap' }, label: 'Rekap', icon: FileSpreadsheet },
  { to: { name: 'statistik' }, label: 'Statistik', icon: TriangleAlert },
]

export const bottomTabsPerpus = [
  { to: { name: 'dashboard-perpus' }, label: 'Beranda', icon: PieChart },
  { to: { name: 'buku' }, label: 'Koleksi', icon: Book },
  { to: { name: 'peminjaman' }, label: 'Sirkulasi', icon: BookOpen },
  { to: { name: 'kunjungan-perpus' }, label: 'Pengunjung', icon: UsersRound },
]

export const bottomTabsAdmin = [
  { to: { name: 'siswa' }, label: 'Siswa', icon: Users },
  { to: { name: 'guru' }, label: 'Guru', icon: GraduationCap },
  { to: { name: 'kalender' }, label: 'Kalender', icon: CalendarDays },
  { to: { name: 'pengaturan' }, label: 'Setelan', icon: Settings },
]
