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
  HelpCircle
} from 'lucide-vue-next'

// adminOnly: true -> hanya tampil untuk role 'Admin'
export const navItems = [
  { isHeader: true, label: 'MAIN MENU' },
  { to: { name: 'dashboard' }, label: 'Dashboard', icon: LayoutDashboard },
  { to: { name: 'presensi' }, label: 'Input Presensi', icon: ClipboardCheck },
  { to: { name: 'rekap' }, label: 'Rekap Bulanan', icon: FileSpreadsheet },
  { to: { name: 'rekap-semester' }, label: 'Rekap Semester', icon: CalendarCheck },
  { to: { name: 'statistik' }, label: 'Statistik Kehadiran', icon: TriangleAlert },
  
  { isHeader: true, label: 'PERPUSTAKAAN', perpusOnly: true },
  { to: { name: 'dashboard-perpus' }, label: 'Dashboard Perpus', icon: PieChart, perpusOnly: true },
  { to: { name: 'kunjungan-perpus' }, label: 'Kunjungan Perpus', icon: UsersRound, perpusOnly: true },
  { to: { name: 'buku' }, label: 'Katalog Buku', icon: Book, perpusOnly: true },
  { to: { name: 'peminjaman' }, label: 'Sirkulasi Buku', icon: BookOpen, perpusOnly: true },
  { to: { name: 'rekap-perpus' }, label: 'Laporan Perpus', icon: Library, perpusOnly: true },
  
  { isHeader: true, label: 'ADMINISTRASI', adminOnly: true },
  { to: { name: 'siswa' }, label: 'Data Siswa', icon: Users, adminOnly: true },
  { to: { name: 'guru' }, label: 'Guru & Wali Kelas', icon: GraduationCap, adminOnly: true },
  { to: { name: 'kalender' }, label: 'Kalender Akademik', icon: CalendarDays, adminOnly: true },
  { to: { name: 'riwayat-kelas' }, label: 'Riwayat Kelas', icon: History, adminOnly: true },
  { to: { name: 'aktivitas' }, label: 'Log Aktivitas', icon: ScrollText, adminOnly: true },
  { to: { name: 'pengaturan' }, label: 'Pengaturan', icon: Settings, adminOnly: true },
  
  { isHeader: true, label: 'BANTUAN' },
  { to: { name: 'panduan' }, label: 'Panduan Penggunaan', icon: HelpCircle },
]
