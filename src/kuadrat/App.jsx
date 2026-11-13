import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Graph, { COLORS } from './Graph.jsx'
import GraphTools from './GraphTools.jsx'
import Tex from '../shared/Tex.jsx'
import { MAX_SHADOWS, SHADOW_COLORS, VIEW_DEFAULTS } from './config.js'
import { readHash, shareUrl } from './share.js'
import { DEFAULTS, LIM, MODES, PARAMS, STEPS, derive, forms, fmt, r2, toCanon, tx } from './math.js'

const HINTS = {
  general: 'Seret titik hijau c pada sumbu y, atau gunakan penggeser.',
  vertex: 'Seret titik puncak untuk mengubah h dan k.',
  factor: 'Seret titik akar x₁ dan x₂ pada sumbu x.',
}

const withIds = (list) => list.map((s, i) => ({ ...s, id: i + 1 }))

// Salin ke clipboard; cadangan lewat textarea untuk koneksi non-HTTPS / peramban lama
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

const nativeFs = () => document.fullscreenElement || document.webkitFullscreenElement
function exitNative() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen
  if (nativeFs() && fn) {
    try { Promise.resolve(fn.call(document)).catch(() => {}) } catch { /* abaikan */ }
  }
}

function Control({ def, value, step, onSet }) {
  const [min, max] = LIM[def.key]
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="ctl">
      <div className="ctl-head">
        <span className="sym"><Tex>{def.tex}</Tex></span>
        <span className="hint">{def.hint}</span>
        <output className="val">{fmt(value)}</output>
      </div>
      <div className="ctl-row">
        <button className="stepbtn" aria-label={`Kurangi ${def.label}`} onClick={() => onSet(value - step)}>−</button>
        <input
          type="range" min={min} max={max} step={step} value={value}
          aria-label={def.label} style={{ '--pct': `${pct}%` }}
          onChange={(e) => onSet(parseFloat(e.target.value))}
        />
        <button className="stepbtn" aria-label={`Tambah ${def.label}`} onClick={() => onSet(value + step)}>+</button>
      </div>
    </div>
  )
}

function Stat({ label, color, wide, children }) {
  return (
    <div className={wide ? 'stat wide' : 'stat'}>
      <div className="stat-label">
        {color && <i className="dot" style={{ background: color }} />}
        {label}
      </div>
      <div className="stat-val">{children}</div>
    </div>
  )
}

