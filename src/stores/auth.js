import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const USER_CACHE_KEY = 'presensi.user'

function readUserCache() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeUserCache(data) {
  try {
    if (data) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data))
    else localStorage.removeItem(USER_CACHE_KEY)
  } catch {
    /* abaikan: storage penuh / private mode */
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const isPustakawan = computed(() => user.value?.role === 'Pustakawan' || user.value?.role === 'Guru & Pustakawan')
  const canManagePerpus = computed(() => isAdmin.value || isPustakawan.value)
  const isGuru = computed(() => user.value?.role === 'Guru' || user.value?.role === 'Guru & Pustakawan')
  const canManagePresensi = computed(() => isAdmin.value || isGuru.value)
  const kelas = computed(() => user.value?.kelas ?? null)

  async function fetchProfile(auth_id) {
    const { data, error } = await supabase.from('users').select('*').eq('auth_id', auth_id).single()
    if (!error && data) {
      user.value = data
      writeUserCache(data)
    } else if (!user.value) {
      user.value = null
    }
  }

  // Initialize session on load.
  // Urutan boot dirancang anti-kedip:
  // 1) Hidrasi sinkron dari cache lokal → role/kelas langsung tersedia,
  //    mount tidak perlu menunggu round-trip jaringan pada kunjungan ulang.
  // 2) Listener auth didaftarkan sebelum await apa pun.
  // 3) Profil di-refresh di background bila cache sudah cocok dengan sesi;
  //    fetch pemblokiran hanya terjadi pada kunjungan pertama (perangkat baru).
  async function initialize() {
    const cached = readUserCache()
    if (cached?.auth_id) user.value = cached

    // Listen for auth changes (daftarkan SEBELUM await agar tidak ada event yang terlewat)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Lewati bila profil user yang sama sudah termuat (cegah fetch ganda
        // pada event INITIAL_SESSION / TOKEN_REFRESHED)
        if (user.value?.auth_id !== session.user.id) {
          await fetchProfile(session.user.id)
        }
      } else {
        user.value = null
        writeUserCache(null)
      }
    })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      user.value = null
      writeUserCache(null)
      return
    }

    if (user.value?.auth_id === session.user.id) {
      // Cache cocok → refresh di background (tidak memblokir boot)
      fetchProfile(session.user.id)
    } else {
      // Cache kosong/beda user → profil wajib menunggu (dibutuhkan guard rute)
      await fetchProfile(session.user.id)
    }
  }

  async function login(username, password) {
    const email = `${username}@minblora.id`
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Username atau password salah')
      }
      throw new Error(error.message)
    }

    await fetchProfile(data.user.id)
    return user.value
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    user.value = null
    writeUserCache(null)
  }

  return { user, isAuthenticated, isAdmin, isPustakawan, canManagePerpus, isGuru, canManagePresensi, kelas, login, logout, initialize }
})
