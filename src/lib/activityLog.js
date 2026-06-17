import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// Catat satu baris ke activity_logs (audit trail).
// Dipakai setiap kali ada input/edit presensi atau data master.
export async function logActivity({ aksi, tabel_terkait = null, record_id = null, detail = null }) {
  try {
    const auth = useAuthStore()
    await supabase.from('activity_logs').insert({
      user_id: auth.user?.id ?? null,
      aksi,
      tabel_terkait,
      record_id: record_id != null ? String(record_id) : null,
      detail,
    })
  } catch (e) {
    // Jangan blokir aksi utama hanya karena audit log gagal
    console.error('Gagal mencatat activity log:', e)
  }
}
