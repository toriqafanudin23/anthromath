export const r2 = (n) => Math.round(n * 100) / 100 || 0
// Angka desimal memakai titik (1.5, 3.9), bukan koma
export const fmt = (n) => String(r2(n)).replace('-', '−')
// Versi untuk LaTeX: tanda minus biasa, KaTeX yang menggambar tanda minus yang benar
export const tx = (n) => String(r2(n))

export const STEPS = [0.1, 0.2, 0.5, 1]

export const LIM = {
  a: [-5, 5], b: [-10, 10], c: [-10, 10],
  h: [-8, 8], k: [-8, 8], x1: [-8, 8], x2: [-8, 8],
}

export const MODES = [
  { id: 'general', name: 'Umum', f: 'ax^{2}+bx+c' },
  { id: 'vertex', name: 'Puncak', f: 'a(x-h)^{2}+k' },
  { id: 'factor', name: 'Faktor', f: 'a(x-x_{1})(x-x_{2})' },
]

// Ketiga bentuk default menggambar parabola yang sama: x² − 2x − 3
export const DEFAULTS = {
  general: { a: 1, b: -2, c: -3 },
  vertex: { a: 1, h: 1, k: -4 },
  factor: { a: 1, x1: -1, x2: 3 },
}

// label = teks biasa (aria-label), tex = simbol LaTeX
export const PARAMS = {
  general: [
    { key: 'a', label: 'a', tex: 'a', hint: 'arah dan lebar parabola' },
    { key: 'b', label: 'b', tex: 'b', hint: 'menggeser sumbu simetri' },
    { key: 'c', label: 'c', tex: 'c', hint: 'titik potong sumbu y' },
  ],
  vertex: [
    { key: 'a', label: 'a', tex: 'a', hint: 'arah dan lebar parabola' },
    { key: 'h', label: 'h', tex: 'h', hint: 'absis titik puncak' },
    { key: 'k', label: 'k', tex: 'k', hint: 'ordinat titik puncak' },
  ],
  factor: [
    { key: 'a', label: 'a', tex: 'a', hint: 'arah dan lebar parabola' },
    { key: 'x1', label: 'x₁', tex: 'x_{1}', hint: 'akar pertama' },
    { key: 'x2', label: 'x₂', tex: 'x_{2}', hint: 'akar kedua' },
  ],
}

export function toCanon(mode, p) {
  if (mode === 'general') return { a: p.a, b: p.b, c: p.c }
  if (mode === 'vertex') return { a: p.a, b: -2 * p.a * p.h, c: p.a * p.h * p.h + p.k }
  return { a: p.a, b: -p.a * (p.x1 + p.x2), c: p.a * p.x1 * p.x2 }
}

// a = 0 diperbolehkan: grafik menjadi garis lurus (fungsi linear)
export function derive({ a, b, c }) {
  if (a === 0) {
    const roots = b !== 0 ? [-c / b] : []
    return { a: 0, b, c, linear: true, vx: 0, vy: c, D: null, roots }
  }
  const vx = -b / (2 * a)
  const vy = a * vx * vx + b * vx + c
  let D = b * b - 4 * a * c
  if (Math.abs(D) < 1e-9) D = 0
  const s = Math.sqrt(Math.max(D, 0))
  const roots = D >= 0 ? [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((p, q) => p - q) : []
  return { a, b, c, linear: false, vx, vy, D, roots }
}

const coef = (a) => (a === 1 ? '' : a === -1 ? '-' : tx(a))
const shift = (r) => (r2(r) === 0 ? 'x' : `(x ${r < 0 ? '+' : '-'} ${tx(Math.abs(r))})`)

// Polinom ax² + bx + c; suku bernilai nol dihilangkan
function poly(a, b, c) {
  const terms = [[a, 'x^{2}'], [b, 'x'], [c, '']].filter(([v]) => v !== 0)
  if (!terms.length) return '0'
  return terms
    .map(([v, body], i) => {
      const mag = Math.abs(v) === 1 && body ? '' : tx(Math.abs(v))
      const sign = v < 0 ? '-' : '+'
      return (i === 0 ? (v < 0 ? '-' : '') : ` ${sign} `) + mag + body
    })
    .join('')
}

// Semua bentuk ditulis sebagai string LaTeX
export function forms(d) {
  const a = r2(d.a), b = r2(d.b), c = r2(d.c), vx = r2(d.vx), vy = r2(d.vy)
  const general = poly(a, b, c)

  if (d.linear) {
    const approxLin = d.roots.length > 0 && Math.abs(d.roots[0] - r2(d.roots[0])) > 1e-9
    const factor = d.roots.length ? `${coef(b)}${shift(d.roots[0])}` : null
    return { general, vertex: null, factor, approx: approxLin, linear: true }
  }

  const vertex = `${coef(a)}${shift(vx)}^{2}` + (vy ? ` ${vy < 0 ? '-' : '+'} ${tx(Math.abs(vy))}` : '')
  let factor = null
  let approx = false
  if (d.roots.length) {
    const [p, q] = d.roots
    approx = Math.abs(p - r2(p)) > 1e-9 || Math.abs(q - r2(q)) > 1e-9
    factor = Math.abs(p - q) < 1e-9 ? `${coef(a)}${shift(p)}^{2}` : `${coef(a)}${shift(p)}${shift(q)}`
  }
  return { general, vertex, factor, approx, linear: false }
}
