import { BOX0, MAX_PTS, MAX_STEPS, VIEW_DEFAULTS } from './config.js'
import { AXES, GEO0 } from './geo.js'

const VERSION = 1
const num = (n, lim) => (Number.isFinite(n) ? Math.min(lim, Math.max(-lim, n)) : 0)
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))

export function encodeState({ geo, trace, view, box }) {
  const w = {}
  for (const k in VIEW_DEFAULTS) if (view[k] !== VIEW_DEFAULTS[k]) w[k] = view[k]
  return b64(JSON.stringify({ v: VERSION, p: geo.pts.map((p) => [p.x, p.y]), s: geo.steps, t: trace ? 1 : 0, w, b: box }))
}

function step(s) {
  if (!s || typeof s !== 'object') return null
  if (s.type === 'translate') return { type: 'translate', dx: num(s.dx, 50), dy: num(s.dy, 50) }
  if (s.type === 'reflect') return { type: 'reflect', axis: Object.hasOwn(AXES, s.axis) ? s.axis : 'y', v: num(s.v, 50) }
  if (s.type === 'rotate') return { type: 'rotate', cx: num(s.cx, 50), cy: num(s.cy, 50), deg: num(s.deg, 720) }
  if (s.type === 'dilate') return { type: 'dilate', cx: num(s.cx, 50), cy: num(s.cy, 50), k: num(s.k, 20) }
  return null
}

// Isi tautan tidak pernah dipercaya: semua dibatasi dan diperiksa tipenya.
export function decodeState(code) {
  try {
    const d = JSON.parse(unb64(code))
    if (!d || d.v !== VERSION) return null
    const pts = (Array.isArray(d.p) ? d.p : []).slice(0, MAX_PTS)
      .filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1]))
      .map((r) => ({ x: num(r[0], 50), y: num(r[1], 50) }))
    const steps = (Array.isArray(d.s) ? d.s : []).slice(0, MAX_STEPS).map(step).filter(Boolean)
    const view = { ...VIEW_DEFAULTS }
    for (const k of Object.keys(VIEW_DEFAULTS)) if (typeof d.w?.[k] === 'boolean') view[k] = d.w[k]
    const [x1, y1, x2, y2] = Array.isArray(d.b) ? d.b : []
    const ok = [x1, y1, x2, y2].every(Number.isFinite) && x1 < x2 && y2 < y1 && x2 - x1 < 1e4 && y1 - y2 < 1e4 && x2 - x1 > 1e-3
    return { geo: { pts: pts.length ? pts : GEO0.pts, steps }, trace: d.t !== 0, view, box: ok ? [x1, y1, x2, y2] : BOX0 }
  } catch { return null }
}

export const shareUrl = (state) => `${location.origin}${location.pathname}#d=${encodeState(state)}`
export const readHash = () => {
  const m = location.hash.match(/^#d=([\w-]+)$/)
  return m ? decodeState(m[1]) : null
}