export default function App() {
  // Bila halaman dibuka dari tautan berbagi, mulai dengan parameter pengirim
  const [boot] = useState(() => readHash(window.location.hash))
  const [mode, setMode] = useState(boot ? boot.mode : 'general')
  const [params, setParams] = useState(boot ? boot.params : DEFAULTS)
  const [step, setStep] = useState(boot ? boot.step : 0.5)
  const [resetKey, setResetKey] = useState(0)
  const [view, setView] = useState(boot ? boot.view : VIEW_DEFAULTS)
  const [full, setFull] = useState(false)
  const [shadows, setShadows] = useState(() => (boot ? withIds(boot.shadows) : []))
  const [fromLink, setFromLink] = useState(!!boot)
  const [toast, setToast] = useState('')
  const shadowId = useRef(boot ? boot.shadows.length : 0)
  const toastTimer = useRef(0)
  const graphRef = useRef(null)
  const wrapRef = useRef(null)

  const p = params[mode]
  const d = useMemo(() => derive(toCanon(mode, p)), [mode, p])
  const roots = useMemo(() => (mode === 'factor' ? [p.x1, p.x2] : d.roots), [mode, p, d])
  const f = useMemo(() => forms(d), [d])

  const patch = useCallback(
    (part) => setParams((s) => ({ ...s, [mode]: { ...s[mode], ...part } })),
    [mode]
  )

  // a boleh 0: grafik menjadi garis lurus
  const setValue = (key, v) => {
    const [lo, hi] = LIM[key]
    patch({ [key]: Math.min(hi, Math.max(lo, r2(v))) })
  }

  // Bayangan statis: simpan koefisien grafik saat ini, lalu tampilkan sebagai garis putus-putus
  const addShadow = () => {
    if (shadows.length >= MAX_SHADOWS) return
    const used = new Set(shadows.map((x) => x.color))
    const color = SHADOW_COLORS.find((c) => !used.has(c)) || SHADOW_COLORS[0]
    const { a, b, c } = toCanon(mode, p)
    shadowId.current += 1
    setShadows((list) => [...list, { id: shadowId.current, a, b, c, color }])
    setView((v) => (v.shadow ? v : { ...v, shadow: true }))
  }
  const removeShadow = (id) => setShadows((list) => list.filter((x) => x.id !== id))
  const clearShadows = () => setShadows([])

  // Berbagi: semua parameter (ketiga bentuk), langkah, pengaturan tampilan, bayangan, dan area pandang
  const makeLink = () =>
    shareUrl({ mode, params, step, view, shadows, box: graphRef.current ? graphRef.current.getBox() : null }, window.location.href)

  const flash = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Salin tautan; bila clipboard tidak tersedia, tampilkan tautan agar bisa disalin manual
  const copyLink = async () => {
    const url = makeLink()
    if (await copyText(url)) flash('Tautan disalin')
    else window.prompt('Salin tautan ini:', url)
  }

  // Terapkan parameter dari tautan lain (mis. ditempel di tab yang sama)
  useEffect(() => {
    const onHash = () => {
      const s = readHash(window.location.hash)
      if (!s) return
      setMode(s.mode); setParams(s.params); setStep(s.step); setView(s.view)
      shadowId.current = s.shadows.length
      setShadows(withIds(s.shadows))
      setFromLink(true)
      if (s.box && graphRef.current) graphRef.current.setBox(s.box)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const resetAll = () => {
    setMode('general'); setParams(DEFAULTS); setStep(0.5); setView(VIEW_DEFAULTS)
    setShadows([]); setResetKey((k) => k + 1); setFromLink(false)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  // Layar penuh: pakai Fullscreen API bila ada, selain itu (mis. iPhone) pakai overlay CSS
  const toggleFull = () => {
    if (full) {
      exitNative()
      setFull(false)
      return
    }
    setFull(true)
    const el = wrapRef.current
    const req = el && (el.requestFullscreen || el.webkitRequestFullscreen)
    if (req) {
      try { Promise.resolve(req.call(el)).catch(() => {}) } catch { /* tetap pakai overlay CSS */ }
    }
  }

  useEffect(() => {
    const onChange = () => { if (!nativeFs()) setFull(false) }
    const onKey = (e) => { if (e.key === 'Escape') { exitNative(); setFull(false) } }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = full ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [full])

  // Saat a = 0 semua bentuk menjadi garis lurus, jadi tampilkan bentuk umumnya
  const main = d.linear ? f.general : mode === 'general' ? f.general : mode === 'vertex' ? f.vertex : f.factor
  const eq = f.approx ? '\\approx' : '='

  return (
    <div className="app">
      <header className="bar">
        <a className="brand" href="../" title="Semua simulasi" aria-label="Anthromath, kembali ke daftar simulasi">
          <span className="logo" aria-hidden="true">✻</span>
          <span className="brand-name">Anthromath</span>
        </a>
        <div className="bar-right">
          <h1 className="title">Fungsi Kuadrat</h1>
          <button className="hbtn" aria-label="Bagikan simulasi (salin tautan)" title="Bagikan simulasi (salin tautan)" onClick={copyLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="stage">
          <div ref={wrapRef} className={full ? 'graphwrap full' : 'graphwrap'}>
            <Graph ref={graphRef} initBox={boot ? boot.box : null} d={d} mode={mode} roots={roots} step={step} onChange={patch} resetKey={resetKey} view={view} full={full} shadows={shadows} />
            <GraphTools view={view} setView={setView} full={full} onFull={toggleFull} onReset={() => setResetKey((k) => k + 1)}
              shadowCount={shadows.length} onAddShadow={addShadow} onClearShadows={clearShadows} />

            {full && (
              <div className="fsbar">
                <div className="fsbar-card">
                  <p className="fs-formula" aria-live="polite"><Tex>{`f(x) ${eq} ${main}`}</Tex></p>
                  <div className="seg seg-sm" role="tablist" aria-label="Bentuk fungsi">
                    {MODES.map((m) => (
                      <button key={m.id} role="tab" aria-selected={mode === m.id}
                        className={mode === m.id ? 'seg-btn on' : 'seg-btn'} onClick={() => setMode(m.id)}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <div className="mini-params">
                    {PARAMS[mode].map((def) => (
                      <span className="mini" key={def.key}>
                        <i><Tex>{def.tex}</Tex></i>
                        <button aria-label={`Kurangi ${def.label}`} onClick={() => setValue(def.key, p[def.key] - step)}>−</button>
                        <output>{fmt(p[def.key])}</output>
                        <button aria-label={`Tambah ${def.label}`} onClick={() => setValue(def.key, p[def.key] + step)}>+</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="formula" aria-live="polite"><Tex>{`f(x) ${eq} ${main}`}</Tex></p>
        </section>

        <section className="panel">
          {fromLink && (
            <div className="shared-note" role="status">
              <span>Dibuka dari tautan yang dibagikan.</span>
              <button className="ghost sm" onClick={resetAll}>Mulai dari awal</button>
            </div>
          )}
          <div className="tabs" role="tablist" aria-label="Bentuk fungsi">
            {MODES.map((m) => (
              <button key={m.id} role="tab" aria-selected={mode === m.id}
                className={mode === m.id ? 'tab on' : 'tab'} onClick={() => setMode(m.id)}>
                <span className="tab-name">{m.name}</span>
                <span className="tab-f"><Tex>{m.f}</Tex></span>
              </button>
            ))}
          </div>
          <p className="note">{HINTS[mode]}</p>

          <div className="stepper" role="group" aria-label="Langkah perubahan">
            <span className="stepper-label">Langkah</span>
            <div className="seg">
              {STEPS.map((s) => (
                <button key={s} className={step === s ? 'seg-btn on' : 'seg-btn'} onClick={() => setStep(s)}>
                  {fmt(s)}
                </button>
              ))}
            </div>
          </div>

          <div className="controls">
            {PARAMS[mode].map((def) => (
              <Control key={def.key} def={def} value={p[def.key]} step={step}
                onSet={(v) => setValue(def.key, v)} />
            ))}
          </div>

          {d.linear && (
            <p className="note linear-note">
              <Tex>a = 0</Tex>: grafik menjadi garis lurus (fungsi linear).
            </p>
          )}

          <button className="ghost" onClick={() => setParams((s) => ({ ...s, [mode]: DEFAULTS[mode] }))}>
            Kembalikan nilai awal
          </button>

          <h2>Bayangan</h2>
          <div className="btn-row">
            <button className="solid" disabled={shadows.length >= MAX_SHADOWS} onClick={addShadow}>
              Buat bayangan
            </button>
            <button className="ghost nomargin" disabled={!shadows.length} onClick={clearShadows}>
              Hapus semua
            </button>
          </div>
          {shadows.length > 0 && (
            <ul className="shadows">
              {shadows.map((sh, i) => (
                <li key={sh.id}>
                  <i className="dot" style={{ background: sh.color }} />
                  <span className="shadow-f">
                    <Tex>{`f(x) = ${forms(derive(sh)).general}`}</Tex>
                  </span>
                  <button className="xbtn" aria-label={`Hapus bayangan ${i + 1}`} onClick={() => removeShadow(sh.id)}>×</button>
                </li>
              ))}
            </ul>
          )}

          <h2>Sifat grafik</h2>
          <div className="stats">
            {d.linear ? (
              <>
                <Stat label="Bentuk">Fungsi linear</Stat>
                <Stat label="Arah">{d.b > 0 ? 'Naik' : d.b < 0 ? 'Turun' : 'Mendatar'}</Stat>
                <Stat label="Gradien"><Tex>{`m = ${tx(d.b)}`}</Tex></Stat>
                <Stat label="Titik potong sumbu y" color={COLORS.y}><Tex>{`(0, ${tx(d.c)})`}</Tex></Stat>
                <Stat label="Titik potong sumbu x" color={COLORS.root} wide>
                  {d.b !== 0
                    ? <Tex>{`(${tx(-d.c / d.b)}, 0)`}</Tex>
                    : d.c === 0 ? 'Seluruh sumbu x' : 'Tidak ada'}
                </Stat>
              </>
            ) : (
              <>
                <Stat label="Titik puncak" color={COLORS.vertex}><Tex>{`(${tx(d.vx)}, ${tx(d.vy)})`}</Tex></Stat>
                <Stat label="Sumbu simetri"><Tex>{`x = ${tx(d.vx)}`}</Tex></Stat>
                <Stat label={d.a > 0 ? 'Nilai minimum' : 'Nilai maksimum'}><Tex>{tx(d.vy)}</Tex></Stat>
                <Stat label="Arah">{d.a > 0 ? 'Terbuka ke atas' : 'Terbuka ke bawah'}</Stat>
                <Stat label="Titik potong sumbu y" color={COLORS.y}><Tex>{`(0, ${tx(d.c)})`}</Tex></Stat>
                <Stat label="Diskriminan"><Tex>{`D = ${tx(d.D)}`}</Tex></Stat>
                <Stat label="Akar" color={COLORS.root} wide>
                  {d.roots.length === 0
                    ? 'Tidak ada akar real'
                    : Math.abs(d.roots[0] - d.roots[1]) < 1e-9
                    ? <Tex>{`x = ${tx(d.roots[0])}`}</Tex>
                    : <Tex>{`x_{1} = ${tx(d.roots[0])},\\; x_{2} = ${tx(d.roots[1])}`}</Tex>}
                </Stat>
              </>
            )}
          </div>

          <h2>{d.linear ? 'Bentuk fungsi' : 'Ketiga bentuk'}</h2>
          <ul className="forms">
            <li><span>Umum</span><em><Tex>{`f(x) = ${f.general}`}</Tex></em></li>
            {d.linear ? (
              <>
                <li><span>Puncak</span><em>tidak ada (a = 0)</em></li>
                <li>
                  <span>Faktor</span>
                  <em>{f.factor ? <Tex>{`f(x) ${eq} ${f.factor}`}</Tex> : 'tidak ada'}</em>
                </li>
              </>
            ) : (
              <>
                <li><span>Puncak</span><em><Tex>{`f(x) = ${f.vertex}`}</Tex></em></li>
                <li>
                  <span>Faktor</span>
                  <em>{f.factor ? <Tex>{`f(x) ${eq} ${f.factor}`}</Tex> : 'tidak ada (D < 0)'}</em>
                </li>
              </>
            )}
          </ul>
        </section>
      </main>

      <div className={toast ? 'toast show' : 'toast'} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
