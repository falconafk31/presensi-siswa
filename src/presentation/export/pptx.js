/**
 * Export PPTX — dibangun dari SHARED SLIDE MODEL yang sama dengan HTML/PDF.
 * Layout16:9 (13.333in × 7.5in). Teks tetap text (editable), tabel native,
 * shape berwarna mengikuti design system — tanpa screenshot statis.
 *
 * Library: pptxgenjs (dynamic import → tidak masuk chunk awal aplikasi).
 */
import { ATTENDANCE_COLORS } from '@/config/designSystem'

const EMR = '047857'
const EMR_DARK = '065F46'
const EMR_50 = 'ECFDF5'
const EMR_200 = 'A7F3D0'
const GOLD = 'D97706'
const GOLD_50 = 'FEF3C7'
const GOLD_200 = 'FCD34D'
const INK = '0F172A'
const SLATE600 = '475569'
const SLATE500 = '64748B'
const SLATE400 = '94A3B8'
const SLATE200 = 'E2E8F0'
const BG = 'F8FAFC'
const WHITE = 'FFFFFF'
const SKY = '0369A1'
const ROSE = 'BE123C'

const FONT = 'Segoe UI'
const W = 13.333
const H = 7.5
const M = 0.65 // margin

const roleLabel = { admin: 'Admin', guru: 'Guru', pustakawan: 'Pustakawan', all: null }

const chipTones = {
  primary: { fill: EMR_50, line: EMR_200, color: EMR },
  warning: { fill: GOLD_50, line: GOLD_200, color: '92400E' },
  info: { fill: 'F0F9FF', line: 'BAE6FD', color: SKY },
  danger: { fill: 'FFF1F2', line: 'FECDD3', color: ROSE },
  library: { fill: 'EFF6FF', line: 'BFDBFE', color: '1D4ED8' },
  neutral: { fill: 'F1F5F9', line: SLATE200, color: SLATE600 },
}

function header(pptx, s, slide, index, total) {
  s.background = { color: BG }
  if (slide.kicker) {
    s.addText(slide.kicker.toUpperCase(), {
      x: M, y: 0.42, w: 7.5, h: 0.3,
      fontFace: FONT, fontSize: 11, bold: true, color: EMR, charSpacing: 3,
    })
  }
  const rl = roleLabel[slide.role]
  if (rl) {
    s.addText(rl, {
      x: W - M - 1.3, y: 0.4, w: 1.3, h: 0.32, align: 'center', valign: 'middle',
      fontFace: FONT, fontSize: 10, bold: true, color: EMR,
      fill: { color: EMR_50 }, line: { color: EMR_200 },
      rectRadius: 0.08, shape: pptx.ShapeType.roundRect,
    })
  }
  s.addText(`${index + 1} / ${total}`, {
    x: W - M - 2.4, y: 0.74, w: 2.4, h: 0.26, align: 'right',
    fontFace: FONT, fontSize: 10, color: SLATE400,
  })
  s.addText(slide.title, {
    x: M, y: 0.78, w: W - 2 * M - 1.6, h: 0.62,
    fontFace: FONT, fontSize: 30, bold: true, color: INK,
  })
  let y = 1.42
  if (slide.description) {
    s.addText(slide.description, {
      x: M, y, w: W - 2 * M, h: 0.55,
      fontFace: FONT, fontSize: 13.5, color: SLATE500, lineSpacingMultiple: 1.15,
    })
    y += 0.58
  }
  s.addShape(pptx.ShapeType.line, { x: M, y, w: W - 2 * M, h: 0, line: { color: SLATE200, width: 1 } })
  return y + 0.22
}

function addStepsBox(pptx, s, x, y, w, h, steps) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: WHITE }, line: { color: SLATE200 },
    rectRadius: 0.06,
  })
  s.addText('LANGKAH PENGGUNAAN', {
    x: x + 0.18, y: y + 0.12, w: w - 0.36, h: 0.24,
    fontFace: FONT, fontSize: 9.5, bold: true, color: SLATE400, charSpacing: 2,
  })
  const rows = steps.map((t, i) => ({
    text: t,
    options: { bullet: { code: '2460' }, fontSize: 11.5, color: SLATE600, paraSpaceAfter: 5 },
  }))
  s.addText(rows, {
    x: x + 0.18, y: y + 0.38, w: w - 0.36, h: h - 0.5,
    fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.05,
  })
}

