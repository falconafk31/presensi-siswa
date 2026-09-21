// Shim lazy-load untuk @supabase/realtime-js.
//
// @supabase/supabase-js membuat `new RealtimeClient(...)` secara sinkron di
// constructornya, sehingga paket realtime-js (±57 kB) selalu ikut jalur kritis
// boot — padahal koneksi realtime hanya dipakai dashboard presensi. Vite alias
// '@supabase/realtime-js' ke file ini (lihat vite.config.js):
//   - '@supabase/realtime-js'      -> shim ini (masuk chunk entry, ±1 kB)
//   - '@supabase/realtime-js/real' -> paket asli (dynamic import, chunk terpisah)
//
// Cara kerja: instance stub dikembalikan sinkron tanpa memuat apa pun.
// Chunk asli baru diunduh saat pertama kali benar-benar dibutuhkan (panggil
// whenRealtimeReady() dari src/lib/supabase.js). Begitu chunk termuat,
// prototipe instance diganti ke kelas asli dan constructor asli dijalankan
// pada instance yang sama (pola prototype-swap), sehingga referensi
// this.realtime yang sudah disimpan supabase-js tetap valid.
//
// Method yang mungkin dipanggil supabase-js secara internal sebelum chunk
// siap (setAuth saat event auth SIGNED_IN/TOKEN_REFRESHED) diantrekan dan
// diputar ulang setelah kelas asli aktif — aman karena RealtimeClient juga
// menerima callback accessToken dan mengambil token sendiri saat connect.

let _modPromise = null
function loadRealtime() {
  if (!_modPromise) _modPromise = import('@supabase/realtime-js/real')
  return _modPromise
}

export class RealtimeClient {
  constructor(url, options) {
    const instance = this
    const queue = []
    let readyPromise = null

    // Dipanggil supabase-js saat event auth yang bisa terjadi kapan pun.
    instance.setAuth = (...args) => queue.push(['setAuth', args])

    // Pemicu muat on-demand (dipanggil via whenRealtimeReady()).
    instance.__ensureLoaded = () => {
      if (!readyPromise) {
        readyPromise = loadRealtime().then(({ RealtimeClient: RC }) => {
          delete instance.setAuth
          delete instance.__ensureLoaded
          Object.setPrototypeOf(instance, RC.prototype)

          // Jalankan constructor kelas asli dengan `this` milik stub ini.
          const Bound = new Proxy(RC, { construct(Target, args) { return instance } })
          new Bound(url, options)

          for (const [name, args] of queue) instance[name](...args)
          queue.length = 0
          return instance
        })
      }
      return readyPromise
    }
  }
}
