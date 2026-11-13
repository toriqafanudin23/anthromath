// Logika murni: titik puncak, titik potong sumbu, dan titik potong antar grafik pada rentang x terlihat.
const N = 700
const ok = Number.isFinite
const fx = (n) => String(+(+n).toFixed(2)).replace('-', '−')
export const pointLabel = (x, y) => `(${fx(x === 0 ? 0 : x)}, ${fx(y === 0 ? 0 : y)})`

function bisect(h, a, b) {
  let fa = h(a)
  for (let i = 0; i < 50; i++) {
    const m = (a + b) / 2, fm = h(m)
    if (!ok(fm)) return NaN
    if (fa * fm <= 0) b = m
    else { a = m; fa = fm }
  }
  return (a + b) / 2
}

// akar h(x)=0 dari perubahan tanda; titik tak-kontinu (asimtot) dibuang lewat pemeriksaan sisa
function zeros(h, hs, xs, f) {
  const out = []
  for (let i = 0; i < xs.length; i++) {
    if (hs[i] === 0) { out.push(xs[i]); continue }
    if (i && hs[i - 1] * hs[i] < 0) {
      const r = bisect(h, xs[i - 1], xs[i])
      if (ok(r) && Math.abs(h(r)) < 1e-5 * (1 + Math.abs(f(r)))) out.push(r)
    }
  }
  return out
}

function extrema(f, xs, ys) {
  const out = [], gr = 0.6180339887
  for (let i = 1; i < xs.length - 1; i++) {
    const l = ys[i - 1], c = ys[i], r = ys[i + 1]
    if (![l, c, r].every(ok)) continue
    const mx = c > l && c >= r, mn = c < l && c <= r
    if (!mx && !mn) continue
    if (Math.max(Math.abs(c - l), Math.abs(c - r)) < 1e-9 * (1 + Math.abs(c))) continue
    const s = mx ? -1 : 1, g = (x) => s * f(x)
    let a = xs[i - 1], b = xs[i + 1]
    let c1 = b - gr * (b - a), c2 = a + gr * (b - a), g1 = g(c1), g2 = g(c2)
    for (let k = 0; k < 60; k++) {
      if (g1 < g2) { b = c2; c2 = c1; g2 = g1; c1 = b - gr * (b - a); g1 = g(c1) }
      else { a = c1; c1 = c2; g1 = g2; c2 = a + gr * (b - a); g2 = g(c2) }
    }
    const x = (a + b) / 2, y = f(x)
    if (ok(y) && Math.abs(y) < 1e6) out.push([x, y])
  }
  return out
}

// fns: [{ f, color }]; kembalian: [{ x, y, color }]
export function keyPoints(fns, [x1, ymax, x2, ymin], { ext, roots, cross }) {
  if (!(x2 > x1)) return []
  const xs = Array.from({ length: N + 1 }, (_, i) => x1 + ((x2 - x1) * i) / N)
  const all = fns.map((fn) => ({ ...fn, ys: xs.map(fn.f) }))
  const out = []
  const add = (x, y, color) => ok(x) && ok(y) && x >= x1 && x <= x2 && y >= ymin && y <= ymax && out.push({ x, y, color })

  for (const g of all) {
    if (ext) for (const [x, y] of extrema(g.f, xs, g.ys)) add(x, y, g.color)
    if (roots) {
      for (const x of zeros(g.f, g.ys, xs, g.f)) add(x, 0, g.color)
      const y0 = g.f(0)
      if (ok(y0)) add(0, y0, g.color)
    }
  }
  if (cross) {
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const f = all[i].f, g = all[j].f, h = (x) => f(x) - g(x)
      const hs = all[i].ys.map((y, k) => y - all[j].ys[k])
      for (const x of zeros(h, hs, xs, f)) add(x, f(x), '#3d3929')
    }
  }
  const seen = new Set()
  return out.filter((p) => { const k = `${p.x.toFixed(3)},${p.y.toFixed(3)}`; return !seen.has(k) && seen.add(k) }).slice(0, 60)
}