function addWatchBox(pptx, s, x, y, w, h, items) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: GOLD_50 }, line: { color: GOLD_200 }, rectRadius: 0.06,
  })
  const rows = [{ text: 'PERHATIKAN  ', options: { bold: true, fontSize: 9.5, color: '92400E' } }]
  items.forEach((t, i) => {
    rows.push({ text: t, options: { fontSize: 10.5, color: '92400E', breakLine: true, paraSpaceAfter: i < items.length - 1 ? 4 : 0 } })
  })
  s.addText(rows, { x: x + 0.18, y: y + 0.1, w: w - 0.36, h: h - 0.2, fontFace: FONT, valign: 'top' })
}

function addGoalBox(pptx, s, x, y, w, goal) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.7, fill: { color: EMR_50 }, line: { color: EMR_200 }, rectRadius: 0.06,
  })
  s.addText(
    [
      { text: 'TUJUAN  ', options: { fontSize: 9, bold: true, color: EMR, charSpacing: 2 } },
      { text: goal, options: { fontSize: 11.5, color: '064E3B', breakLine: true } },
    ],
    { x: x + 0.16, y: y + 0.06, w: w - 0.32, h: 0.58, fontFace: FONT, valign: 'middle' },
  )
}

function addScreenArea(pptx, s, x, y, w, h, slide) {
  // Bingkai "layar" — rekonstruksi UI direpresentasikan sebagai tabel native
  // bila model punya screenTable; jika tidak, bingkai berlabel jujur (demo).
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: WHITE }, line: { color: SLATE200 }, rectRadius: 0.05,
  })
  // header strip ala app bar
  s.addShape(pptx.ShapeType.rect, {
    x: x + 0.01, y: y + 0.01, w: w - 0.02, h: 0.34, fill: { color: EMR_DARK }, line: { color: EMR_DARK },
  })
  s.addText('DEMO · Rekonstruksi UI aplikasi (data fiktif)', {
    x: x + 0.15, y: y + 0.03, w: w - 0.3, h: 0.3,
    fontFace: FONT, fontSize: 10, bold: true, color: WHITE, valign: 'middle',
  })

  const st = slide.screenTable
  if (st) {
    s.addText(st.caption, {
      x: x + 0.2, y: y + 0.44, w: w - 0.4, h: 0.28,
      fontFace: FONT, fontSize: 11.5, bold: true, color: INK,
    })
    const headerRow = st.headers.map((t) => ({
      text: t,
      options: { bold: true, fontSize: 10.5, color: SLATE500, fill: { color: 'F1F5F9' } },
    }))
    const bodyRows = st.rows.map((r) => r.map((c, i) => ({
      text: String(c),
      options: { fontSize: 10.5, color: i === 0 ? INK : SLATE600, bold: i === 0 },
    })))
    const tableH = Math.min(0.34 + st.rows.length * 0.34, h - 1.1)
    s.addTable([headerRow, ...bodyRows], {
      x: x + 0.2, y: y + 0.76, w: w - 0.4,
      colW: Array.from({ length: st.headers.length }, () => (w - 0.4) / st.headers.length),
      border: { type: 'solid', color: SLATE200, pt: 0.5 },
      fontFace: FONT,
      margin: 0.06,
      autoPage: false,
      h: tableH,
    })
    if (st.note) {
      s.addText(st.note, {
        x: x + 0.2, y: y + h - 0.4, w: w - 0.4, h: 0.26,
        fontFace: FONT, fontSize: 9.5, color: SLATE400, italic: true,
      })
    }
  } else {
    const label = slide.screen ? `Layar: ${slide.screen}` : 'Konten visual'
    s.addText(label, {
      x, y: y + h / 2 - 0.3, w, h: 0.6, align: 'center', valign: 'middle',
      fontFace: FONT, fontSize: 14, bold: true, color: SLATE500,
    })
    s.addText('Rekonstruksi UI lengkap tersedia di mode HTML (/tutorial/presentation).', {
      x, y: y + h / 2 + 0.2, w, h: 0.4, align: 'center',
      fontFace: FONT, fontSize: 10, color: SLATE400, italic: true,
    })
  }
}

