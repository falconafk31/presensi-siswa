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

  async function fetchActivePeriod() {
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

  return { activePeriod, loading, label, fetchActivePeriod }
})
