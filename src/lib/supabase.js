import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variabel VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset. Cek file .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// realtime-js di-lazy-load via src/lib/lazyRealtime.js (alias Vite).
// Panggil ini sebelum membuat channel realtime — sekaligus memicu unduhan
// chunk-nya saat pertama kali dipanggil (on-demand). Bila realtime tidak
// lazy (mis. shim dilepas di masa depan), promise langsung resolve.
export function whenRealtimeReady() {
  const realtime = supabase.realtime
  if (realtime?.__ensureLoaded) return realtime.__ensureLoaded()
  return Promise.resolve()
}
