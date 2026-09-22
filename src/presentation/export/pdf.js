/**
 * Export PDF (HTML-first).
 *
 * Dua jalur, keduanya merender slide HTML yang sama:
 * 1) In-app  : buka /tutorial/presentation?export=1 (semua slide bertumpuk
 *    per halaman via CSS @page 20in×11.25in =1920×1080px) lalu window.print()
 *    → user memilih "Save as PDF".
 * 2) CI/Headless : scripts/export-pdf.mjs (Playwright/Chromium) memanggil
 *    page.pdf({ preferCSSPageSize: true }) pada rute yang sama →1 file PDF
 *    presisi1 halaman =1 slide16:9.
 */
import { useRouter } from 'vue-router'

export async function openPrintExport(router = null) {
  const r = router || useRouter()
  await r.push({ path: '/tutorial/presentation', query: { export: '1', autoprint: '1' } })
}

export function printNow() {
  window.print()
}