function renderFeature(pptx, s, slide, y0) {
  const colW = 4.35
  const gap = 0.35
  const xR = M + colW + gap
  const wR = W - M - xR
  const hBody = H - y0 - 0.55

  let y = y0
  if (slide.goal) {
    addGoalBox(pptx, s, M, y, colW, slide.goal)
    y += 0.84
  }
  const watchH = slide.watchouts?.length ? Math.min(0.45 + slide.watchouts.length * 0.3, 1.5) : 0
  const stepsH = slide.steps?.length
    ? hBody - (y - y0) - watchH - (slide.watchouts?.length ? 0.16 : 0)
    : 0

  if (slide.steps?.length && stepsH > 0.8) {
    addStepsBox(pptx, s, M, y, colW, stepsH, slide.steps)
    y += stepsH + 0.16
  }
  if (slide.watchouts?.length && watchH > 0) {
    addWatchBox(pptx, s, M, y, colW, watchH, slide.watchouts)
  }
  if (slide.bullets?.length && !slide.steps?.length) {
    const rows = slide.bullets.map((t) => ({ text: t, options: { bullet: true, fontSize: 11.5, color: SLATE600, paraSpaceAfter: 6 } }))
    s.addText(rows, { x: M, y, w: colW, h: hBody - (y - y0), fontFace: FONT, valign: 'top' })
  }

  addScreenArea(pptx, s, xR, y0, wR, hBody, slide)
}

function renderGrid(pptx, s, slide, y0) {
  const cards = slide.cards || []
  const cols = cards.length > 4 ? 3 : Math.min(cards.length, 3)
  const rows = Math.ceil(cards.length / cols)
  const gap = 0.22
  const areaH = H - y0 - (slide.bullets?.length ? 1.15 : 0.5) - (slide.watchouts?.length ? 0.55 : 0)
  const cw = (W - 2 * M - (cols - 1) * gap) / cols
  const ch = Math.min((areaH - (rows - 1) * gap) / rows, 2.4)

  cards.forEach((c, i) => {
    const cx = M + (i % cols) * (cw + gap)
    const cy = y0 + Math.floor(i / cols) * (ch + gap)
    s.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: cy, w: cw, h: ch, fill: { color: WHITE }, line: { color: SLATE200 }, rectRadius: 0.06,
    })
    s.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.18, y: cy + 0.16, w: 0.34, h: 0.34, fill: { color: EMR_50 }, line: { color: EMR_200 }, rectRadius: 0.05,
    })
    s.addText(c.title, {
      x: cx + 0.62, y: cy + 0.14, w: cw - 0.8, h: 0.38,
      fontFace: FONT, fontSize: 14, bold: true, color: INK, valign: 'middle',
    })
    s.addText(c.body, {
      x: cx + 0.18, y: cy + 0.56, w: cw - 0.36, h: ch - 0.7,
      fontFace: FONT, fontSize: 11, color: SLATE600, valign: 'top', lineSpacingMultiple: 1.1,
    })
  })

  let y = y0 + rows * ch + (rows - 1) * gap + 0.18
  if (slide.bullets?.length) {
    const bw = (W - 2 * M - (slide.bullets.length - 1) * gap) / slide.bullets.length
    slide.bullets.forEach((b, i) => {
      s.addShape(pptx.ShapeType.roundRect, {
        x: M + i * (bw + gap), y, w: bw, h: 0.75, fill: { color: 'F8FAFC' }, line: { color: SLATE200 }, rectRadius: 0.05,
      })
      s.addText(b, {
        x: M + i * (bw + gap) + 0.14, y: y + 0.06, w: bw - 0.28, h: 0.63,
        fontFace: FONT, fontSize: 10.5, color: SLATE600, valign: 'middle',
      })
    })
    y += 0.9
  }
  if (slide.watchouts?.length) {
    addWatchBox(pptx, s, M, y, W - 2 * M, 0.55, slide.watchouts)
  }
}

