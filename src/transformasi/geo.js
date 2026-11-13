// Logika transformasi geometri (murni) + objek papan JSXGraph untuk mode Transformasi.
import { COLORS } from './config.js'
const f = (n) => String(+(+n).toFixed(2)).replace('-', '−')
const sg = (v) => (v < 0 ? '-' : '+') + f(Math.abs(v))

export const AXES = { x: 'sumbu x', y: 'sumbu y', yx: 'y = x', ynx: 'y = −x', xh: 'x = h', yk: 'y = k' }
export const TITLES = { translate: 'Translasi', reflect: 'Refleksi', rotate: 'Rotasi', dilate: 'Dilatasi' }
export const NEW_STEP = {
  translate: { type: 'translate', dx: 3, dy: 2 },
  reflect: { type: 'reflect', axis: 'y', v: 0 },
  rotate: { type: 'rotate', cx: 0, cy: 0, deg: 90 },
  dilate: { type: 'dilate', cx: 0, cy: 0, k: 2 },
}
export const GEO0 = { pts: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 2, y: 3 }], steps: [] }

// u = 0..1 menggerakkan titik dari posisi awal ke hasil (animasi)
export function applyStep(s, x, y, u) {
  if (s.type === 'translate') return [x + u * s.dx, y + u * s.dy]
  if (s.type === 'reflect') {
    const v = s.v || 0
    const r = { x: [x, -y], y: [-x, y], yx: [y, x], ynx: [-y, -x], xh: [2 * v - x, y], yk: [x, 2 * v - y] }[s.axis]
    return [x + u * (r[0] - x), y + u * (r[1] - y)]
  }
  if (s.type === 'rotate') {
    const a = (u * s.deg * Math.PI) / 180, dx = x - s.cx, dy = y - s.cy
    return [s.cx + dx * Math.cos(a) - dy * Math.sin(a), s.cy + dx * Math.sin(a) + dy * Math.cos(a)]
  }
  const k = 1 + u * (s.k - 1)
  return [s.cx + k * (x - s.cx), s.cy + k * (y - s.cy)]
}
// bayangan setelah j langkah pertama, pada kemajuan animasi t (0..banyak langkah)
export function chainTo(x, y, steps, j, t) {
  let p = [x, y]
  for (let i = 0; i < j; i++) p = applyStep(steps[i], p[0], p[1], Math.min(1, Math.max(0, t - i)))
  return p
}

// aturan pemetaan dalam LaTeX
export function rule(s) {
  const o = s.cx === 0 && s.cy === 0
  if (s.type === 'translate') return `(x,y)\\to(x${sg(s.dx)},\\,y${sg(s.dy)})`
  if (s.type === 'reflect') {
    const v = f(s.v || 0)
    return { x: '(x,-y)', y: '(-x,y)', yx: '(y,x)', ynx: '(-y,-x)', xh: `(${2 * (s.v || 0) === 0 ? '' : f(2 * s.v) + '-'}x,\\,y)`, yk: `(x,\\,${2 * (s.v || 0) === 0 ? '' : f(2 * s.v) + '-'}y)` }[s.axis]
      .replace(/^/, `(x,y)\\to`) + (s.axis === 'xh' || s.axis === 'yk' ? `\\quad(${s.axis === 'xh' ? 'h' : 'k'}=${v})` : '')
  }
  if (s.type === 'rotate') {
    const d = ((s.deg % 360) + 360) % 360
    const m = o && { 90: '(-y,x)', 180: '(-x,-y)', 270: '(y,-x)' }[d]
    return m ? `(x,y)\\to${m}` : `\\text{putar }${f(s.deg)}^\\circ\\text{ berlawanan arah jarum jam, pusat }(${f(s.cx)},${f(s.cy)})`
  }
  return o ? `(x,y)\\to(${f(s.k)}x,\\,${f(s.k)}y)` : `\\text{faktor }${f(s.k)}\\text{, pusat }(${f(s.cx)},${f(s.cy)})`
}

