import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Graph from './Graph.jsx'
import GraphTools from './GraphTools.jsx'
import Tex from './Tex.jsx'
import NumBox from './NumBox.jsx'
import Geo from './Geo.jsx'
import { GEO0, makeExtra } from './geo.js'
import { BOX0, COLORS, MAX_ITEMS, STEPS, VIEW_DEFAULTS } from './config.js'
import { fmt, latexToFn } from './math.js'
import { fill, toParamMode, validName } from './param.js'
import { readHash, shareUrl } from './share.js'

const SYMBOLS = [
  ['x²', '^{2}'], ['a/b', '\\frac{}{}'], ['√', '\\sqrt{}'], ['sin', '\\sin()'], ['cos', '\\cos()'],
  ['tan', '\\tan()'], ['ln', '\\ln()'], ['π', '\\pi'], ['|x|', '|x|'],
]
const DEFAULT_ITEMS = [{ id: 1, tex: 'x^{2}-2x-3', on: true }]
const mk = (list) => list.map((it, i) => ({ id: i + 1, tex: it.tex, on: it.on }))
const round = (n) => Math.round(n * 100) / 100
const toParam = ({ name, value }) => ({ name, value, v0: value, lim: Math.max(5, Math.ceil(Math.abs(value) * 2)) })

function ParamRow({ p, step, color, playing, onPlay, onChange, compact }) {
  return (
    <div className={'prow' + (compact ? ' c' : '')}>
      <span className="pl" style={{ color }}><Tex>{p.name}</Tex></span>
      <button className={'play' + (playing ? ' on' : '')} aria-pressed={playing} aria-label={`${playing ? 'Hentikan' : 'Animasikan'} ${p.name}`} onClick={onPlay}>{playing ? '❚❚' : '▶'}</button>
      {!compact && (
        <input type="range" aria-label={`Nilai ${p.name}`} min={-p.lim} max={p.lim} step={step} value={p.value} onChange={(e) => onChange(+e.target.value)} />
      )}
      <span className="pm">
        <button aria-label={`Kurangi ${p.name}`} onClick={() => onChange(p.value - step)}>−</button>
        <NumBox name={p.name} value={p.value} onCommit={onChange} />
        <button aria-label={`Tambah ${p.name}`} onClick={() => onChange(p.value + step)}>+</button>
      </span>
    </div>
  )
}