function renderFlow(pptx, s, slide, y0) {
  const flow = slide.flow || []
  const n = flow.length
  const arrowW = 0.3
  const gap = 0.12
  const bw = (W - 2 * M - (n - 1) * (arrowW + 2 * gap)) / n
  const bh = 1.5
  flow.forEach((f, i) => {
    const x = M + i * (bw + arrowW + 2 * gap)
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: y0, w: bw, h: bh, fill: { color: WHITE }, line: { color: SLATE200 }, rectRadius: 0.07,
    })
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + bw / 2 - 0.07, y: y0 + 0.18, w: 0.14, h: 0.14, fill: { color: EMR }, line: { color: EMR },
    })
    s.addText(f.label, {
      x: x + 0.08, y: y0 + 0.42, w: bw - 0.16, h: 0.5, align: 'center', valign: 'middle',
      fontFace: FONT, fontSize: 13, bold: true, color: INK,
    })
    if (f.sub) {
      s.addText(f.sub, {
        x: x + 0.08, y: y0 + 0.92, w: bw - 0.16, h: 0.45, align: 'center', valign: 'top',
        fontFace: FONT, fontSize: 10, color: SLATE500,
      })
    }
    if (i < n - 1) {
      s.addShape(pptx.ShapeType.rightArrow, {
        x: x + bw + gap, y: y0 + bh / 2 - 0.1, w: arrowW, h: 0.2,
        fill: { color: EMR }, line: { color: EMR },
      })
    }
  })

  let y = y0 + bh + 0.35
  if (slide.stats?.length) {
    const sw = (W - 2 * M - 3 * 0.2) / 4
    slide.stats.forEach((st, i) => {
      const x = M + i * (sw + 0.2)
      s.addShape(pptx.ShapeType.roundRect, {
        x, y, w: sw, h: 1.05, fill: { color: WHITE }, line: { color: SLATE200 }, rectRadius: 0.06,
      })
      s.addText(st.label, { x: x + 0.15, y: y + 0.1, w: sw - 0.3, h: 0.26, fontFace: FONT, fontSize: 10, color: SLATE500 })
      s.addText(String(st.value), { x: x + 0.15, y: y + 0.36, w: sw - 0.3, h: 0.4, fontFace: FONT, fontSize: 22, bold: true, color: INK })
      if (st.sub) s.addText(st.sub, { x: x + 0.15, y: y + 0.76, w: sw - 0.3, h: 0.24, fontFace: FONT, fontSize: 9.5, color: SLATE400 })
    })
    y += 1.25
  }
  if (slide.bullets?.length) {
    const rows = slide.bullets.map((t) => ({ text: t, options: { bullet: true, fontSize: 12, color: SLATE600, paraSpaceAfter: 6 } }))
    s.addText(rows, { x: M, y, w: W - 2 * M, h: H - y - (slide.watchouts?.length ? 1.0 : 0.4), fontFace: FONT, valign: 'top' })
    y += 0.0
  }
  if (slide.watchouts?.length) {
    addWatchBox(pptx, s, M, H - 1.0, W - 2 * M, 0.6, slide.watchouts)
  }
}

function renderLanes(pptx, s, slide, y0) {
  const lanes = slide.lanes || []
  const n = lanes.length
  const gap = 0.24
  const lw = (W - 2 * M - (n - 1) * gap) / n
  const laneH = H - y0 - (slide.watchouts?.length ? 1.05 : 0.45)

  lanes.forEach((lane, i) => {
    const x = M + i * (lw + gap)
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: y0, w: lw, h: laneH, fill: { color: WHITE }, line: { color: SLATE200 }, rectRadius: 0.06,
    })
    s.addShape(pptx.ShapeType.rect, {
      x: x + 0.01, y: y0 + 0.01, w: lw - 0.02, h: 0.5, fill: { color: 'F1F5F9' }, line: { color: 'F1F5F9' },
    })
    s.addText(lane.title, {
      x: x + 0.18, y: y0 + 0.03, w: lw - 0.36, h: 0.46,
      fontFace: FONT, fontSize: 13, bold: true, color: INK, valign: 'middle',
    })
    const rows = lane.items.map((t) => ({
      text: t,
      options: {
        bullet: { code: '2022' }, fontSize: 11, color: SLATE600, paraSpaceAfter: 7,
      },
    }))
    s.addText(rows, {
      x: x + 0.18, y: y0 + 0.62, w: lw - 0.36, h: laneH - 0.75,
      fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.05,
    })
  })

  if (slide.watchouts?.length) {
    addWatchBox(pptx, s, M, H - 0.95, W - 2 * M, 0.55, slide.watchouts)
  }
}

