import { BOX0, MAX_ITEMS, STEPS, VIEW_DEFAULTS, VIEW_LIMITS } from './config.js'
import { MAX_PARAMS, validName } from './param.js'

const VERSION = 3
const clamp = (n, [lo, hi]) => Math.min(hi, Math.max(lo, n))
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))

export function encodeState({ items, params, step, view, box }) {
  const w = {}
  for (const k in VIEW_DEFAULTS) if (view[k] !== VIEW_DEFAULTS[k]) w[k] = view[k]
  return b64(JSON.stringify({
    v: VERSION, i: items.map((i) => [i.tex, i.on ? 1 : 0]),
    p: params.map((p) => [p.name, p.value, p.lim, p.v0]), s: step, w, b: box,
  }))
}

// Isi tautan tidak pernah dipercaya: semua dibatasi dan diperiksa tipenya.
export function decodeState(code) {
  try {
    const d = JSON.parse(unb64(code))
    if (!d || d.v !== VERSION || !Array.isArray(d.i)) return null
    const items = d.i.slice(0, MAX_ITEMS)
      .filter((r) => Array.isArray(r) && typeof r[0] === 'string' && r[0].length <= 120)
      .map((r) => ({ tex: r[0], on: r[1] !== 0 }))
    const params = []
    for (const r of (Array.isArray(d.p) ? d.p : []).slice(0, MAX_PARAMS)) {
      if (!Array.isArray(r) || !validName(r[0]) || params.some((p) => p.name === r[0])) continue
      const [name, value, lim, v0] = r
      if (![value, lim, v0].every(Number.isFinite)) continue
      const L = clamp(lim, [1, 1000])
      params.push({ name, value: clamp(value, [-L, L]), lim: L, v0: clamp(v0, [-L, L]) })
    }
    const view = { ...VIEW_DEFAULTS }
    for (const k of ['grid', 'axis', 'nums', 'ext', 'roots', 'cross']) if (typeof d.w?.[k] === 'boolean') view[k] = d.w[k]
    if (Number.isFinite(d.w?.width)) view.width = clamp(d.w.width, VIEW_LIMITS.width)
    const [x1, y1, x2, y2] = Array.isArray(d.b) ? d.b : []
    const ok = [x1, y1, x2, y2].every(Number.isFinite) && x1 < x2 && y2 < y1 && x2 - x1 < 1e4 && y1 - y2 < 1e4 && x2 - x1 > 1e-3
    return { items, params, step: STEPS.includes(d.s) ? d.s : 0.2, view, box: ok ? [x1, y1, x2, y2] : BOX0 }
  } catch { return null }
}

export const shareUrl = (state) => `${location.origin}${location.pathname}#d=${encodeState(state)}`
export const readHash = () => {
  const m = location.hash.match(/^#d=([\w-]+)$/)
  return m ? decodeState(m[1]) : null
}