export default function App() {
  const [init] = useState(readHash)
  const [items, setItems] = useState(init ? mk(init.items) : DEFAULT_ITEMS)
  const [params, setParams] = useState(init?.params || [])
  const [step, setStep] = useState(init?.step || 0.2)
  const [view, setView] = useState(init?.view || VIEW_DEFAULTS)
  const [fromShare, setFromShare] = useState(!!init)
  const [draft, setDraft] = useState('')
  const [full, setFull] = useState(false)
  const [toast, setToast] = useState('')
  const [play, setPlay] = useState(null)
  const [mode, setMode] = useState('graph')
  const [geo, setGeo] = useState(GEO0)
  const [trace, setTrace] = useState(true)
  const [adding, setAdding] = useState(false)
  const tRef = useRef(0)
  const cb = useRef({})
  cb.current = {
    adding,
    move: (i, x, y) => setGeo((g) => (g.pts[i].x === x && g.pts[i].y === y ? g : { ...g, pts: g.pts.map((p, k) => (k === i ? { x, y } : p)) })),
    add: (x, y) => setGeo((g) => (g.pts.length >= 8 ? g : { ...g, pts: [...g.pts, { x, y }] })),
  }
  const geoExtra = useMemo(() => (mode === 'geo' ? makeExtra({ pts: geo.pts, steps: geo.steps, tRef, cb, trace }) : null), [mode, geo, trace])
  const [ghost, setGhost] = useState(false)
  const graph = useRef(null)
  const wrap = useRef(null)
  const ta = useRef(null)
  const nextId = useRef(100)
  const pr = useRef(params)
  pr.current = params

  const names = params.map((p) => p.name)
  const scope = useMemo(() => Object.fromEntries(params.map((p) => [p.name, p.value])), [params])

  const compiled = useMemo(
    () => items.map((it, i) => {
      const color = COLORS[i % COLORS.length]
      try { return { ...it, color, ...latexToFn(it.tex) } }
      catch (e) { return { ...it, color, vars: [], compileErr: 'Tidak bisa digambar: ' + e.message } }
    }),
    [items]
  )
  const key = names.join()
  const parsed = useMemo(
    () => compiled.map((c) => {
      const missing = c.vars.filter((v) => !names.includes(v))
      let canMake = false
      try { canMake = !c.compileErr && toParamMode(c.tex, names).params.length > 0 } catch {}
      return {
        ...c, missing, canMake,
        fixable: missing.length > 0 && missing.every(validName),
        err: c.compileErr || (missing.length ? `Parameter ${missing.join(', ')} belum dibuat` : ''),
      }
    }),
    // eslint-disable-next-line
    [compiled, key]
  )
  const fns = useMemo(
    () => parsed.filter((p) => p.on && p.fn && !p.err).map((p) => ({ color: p.color, f: (x) => p.fn(x, scope) })),
    [parsed, scope]
  )

  const scope0 = useMemo(() => Object.fromEntries(params.map((p) => [p.name, p.v0])), [params])
  const ghosts = useMemo(
    () => (ghost ? parsed.filter((p) => p.on && p.fn && !p.err).map((p) => ({ ghost: true, color: p.color, f: (x) => p.fn(x, scope0) })) : []),
    [ghost, parsed, scope0]
  )
  const allFns = useMemo(() => [...ghosts, ...fns], [ghosts, fns])
  // pemilik parameter = persamaan pertama yang memakai hurufnya
  const ownerOf = (n) => parsed.find((p) => p.vars.includes(n) || p.pn?.includes(n))
  const ownerColor = (n) => ownerOf(n)?.color
  const rowsOf = (id) => params.filter((q) => ownerOf(q.name)?.id === id)
  const live = (p) => (p.fn && !p.err && p.vars.some((v) => names.includes(v)) ? fill(p.tex, scope) : '')

  // animasi: nilai parameter bergerak bolak-balik dari -batas ke +batas (±6 detik sekali jalan)
  useEffect(() => {
    if (!play) return
    let raf, last = performance.now(), dir = 1
    const tick = (now) => {
      const p = pr.current.find((q) => q.name === play)
      if (!p) { setPlay(null); return }
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      let v = p.value + dir * (p.lim / 3) * dt
      if (v >= p.lim) { v = p.lim; dir = -1 } else if (v <= -p.lim) { v = -p.lim; dir = 1 }
      setParams((l) => l.map((q) => (q.name === play ? { ...q, value: v } : q)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play])
  const togglePlay = (n) => {
    if (play === n) { setPlay(null); setParams((l) => l.map((p) => (p.name === n ? { ...p, value: round(p.value) } : p))) }
    else setPlay(n)
  }

  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2400) }
  const patch = (id, p) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)))
  const setValue = (name, v) => {
    if (play === name) setPlay(null)
    setParams((l) => l.map((p) => {
      if (p.name !== name) return p
      const lim = Math.abs(v) > p.lim ? Math.min(1000, Math.ceil((Math.abs(v) * 1.25) / 5) * 5) : p.lim
      return { ...p, lim, value: round(Math.min(lim, Math.max(-lim, v))) }
    }))
  }

  // mode parameter: koefisien (termasuk yang tersirat) dan konstanta menjadi parameter bernama
  const convert = (it, taken) => {
    const r = toParamMode(it.tex, taken)
    if (!r.params.length) return null
    const pn = r.params.map((p) => p.name)
    return { item: { ...it, tex: r.tex, orig: it.orig ?? it.tex, pn: [...(it.pn || []), ...pn] }, params: r.params.map(toParam) }
  }
  const makeParams = (item) => {
    const c = convert(item, names)
    if (!c) return
    setItems((l) => l.map((i) => (i.id === item.id ? c.item : i)))
    setParams((l) => [...l, ...c.params])
  }
  const makeAll = () => {
    let taken = [...names]
    const added = []
    const next = items.map((it) => {
      try {
        const c = convert(it, taken)
        if (!c) return it
        taken = [...taken, ...c.params.map((p) => p.name)]
        added.push(...c.params)
        return c.item
      } catch { return it }
    })
    setItems(next)
    setParams((l) => [...l, ...added])
  }
  // kembali ke angka asli: tex asli dipulihkan, parameter miliknya dihapus
  const revert = (item) => {
    setItems((l) => l.map((i) => (i.id === item.id ? { id: i.id, tex: i.orig, on: i.on } : i)))
    setParams((l) => l.filter((p) => !item.pn.includes(p.name)))
  }
  // huruf yang dipakai di persamaan tapi belum ada parameternya
  const makeMissing = (list) =>
    setParams((l) => [...l, ...list.filter((n) => !l.some((p) => p.name === n)).map((n) => toParam({ name: n, value: 1 }))])

  // hapus persamaan beserta parameternya (kecuali parameter yang masih dipakai persamaan lain)
  const remove = (it) => {
    const rest = parsed.filter((p) => p.id !== it.id)
    const mine = (n) => it.vars.includes(n) || it.pn?.includes(n)
    setItems((l) => l.filter((i) => i.id !== it.id))
    setParams((l) => l.filter((q) => !mine(q.name) || rest.some((r) => r.vars.includes(q.name))))
  }

  const add = () => {
    const tex = draft.trim()
    if (!tex || items.length >= MAX_ITEMS) return
    setItems((l) => [...l, { id: nextId.current++, tex, on: true }])
    setDraft('')
  }
  const insert = (snip) => {
    const t = ta.current, a = t.selectionStart, b = t.selectionEnd
    setDraft(draft.slice(0, a) + snip + draft.slice(b))
    const k = snip.search(/[}\)]/)
    requestAnimationFrame(() => { t.focus(); const c = a + (k >= 0 ? k : snip.length); t.setSelectionRange(c, c) })
  }

  const resetAll = useCallback(() => {
    setItems(DEFAULT_ITEMS); setParams([]); setPlay(null); setGhost(false); setStep(0.2); setView(VIEW_DEFAULTS); setFromShare(false)
    history.replaceState(null, '', location.pathname + location.search)
    graph.current?.setBox(BOX0)
  }, [])

  const share = async () => {
    if (mode === 'geo') return say('Tautan hanya tersedia untuk mode Grafik')
    const url = shareUrl({ items, params, step, view, box: graph.current.getBox() })
    try { await navigator.clipboard.writeText(url); say('Tautan disalin') } catch { window.prompt('Salin tautan ini:', url) }
  }

  const toggleFull = async () => {
    const on = !full
    setFull(on)
    try { if (on) await wrap.current.requestFullscreen?.(); else if (document.fullscreenElement) await document.exitFullscreen() } catch {}
  }

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setFull(false)
    const fsc = () => { if (!document.fullscreenElement) setFull(false) }
    const hash = () => {
      const s = readHash()
      if (!s) return
      setItems(mk(s.items)); setParams(s.params); setStep(s.step); setView(s.view); setFromShare(true)
      graph.current?.setBox(s.box)
    }
    document.addEventListener('keydown', esc)
    document.addEventListener('fullscreenchange', fsc)
    window.addEventListener('hashchange', hash)
    return () => { document.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', fsc); window.removeEventListener('hashchange', hash) }
  }, [])

  return (
    <div className="app">
      <header className="hdr">
        <div className="brand"><i>✻</i>Anthromath</div>
        <div className="hr">
          <h1>Penggambar Grafik</h1>
          <button className="ib" aria-label="Bagikan tautan" title="Bagikan tautan" onClick={share}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" />
              <path d="M8.2 11l7.6-4M8.2 13l7.6 4" />
            </svg>
          </button>
        </div>
      </header>

      <main className="main">
        <section ref={wrap} className={'graphwrap' + (full ? ' full' : '')}>
          <Graph ref={graph} fns={mode === 'geo' ? [] : allFns} extra={geoExtra} view={view} initBox={init?.box || BOX0} />
          <GraphTools view={view} setView={setView} onReset={() => graph.current.setBox(BOX0)} onFull={toggleFull} full={full} />
          {full && mode === 'graph' && (
            <div className="fcard">
              <div className="eqs">{parsed.filter((p) => p.on && !p.err).map((p) => (
                <div key={p.id} className="eq" style={{ color: p.color }}>
                  <Tex>{live(p) || p.tex}</Tex>
                  {live(p) && <small className="gen"><Tex>{p.tex}</Tex></small>}
                </div>
              ))}</div>
              {params.length > 0 && (
                <div className="fp">
                  {params.map((p) => <ParamRow key={p.name} p={p} step={step} compact color={ownerColor(p.name)} playing={play === p.name} onPlay={() => togglePlay(p.name)} onChange={(v) => setValue(p.name, v)} />)}
                  <button className={'mk' + (ghost ? '' : ' alt')} aria-pressed={ghost} onClick={() => setGhost(!ghost)}>Jejak awal</button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="panel">
          <div className="seg" role="group" aria-label="Mode">
            <button aria-pressed={mode === 'graph'} onClick={() => setMode('graph')}>Grafik fungsi</button>
            <button aria-pressed={mode === 'geo'} onClick={() => { setPlay(null); setMode('geo') }}>Transformasi</button>
          </div>
          {mode === 'geo' ? <Geo geo={geo} setGeo={setGeo} trace={trace} setTrace={setTrace} adding={adding} setAdding={setAdding} tRef={tRef} graph={graph} /> : <>
          {fromShare && (
            <div className="note">
              <span>Dibuka dari tautan yang dibagikan</span>
              <button className="link" onClick={resetAll}>Mulai dari awal</button>
            </div>
          )}

          <section>
            <div className="prev" aria-live="polite">{draft.trim() && <Tex>{draft}</Tex>}</div>
            <div className="comp">
              <textarea
                ref={ta} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }}
                placeholder="Ketik LaTeX, mis. x^2-2x-3" aria-label="Persamaan LaTeX"
              />
              <button className="send" aria-label="Gambar grafik" disabled={!draft.trim() || items.length >= MAX_ITEMS} onClick={add}>↑</button>
            </div>
            <div className="chips">{SYMBOLS.map(([l, s]) => <button key={l} onClick={() => insert(s)}>{l}</button>)}</div>
          </section>

          <section className="list">
            {parsed.length === 0 && <p className="hint">Belum ada persamaan. Ketik LaTeX di atas, mis. y=x^2.</p>}
            {parsed.map((p) => (
              <div key={p.id} className="item">
                <button role="switch" aria-checked={p.on} aria-label={p.on ? 'Sembunyikan grafik' : 'Tampilkan grafik'} className="dot" style={{ '--c': p.color }} onClick={() => patch(p.id, { on: !p.on })} />
                <div className="tex"><Tex>{p.tex}</Tex></div>
                <button className="ib" aria-label="Hapus persamaan" onClick={() => remove(p)}>✕</button>
                {live(p) && <div className="live" style={{ color: p.color }}><Tex>{live(p)}</Tex></div>}
                {p.err && <p className="err-line">{p.err}</p>}
                {rowsOf(p.id).length > 0 && (
                  <div className="iparams">
                    {rowsOf(p.id).map((q) => (
                      <ParamRow key={q.name} p={q} step={step} color={p.color} playing={play === q.name} onPlay={() => togglePlay(q.name)} onChange={(v) => setValue(q.name, v)} />
                    ))}
                  </div>
                )}
                {(p.fixable || p.canMake || p.orig) && (
                  <div className="chiprow">
                    {p.fixable
                      ? <button className="mk" onClick={() => makeMissing(p.missing)}>Buat parameter {p.missing.join(', ')}</button>
                      : p.canMake && <button className="mk" onClick={() => makeParams(p)}>Mode parameter</button>}
                    {p.orig && <button className="mk alt" onClick={() => revert(p)}>Kembali ke angka</button>}
                  </div>
                )}
              </div>
            ))}
            {parsed.filter((p) => p.canMake && !p.fixable).length > 1 && (
              <button className="link" onClick={makeAll}>Semua persamaan ke mode parameter</button>
            )}
          </section>

          {params.length > 0 && (
            <section>
              <div className="seg" role="group" aria-label="Langkah perubahan">
                {STEPS.map((s) => <button key={s} aria-pressed={step === s} onClick={() => setStep(s)}>{s}</button>)}
              </div>
              <div className="bar">
                <button className={'mk' + (ghost ? '' : ' alt')} aria-pressed={ghost} onClick={() => setGhost(!ghost)}>Jejak awal</button>
                <button className="link" onClick={() => { setPlay(null); setParams((l) => l.map((p) => ({ ...p, value: p.v0 }))) }}>Kembalikan nilai awal</button>
              </div>
            </section>
          )}
          </>}
        </div>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
