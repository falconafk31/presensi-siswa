/**
 * Presentation module — dokumentasi interaktif & mode presentasi.
 * Jalur: /tutorial · /tutorial/admin · /tutorial/guru · /tutorial/pustakawan
 *        /tutorial/presentation
 */
export { default as TutorialLayout } from './components/TutorialLayout.vue'
export { default as TutorialView } from './components/TutorialView.vue'
export { default as PresentationView } from './components/PresentationView.vue'
export { default as SlideRenderer } from './components/SlideRenderer.vue'
export { slides, SECTIONS, slidesBySection, findSlide } from './slides'
export { exportPptx, openPrintExport } from './export'