function renderBullets(pptx, s, slide, y0) {
  const bullets = slide.bullets || []
  const twoCol = bullets.length > 4
  const rows = bullets.map((t) => ({
    text: t,
    options: { bullet: { code: '2713' }, fontSize: 13, color: SLATE600, paraSpaceAfter: 10 },
  }))
  s.addText(rows, {
    x: M, y: y0, w: W - 2 * M, h: H - y0 - (slide.watchouts?.length ? 1.1 : 0.5),
    fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.1,
    ...(twoCol ? { breakLine: false } : {}),
  })
  if (slide.watchouts?.length) {
    addWatchBox(pptx, s, M, H - 0.95, W - 2 * M, 0.55, slide.watchouts)
  }
}

function renderDivider(pptx, s, slide, index, total) {
  s.background = { color: BG }
  s.addText(String(slide.sectionNo).padStart(2, '0'), {
    x: M, y: 1.3, w: 3.2, h: 2.6,
    fontFace: FONT, fontSize: 130, bold: true, color: 'C7E9DC',
  })
  s.addText(`BAGIAN ${slide.sectionNo}`, {
    x: 3.9, y: 1.35, w: 6, h: 0.35,
    fontFace: FONT, fontSize: 13, bold: true, color: 'B45309', charSpacing: 3,
  })
  s.addText(slide.title, {
    x: 3.9, y: 1.7, w: W - 3.9 - M, h: 0.95,
    fontFace: FONT, fontSize: 42, bold: true, color: INK,
  })
  s.addText(slide.description || '', {
    x: 3.9, y: 2.7, w: W - 3.9 - M, h: 0.7,
    fontFace: FONT, fontSize: 15, color: SLATE500, lineSpacingMultiple: 1.15,
  })
  const items = slide.sectionItems || []
  const half = Math.ceil(items.length / 2)
  const mk = (list, offset = 0) => list.map((t, i) => ({
    text: `${offset + i + 1}. ${t}`, options: { fontSize: 13, color: SLATE600, paraSpaceAfter: 8 },
  }))
  s.addText(mk(items.slice(0, half), 0), {
    x: 3.9, y: 3.6, w: 4.4, h: 2.8, fontFace: FONT, valign: 'top',
  })
  s.addText(mk(items.slice(half), half), {
    x: 8.5, y: 3.6, w: 4.2, h: 2.8, fontFace: FONT, valign: 'top',
  })
  s.addText(`${index + 1} / ${total}`, {
    x: W - M - 2, y: H - 0.55, w: 2, h: 0.3, align: 'right',
    fontFace: FONT, fontSize: 10, color: SLATE400,
  })
}

