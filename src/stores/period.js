import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const usePeriodStore = defineStore('period', () => {
  const activePeriod = ref(null)
  const loading = ref(false)

  const label = computed(() =>
    activePeriod.value
      ? `${activePeriod.value.tahun_ajaran} — ${activePeriod.value.semester}`
      : 'Belum ada periode aktif'
  )

  let _inflight = null

  async function _doFetch() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('academic_periods')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      activePeriod.value = data
    } finally {
      loading.value = false
    }
    return activePeriod.value
  }

  async function fetchActivePeriod(force = false) {
    if (!force && activePeriod.value) return activePeriod.value
    if (_inflight) return _inflight
    
    _inflight = _doFetch().finally(() => { _inflight = null })
    return _inflight
  }

  return { activePeriod, loading, label, fetchActivePeriod }
})