// Dipanggil Graph setelah papan siap: membuat titik asal (bisa digeser), bayangan tiap langkah, garis bantu.
export function makeExtra({ pts, steps, tRef, cb, trace }) {
  return (b, JXG) => {
    const objs = []
    const mk = (type, args, at) => { const o = b.create(type, args, at); objs.push(o); return o }
    const n = steps.length
    const name = (i) => String.fromCharCode(65 + (i % 26))
    const lab = { offset: [6, 6], fontSize: 13 }
    const base = { highlight: false, showInfobox: false }

    const shape = (P, col, dash) => P.length >= 3
      ? mk('polygon', P, { ...base, fixed: true, fillColor: col, fillOpacity: 0.12, borders: { strokeColor: col, strokeWidth: 2, dash, highlight: false } })
      : P.length === 2 && mk('segment', P, { ...base, fixed: true, strokeColor: col, strokeWidth: 2, dash })

    const O = pts.map((p, i) => mk('point', [p.x, p.y], { ...base, name: name(i), size: 4, fillColor: COLORS[5], strokeColor: '#fff', snapToGrid: true, snapSizeX: 0.5, snapSizeY: 0.5, label: lab }))
    O.forEach((o, i) => o.on('up', () => cb.current.move(i, +o.X().toFixed(2), +o.Y().toFixed(2))))
    shape(O, COLORS[5], 0)

    const I = [O]
    for (let j = 1; j <= n; j++) {
      const col = COLORS[(j % 5) + (j % 5 === 0 ? 5 : 0) ] // 1..4, lalu 0 (jingga)
      const P = O.map((o, i) => mk('point', [
        () => chainTo(o.X(), o.Y(), steps, j, tRef.current)[0],
        () => chainTo(o.X(), o.Y(), steps, j, tRef.current)[1],
      ], { ...base, name: name(i) + "'".repeat(j), size: 3, fillColor: col, strokeColor: col, fixed: true, trace, label: lab }))
      I.push(P)
      shape(P, col, 0)
      const s = steps[j - 1], line = { ...base, fixed: true, strokeColor: col, strokeWidth: 1.5, dash: 2 }
      if (s.type === 'translate') P.forEach((q, i) => mk('arrow', [I[j - 1][i], q], { ...line, strokeOpacity: 0.5, dash: 0 }))
      if (s.type === 'reflect') {
        const v = s.v || 0
        const L = { x: [[0, 0], [1, 0]], y: [[0, 0], [0, 1]], yx: [[0, 0], [1, 1]], ynx: [[0, 0], [1, -1]], xh: [[v, 0], [v, 1]], yk: [[0, v], [1, v]] }[s.axis]
        mk('line', L, line)
      }
      if (s.type === 'rotate' || s.type === 'dilate') mk('point', [s.cx, s.cy], { ...base, name: 'P', face: 'cross', size: 4, strokeColor: col, fixed: true, label: lab })
    }

    // ketuk papan untuk menambah titik (bukan saat menggeser)
    let down = null
    const dn = (e) => { if (cb.current.adding) down = b.getMousePosition(e) }
    const up = (e) => {
      if (!cb.current.adding || !down) return
      const p = b.getMousePosition(e)
      const onPoint = b.getAllObjectsUnderMouse(e).some((o) => o.elementClass === JXG.OBJECT_CLASS_POINT)
      if (Math.hypot(p[0] - down[0], p[1] - down[1]) < 6 && !onPoint) {
        const c = new JXG.Coords(JXG.COORDS_BY_SCREEN, p, b)
        cb.current.add(Math.round(c.usrCoords[1] * 2) / 2, Math.round(c.usrCoords[2] * 2) / 2)
      }
      down = null
    }
    b.on('down', dn); b.on('up', up)
    return () => {
      b.off('down', dn); b.off('up', up)
      try { b.clearTraces() } catch {}
      ;[...objs].reverse().forEach((o) => { try { b.removeObject(o) } catch {} })
    }
  }
}
