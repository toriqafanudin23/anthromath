import { DEFAULTS, LIM, MODES, STEPS, r2 } from './math.js'
import { MAX_SHADOWS, SHADOW_COLORS, VIEW_DEFAULTS, VIEW_LIMITS } from './config.js'

// Tautan berbagi: <halaman>#d=<kode>. Kodenya JSON ringkas berversi, di-base64url.
// Hash tidak dikirim ke server, jadi cocok untuk situs statis.
const VERSION = 1
const KEY = 'd'

const r4 = (n) => Math.round(n * 10000) / 10000
const num = (x) => typeof x === 'number' && Number.isFinite(x)
const clamp = (n, [lo, hi]) => Math.min(hi, Math.max(lo, n))

const toB64 = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64 = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))

// state: { mode, params, step, view, shadows: [{a,b,c}], box: [x1,y1,x2,y2] | null }
export function encodeState(state) {
  const view = {}
  for (const k of Object.keys(VIEW_DEFAULTS)) {
    if (state.view[k] !== VIEW_DEFAULTS[k]) view[k] = state.view[k]
  }
  const data = {
    v: VERSION,
    m: state.mode,
    p: state.params,
    s: state.step,
    ...(Object.keys(view).length ? { w: view } : {}),
    ...(state.shadows.length ? { h: state.shadows.map(({ a, b, c }) => [r4(a), r4(b), r4(c)]) } : {}),
    ...(state.box ? { b: state.box.map(r2) } : {}),
  }
  return toB64(JSON.stringify(data))
}

// Mengembalikan state yang sudah dibersihkan, atau null bila kode rusak/tidak dikenal
export function decodeState(code) {
  try {
    const data = JSON.parse(fromB64(code))
    if (!data || data.v !== VERSION) return null

    const mode = MODES.some((m) => m.id === data.m) ? data.m : 'general'

    const params = {}
    for (const m of Object.keys(DEFAULTS)) {
      params[m] = {}
      for (const key of Object.keys(DEFAULTS[m])) {
        const raw = data.p && data.p[m] && data.p[m][key]
        params[m][key] = num(raw) ? clamp(r2(raw), LIM[key]) : DEFAULTS[m][key]
      }
    }

    const step = STEPS.includes(data.s) ? data.s : 0.5

    const view = { ...VIEW_DEFAULTS }
    for (const k of Object.keys(VIEW_DEFAULTS)) {
      const raw = data.w && data.w[k]
      if (typeof VIEW_DEFAULTS[k] === 'boolean') {
        if (typeof raw === 'boolean') view[k] = raw
      } else if (num(raw)) {
        view[k] = Math.round(clamp(raw, VIEW_LIMITS[k]) * 2) / 2
      }
    }
    view.pt = Math.round(view.pt)

    const shadows = (Array.isArray(data.h) ? data.h : [])
      .filter((t) => Array.isArray(t) && t.length === 3 && t.every(num))
      .slice(0, MAX_SHADOWS)
      .map(([a, b, c], i) => ({ a, b, c, color: SHADOW_COLORS[i] }))

    let box = null
    if (Array.isArray(data.b) && data.b.length === 4 && data.b.every(num)) {
      const [x1, y1, x2, y2] = data.b
      const w = x2 - x1, h = y1 - y2
      if (w > 0.5 && h > 0.5 && w < 500 && h < 500) box = [x1, y1, x2, y2]
    }

    return { mode, params, step, view, shadows, box }
  } catch {
    return null
  }
}

export function shareUrl(state, href) {
  return `${href.split('#')[0]}#${KEY}=${encodeState(state)}`
}

export function readHash(hash) {
  const code = new URLSearchParams((hash || '').replace(/^#/, '')).get(KEY)
  return code ? decodeState(code) : null
}
