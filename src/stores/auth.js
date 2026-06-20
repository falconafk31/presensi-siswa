import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const isPustakawan = computed(() => user.value?.role === 'Pustakawan' || user.value?.role === 'Guru & Pustakawan')
  const canManagePerpus = computed(() => isAdmin.value || isPustakawan.value)
  const kelas = computed(() => user.value?.kelas ?? null)

  async function fetchProfile(auth_id) {
    const { data, error } = await supabase.from('users').select('*').eq('auth_id', auth_id).single()
    if (!error && data) {
      user.value = data
    } else {
      user.value = null
    }
  }

  // Initialize session on load
  async function initialize() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await fetchProfile(session.user.id)
    }
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        user.value = null
      }
    })
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
  }

  return { user, isAuthenticated, isAdmin, isPustakawan, canManagePerpus, kelas, login, logout, initialize }
})
