/**
 * Slide index — SINGLE SOURCE OF URUTAN untuk HTML tutorial,
 * presentation mode, export PDF, dan export PPTX.
 */
import { introSlides } from './intro'
import { adminSlides } from './admin'
import { guruSlides } from './guru'
import { librarySlides } from './library'
import { securitySlides, flowSlides } from './security'
import { closingSlides } from './closing'

export { SECTIONS, slidesBySection, findSlide, LAYOUT_LIMITS } from './model'

export const slides = [
  ...introSlides,
  ...adminSlides,
  ...guruSlides,
  ...librarySlides,
  ...securitySlides,
  ...flowSlides,
  ...closingSlides,
]

// Validasi ringan di dev: id unik & layout dikenal.
if (import.meta.env?.DEV) {
  const ids = new Set()
  for (const s of slides) {
    if (ids.has(s.id)) console.warn(`[slides] id duplikat: ${s.id}`)
    ids.add(s.id)
  }
}
