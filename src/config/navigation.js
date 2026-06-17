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
} from 'lucide-vue-next'

// adminOnly: true -> hanya tampil untuk role 'Admin'
export const navItems = [
  { to: { name: 'dashboard' }, label: 'Dashboard', icon: LayoutDashboard },
  { to: { name: 'presensi' }, label: 'Input Presensi', icon: ClipboardCheck },
  { to: { name: 'rekap' }, label: 'Rekap Bulanan', icon: FileSpreadsheet },
  { to: { name: 'rekap-semester' }, label: 'Rekap Semester', icon: CalendarCheck },
  { to: { name: 'siswa' }, label: 'Data Siswa', icon: Users, adminOnly: true },
  { to: { name: 'guru' }, label: 'Guru & Wali Kelas', icon: GraduationCap, adminOnly: true },
  { to: { name: 'kalender' }, label: 'Kalender Akademik', icon: CalendarDays, adminOnly: true },
  { to: { name: 'statistik' }, label: 'Statistik Kehadiran', icon: TriangleAlert },
  { to: { name: 'riwayat-kelas' }, label: 'Riwayat Kelas', icon: History, adminOnly: true },
  { to: { name: 'aktivitas' }, label: 'Log Aktivitas', icon: ScrollText, adminOnly: true },
  { to: { name: 'pengaturan' }, label: 'Pengaturan', icon: Settings, adminOnly: true },
]
