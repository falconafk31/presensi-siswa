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
// Panggil ini sebelum membuat channel realtime: memicu unduhan chunk-nya
// on-demand, lalu MENGGANTI supabase.realtime dengan instance RealtimeClient
// asli yang utuh (stub shim tidak memiliki field internal kelas asli).
// Bila realtime tidak lazy (mis. shim dilepas di masa depan), promise
// langsung resolve.
export function whenRealtimeReady() {
  const stub = supabase.realtime
  if (stub?.__ensureLoaded) {
    return stub.__ensureLoaded().then((client) => {
      supabase.realtime = client
      return client
    })
  }
  return Promise.resolve(stub)
}
