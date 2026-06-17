import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = useStorage('presensi.user', null, localStorage, {
    serializer: {
      read: (v) => (v ? JSON.parse(v) : null),
      write: (v) => JSON.stringify(v),
    },
  })

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')
  const kelas = computed(() => user.value?.kelas ?? null)

  async function login(username, password) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, nama, role, kelas')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Username atau password salah')

    user.value = data
    return data
  }

  function logout() {
    user.value = null
  }

  return { user, isAuthenticated, isAdmin, kelas, login, logout }
})
