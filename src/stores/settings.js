import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(null)
  const loading = ref(false)
  let _inflight = null

  async function _doFetch() {
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
        daftar_kelas: defaultData.daftar_kelas || ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'],
        kop_baris2: defaultData.kop_baris2 || '',
        kop_baris3: defaultData.kop_baris3 || '',
        kop_baris4: defaultData.kop_baris4 || '',
        kop_baris5: defaultData.kop_baris5 || '',
        hari_libur_mingguan: defaultData.hari_libur_mingguan || [0, 6],
        favicon_url: defaultData.favicon_url || ''
      }
    } finally {
      loading.value = false
    }
    return settings.value
  }

  // Deduplicate concurrent calls — if a fetch is already in-flight, reuse it
  async function fetchSettings(force = false) {
    if (!force && settings.value) return settings.value
    if (_inflight) return _inflight
    _inflight = _doFetch().finally(() => { _inflight = null })
    return _inflight
  }

  return { settings, loading, fetchSettings }
})
