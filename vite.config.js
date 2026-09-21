import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
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
