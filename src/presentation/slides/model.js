/**
 * SHARED SLIDE MODEL — single source of truth.
 *
 * Satu array `slides` dipakai oleh:
 *  - HTML tutorial (/tutorial)  → daftar fitur + panel detail
 *  - HTML presentation (/tutorial/presentation) → stage 1920×1080
 *  - Export PDF  (print/Playwright — render slide HTML yang sama)
 *  - Export PPTX (export/pptx.js — memetakan field slide ke teks/shape native)
 *
 * Skema slide:
 * {
 *   id: string            // unik, dipakai deep-link ?slide=<id>
 *   section: string       // intro|admin|guru|library|security|flow|closing
 *   role: string          // all|admin|guru|pustakawan
 *   layout: string        // cover|divider|feature|bullets|grid|flow|stats|lanes|closing
 *   title: string
 *   kicker?: string       // eyebrow kecil di atas judul
 *   subtitle?: string
 *   description?: string  //1 kalimat di bawah judul (feature)
 *   goal?: string         // "Tujuan fitur" pada layout feature
 *   steps?: string[]      // langkah penggunaan (numbered)
 *   watchouts?: string[]  // hal yang perlu diperhatikan
 *   bullets?: string[]
 *   cards?: {title, body, icon?}[]
 *   flow?: {label, sub?}[]
 *   lanes?: {title, items[]}[]
 *   stats?: {label, value, sub?, tone?}[]
 *   screen?: string       // key registry komponen rekonstruksi UI (mock)
 *   screenTable?: {caption, headers[], rows[][], note?} // unt PPTX (editable table)
 *   sectionNo?: number    // divider: nomor bagian
 *   sectionItems?: string[]
 * }
 */

export const SECTIONS = [
  { id: 'intro', role: 'all', label: 'Pendahuluan', short: 'Intro' },
  { id: 'admin', role: 'admin', label: 'Tutorial Admin', short: 'Admin' },
  { id: 'guru', role: 'guru', label: 'Tutorial Guru', short: 'Guru' },
  { id: 'library', role: 'pustakawan', label: 'Tutorial Perpustakaan', short: 'Library' },
  { id: 'security', role: 'all', label: 'Keamanan & Sesi', short: 'Keamanan' },
  { id: 'flow', role: 'all', label: 'Alur End-to-End', short: 'Alur' },
  { id: 'closing', role: 'all', label: 'Penutup', short: 'Penutup' },
]

/** Layout fitur: panjang maksimum agar stage1920×1080 tidak pernah overflow. */
export const LAYOUT_LIMITS = {
  steps: 6,
  watchouts: 4,
  bullets: 8,
  cards: 6,
  flow: 10,
}

export function slidesBySection(slides, sectionId) {
  return slides.filter((s) => s.section === sectionId)
}

export function findSlide(slides, id) {
  return slides.find((s) => s.id === id) || null
}
