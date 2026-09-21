// Guard: deteksi binding template yang tidak terdefinisi di <script setup>.
// Meng-compile setiap .vue dengan @vue/compiler-sfc lalu mencari referensi
// `_ctx.*` pada kode template hasil kompilasi produksi — itu penanda
// binding yang TIDAK dideklarasikan (akan error "x is not a function"
// saat runtime). Jalankan: node scripts/check-template-bindings.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const SRC = new URL('../src', import.meta.url).pathname
let failures = 0
let checked = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (name.endsWith('.vue')) check(p)
  }
}

function check(file) {
  const source = readFileSync(file, 'utf8')
  const { descriptor } = parse(source, { filename: file })
  if (!descriptor.template) return

  let bindings = {}
  try {
    const script = compileScript(descriptor, { id: 'x' })
    bindings = script.bindings || {}
  } catch (e) {
    console.log(`✗ ${relative(SRC, file)}: gagal compile script — ${e.message}`)
    failures++
    return
  }

  const result = compileTemplate({
    id: 'x',
    filename: file,
    source: descriptor.template.content,
    compilerOptions: { bindingMetadata: bindings },
  })
  const unresolved = [...result.code.matchAll(/_ctx\.([A-Za-z0-9_$]+)/g)].map((m) => m[1])
  // `_ctx.$slots` / `_ctx.$emit` / `_ctx.$props` adalah properti internal Vue yang valid.
  const missing = [...new Set(unresolved)].filter((x) => !/^\$/.test(x))
  checked++
  if (missing.length) {
    failures++
    console.log(`✗ ${relative(SRC, file)} — binding tak terdefinisi: ${missing.join(', ')}`)
  }
}

walk(SRC)
console.log(`\nDiperiksa: ${checked} file .vue`)
if (failures) {
  console.log(`RESULT: FAIL (${failures} masalah)`)
  process.exit(1)
} else {
  console.log('RESULT: OK — semua binding template terdefinisi ✓')
}
