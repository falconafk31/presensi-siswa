#!/usr/bin/env node
/**
 * Export PDF tutorial presentation — HTML-first via Playwright/Chromium.
 *
 * Prasyarat:
 *   1. npm install && npm run build
 *   2. npx playwright install chromium   (sekali saja)
 *   3. Server preview berjalan, mis.:
 *        npm run preview                 # http://localhost:4173
 *      — atau set BASE_URL ke URL lain.
 *
 * Jalankan:
 *   npm run export:pdf
 *   BASE_URL=http://localhost:4173 OUT=out/tutorial.pdf npm run export:pdf
 *
 * Cara kerja:
 *   - Membuka /tutorial/presentation?export=1 — SEMUA slide dirender dari
 *     shared slide model yang sama dengan HTML/PPTX.
 *   - CSS @page size20in×11.25in (=1920×1080px @96dpi) menjamin
 *    1 halaman =1 slide,16:9, tanpa potong.
 *   - page.pdf({ preferCSSPageSize: true, printBackground: true }).
 */
import { chromium } from 'playwright'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173'
const OUT = resolve(process.env.OUT || 'out/tutorial-presensi-siswa.pdf')
const URL = `${BASE_URL}/tutorial/presentation?export=1`
// Opsional: pakai Chromium/Chrome lokal (mis. sandbox tanpa akses CDN Playwright)
// CHROME_PATH=/usr/bin/chromium npm run export:pdf
const CHROME_PATH = process.env.CHROME_PATH || undefined

async function main() {
  console.log(`→ ${URL}`)
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    page.on('pageerror', (e) => console.warn('[pageerror]', e.message))

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
    // Tunggu seluruh slide ter-render dari model.
    await page.waitForSelector('.export-staging .slide', { timeout: 30000 })
    const count = await page.locator('.export-staging .slide').count()
    if (!count) throw new Error('Tidak ada slide ter-render — cek build & console.')
    console.log(`✓ ${count} slide ter-render`)

    // Pastikan semua reveal sudah tampil (tanpa animasi tertunda).
    await page.addStyleTag({
      content: `.slide .reveal{opacity:1!important;transform:none!important;transition:none!important}
                .slide{visibility:visible!important;opacity:1!important;position:relative!important}`,
    })
    await page.waitForTimeout(300)

    await mkdir(dirname(OUT), { recursive: true })
    await page.pdf({
      path: OUT,
      printBackground: true,
      preferCSSPageSize: true, // ikuti @page size (20in ×11.25in =16:9)
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    })

    const info = await stat(OUT)
    console.log(`✓ PDF tersimpan: ${OUT} (${(info.size / 1024).toFixed(0)} kB, ~${count} halaman16:9)`)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error('EXPORT PDF GAGAL:', e.message)
  process.exit(1)
})