function renderCover(pptx, s, slide) {
  s.background = { color: BG }
  // panel kanan emerald
  s.addShape(pptx.ShapeType.roundRect, {
    x: W - 4.55, y: 0.4, w: 4.15, h: H - 0.8, fill: { color: '064E3B' }, line: { color: '064E3B' }, rectRadius: 0.12,
  })
  let sy = 0.95
  ;(slide.coverStats || []).forEach((st) => {
    s.addText(st.label, { x: W - 4.25, y: sy, w: 3.5, h: 0.3, fontFace: FONT, fontSize: 11, color: 'A7F3D0' })
    s.addText(String(st.value), { x: W - 4.25, y: sy + 0.28, w: 3.5, h: 0.75, fontFace: FONT, fontSize: 40, bold: true, color: WHITE })
    s.addText(st.sub, { x: W - 4.25, y: sy + 1.02, w: 3.5, h: 0.3, fontFace: FONT, fontSize: 10.5, color: 'D1FAE5' })
    sy += 1.75
  })

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 0.55, w: 0.55, h: 0.55, fill: { color: EMR }, line: { color: EMR }, rectRadius: 0.08,
  })
  s.addText('MC', { x: M, y: 0.55, w: 0.55, h: 0.55, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 14, bold: true, color: WHITE })
  s.addText('MIN Cendekia (Demo) · Sistem Presensi & Perpustakaan', {
    x: M + 0.7, y: 0.55, w: 6.5, h: 0.55, fontFace: FONT, fontSize: 14, bold: true, color: INK, valign: 'middle',
  })

  s.addText('DOKUMENTASI & PANDUAN INTERAKTIF', {
    x: M, y: 2.0, w: 7.8, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: EMR, charSpacing: 4,
  })
  s.addText(slide.title, {
    x: M, y: 2.4, w: 7.9, h: 1.7,
    fontFace: FONT, fontSize: 54, bold: true, color: INK,
  })
  s.addShape(pptx.ShapeType.rect, { x: M, y: 4.2, w: 1.5, h: 0.07, fill: { color: EMR }, line: { color: EMR } })
  s.addShape(pptx.ShapeType.rect, { x: M + 1.65, y: 4.2, w: 0.55, h: 0.07, fill: { color: GOLD }, line: { color: GOLD } })
  s.addText(slide.subtitle || '', {
    x: M, y: 4.5, w: 7.7, h: 1.0,
    fontFace: FONT, fontSize: 17, color: SLATE600, lineSpacingMultiple: 1.2,
  })
  let mx = M
  ;(slide.meta || []).forEach((m) => {
    s.addText(m, {
      x: mx, y: 5.65, w: 2.4, h: 0.4, align: 'center', valign: 'middle',
      fontFace: FONT, fontSize: 11, bold: true, color: EMR,
      fill: { color: EMR_50 }, line: { color: EMR_200 },
      shape: pptx.ShapeType.roundRect, rectRadius: 0.08,
    })
    mx += 2.55
  })
  s.addText('Seluruh data pada tutorial ini fiktif (demo) · /tutorial', {
    x: M, y: H - 0.62, w: 7.5, h: 0.3, fontFace: FONT, fontSize: 10, color: SLATE400,
  })
}

/**
 * Generate & unduh PPTX dari slides model.
 * @param {Array} slideList — output import slides (shared model)
 */
export async function exportPptx(slideList) {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  // LAYOUT_WIDE =13.333in × 7.5in (16:9) — konsisten dengan konstanta W/H
  // di file ini dan dengan stage HTML1920×1080.
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Tutorial Presensi Siswa (demo)'
  pptx.company = 'MIN Cendekia (Demo)'
  pptx.title = 'Tutorial Presensi Siswa'

  const total = slideList.length

  slideList.forEach((slide, index) => {
    const s = pptx.addSlide()

    if (slide.layout === 'cover') {
      renderCover(pptx, s, slide)
      return
    }
    if (slide.layout === 'divider') {
      renderDivider(pptx, s, slide, index, total)
      return
    }

    const y0 = header(pptx, s, slide, index, total)

    switch (slide.layout) {
      case 'feature':
        renderFeature(pptx, s, slide, y0)
        break
      case 'grid':
        renderGrid(pptx, s, slide, y0)
        break
      case 'flow':
        renderFlow(pptx, s, slide, y0)
        break
      case 'lanes':
        renderLanes(pptx, s, slide, y0)
        break
      case 'bullets':
      case 'closing':
        if (slide.layout === 'closing') {
          renderGrid(pptx, s, { ...slide, bullets: null, watchouts: null }, y0)
        } else {
          renderBullets(pptx, s, slide, y0)
        }
        break
      default:
        renderBullets(pptx, s, { ...slide, bullets: slide.bullets || [slide.description || slide.title] }, y0)
    }
  })

  await pptx.writeFile({ fileName: 'tutorial-presensi-siswa.pptx' })
  return true
}

// Re-eksport warna agar konsisten (dipakai unit test/verifikasi manual)
export const PPTX_ATTENDANCE = ATTENDANCE_COLORS
