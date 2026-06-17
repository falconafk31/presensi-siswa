import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(null)
  const loading = ref(false)

  async function fetchSettings() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      
      const defaultData = data || {}
      settings.value = {
        ...defaultData,
        daftar_kelas: defaultData.daftar_kelas || ['1', '2', '3', '4', '5', '6'],
        kop_baris2: defaultData.kop_baris2 || '',
        kop_baris3: defaultData.kop_baris3 || '',
        kop_baris4: defaultData.kop_baris4 || '',
        kop_baris5: defaultData.kop_baris5 || '',
        favicon_url: defaultData.favicon_url || ''
      }
    } finally {
      loading.value = false
    }
    return settings.value
  }

  return { settings, loading, fetchSettings }
})
