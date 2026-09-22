// Shim lazy-load untuk @supabase/realtime-js.
//
// @supabase/supabase-js membuat `new RealtimeClient(...)` secara sinkron di
// constructornya, sehingga paket realtime-js (±57 kB) selalu ikut jalur kritis
// boot — padahal koneksi realtime hanya dipakai dashboard presensi. Vite alias
// '@supabase/realtime-js' ke file ini (lihat vite.config.js):
//   - '@supabase/realtime-js'      -> shim ini (masuk chunk entry, ±1 kB)
//   - '@supabase/realtime-js/real' -> paket asli (dynamic import, chunk terpisah)
//
// Cara kerja: stub dikembalikan sinkron tanpa memuat apa pun. Chunk asli baru
// diunduh saat pertama kali benar-benar dibutuhkan (via whenRealtimeReady()
// di src/lib/supabase.js). Begitu chunk termuat, sebuah RealtimeClient ASLI
// dibuat dengan normal (semua field internal terinisialisasi sempurna),
// panggilan setAuth yang tertahan diputar ulang, dan instance asli itu
// menggantikan properti `supabase.realtime` (assignment dilakukan oleh
// whenRealtimeReady) — sehingga semua method berikutnya (channel, dsb.)
// berjalan di instance asli yang utuh.
//
// Catatan: pendekatan prototype-swap pada instance stub terbukti bermasalah
// karena class field initializer kelas asli tidak pernah menyentuh instance
// stub (field mendarat di object lain), membuat state internal seperti
// `channels` tetap undefined. Karena itu instance asli dibuat lewat `new`
// biasa — bukan di-patch.

let _modPromise = null
function loadRealtime() {
  if (!_modPromise) _modPromise = import('@supabase/realtime-js/real')
  return _modPromise
}

export class RealtimeClient {
  constructor(url, options) {
    const queue = []
    let readyPromise = null

    // Dipanggil supabase-js saat event auth yang bisa terjadi kapan pun
    // sebelum chunk asli termuat; diantrekan lalu diputar ulang.
    this.setAuth = (...args) => queue.push(['setAuth', args])

    // Pemicu muat on-demand: membangun RealtimeClient asli & mengembalikannya.
    // whenRealtimeReady() yang menugaskan hasilnya ke supabase.realtime.
    this.__ensureLoaded = () => {
      if (!readyPromise) {
        readyPromise = loadRealtime().then(({ RealtimeClient: RC }) => {
          const client = new RC(url, options)
          for (const [name, args] of queue) client[name](...args)
          queue.length = 0
          return client
        })
      }
      return readyPromise
    }
  }
}
