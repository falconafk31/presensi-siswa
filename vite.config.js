import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const require = createRequire(import.meta.url)
// Entrypoint ESM asli @supabase/realtime-js (dimuat lazy via src/lib/lazyRealtime.js)
const realtimeEntry = require.resolve('@supabase/realtime-js/dist/module/index.js')

export default defineConfig({
  plugins: [
    vue()
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
      {
        // Lazy-load realtime-js: supabase-js selalu meng-instansiasi
        // RealtimeClient di constructor, padahal koneksi realtime hanya
        // dipakai dashboard. Alias ke shim agar chunk-nya terpisah dan
        // hanya dimuat saat dibutuhkan (±40 kB off jalur kritis boot).
        find: /^@supabase\/realtime-js$/,
        replacement: fileURLToPath(new URL('./src/lib/lazyRealtime.js', import.meta.url)),
      },
      {
        find: /^@supabase\/realtime-js\/real$/,
        replacement: realtimeEntry,
      },
    ],
  },
  // Izinkan host preview sandbox (Arena/e2b) pada dev & preview server.
  // Hanya berlaku saat development — tidak memengaruhi hasil build produksi.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  build: {
    // Catatan: manualChunks object-form (vendor-chart berisi chart.js) pernah
    // dipakai di sini, tetapi membuat Rollup meng-hoist runtime Vue ke dalam
    // chunk tersebut — semua chunk ikut meng-import vendor-chart (±264 kB)
    // sehingga ikut termuat di jalur kritis setiap halaman (penyebab layar
    // "kedip" saat boot). Chunking kini diserahkan ke default Rollup:
    // chart.js hanya dimuat saat dashboard yang memakainya dirender
    // (via src/lib/chartSetup.js), xlsx & jspdf tetap lazy-load.
  }
})
