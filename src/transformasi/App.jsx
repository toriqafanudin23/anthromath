import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Graph from './Graph.jsx'
import GraphTools from './GraphTools.jsx'
import Geo, { Player, usePlayer } from './Geo.jsx'
import Tex from '../shared/Tex.jsx'
import { BOX0, MAX_PTS, VIEW_DEFAULTS } from './config.js'
import { GEO0, makeExtra, rule } from './geo.js'
import { readHash, shareUrl } from './share.js'

export default function App() {
  const [init] = useState(readHash)
  const [geo, setGeo] = useState(init?.geo || GEO0)
  const [trace, setTrace] = useState(init?.trace ?? true)
  const [view, setView] = useState(init?.view || VIEW_DEFAULTS)
  const [adding, setAdding] = useState(false)
  const [fromShare, setFromShare] = useState(!!init)
  const [full, setFull] = useState(false)
  const [toast, setToast] = useState('')
  const graph = useRef(null)
  const wrap = useRef(null)
  const tRef = useRef(0)
  const cb = useRef({})
  cb.current = {
    adding,
    move: (i, x, y) => setGeo((g) => (g.pts[i].x === x && g.pts[i].y === y ? g : { ...g, pts: g.pts.map((p, k) => (k === i ? { x, y } : p)) })),
    add: (x, y) => setGeo((g) => (g.pts.length >= MAX_PTS ? g : { ...g, pts: [...g.pts, { x, y }] })),
  }
  const extra = useMemo(() => makeExtra({ pts: geo.pts, steps: geo.steps, tRef, cb, trace }), [geo, trace])
  const player = usePlayer({ geo, trace, tRef, graph })

  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2400) }

  const resetAll = useCallback(() => {
    setGeo(GEO0); setTrace(true); setView(VIEW_DEFAULTS); setAdding(false); setFromShare(false)
    history.replaceState(null, '', location.pathname + location.search)
    graph.current?.setBox(BOX0)
  }, [])

  const share = async () => {
    const url = shareUrl({ geo, trace, view, box: graph.current.getBox() })
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
      setGeo(s.geo); setTrace(s.trace); setView(s.view); setFromShare(true)
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
        <a className="brand" href="../" title="Semua simulasi" aria-label="Anthromath, kembali ke daftar simulasi"><i>✻</i>Anthromath</a>
        <div className="hr">
          <h1>Transformasi Geometri</h1>
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
          <Graph ref={graph} view={view} initBox={init?.box || BOX0} extra={extra} />
          <GraphTools view={view} setView={setView} onReset={() => graph.current.setBox(BOX0)} onFull={toggleFull} full={full} />
          {full && (
            <div className="fcard">
              {geo.steps.length > 0 && <div className="eqs">{geo.steps.map((s, i) => <div key={i} className="eq"><Tex>{rule(s)}</Tex></div>)}</div>}
              <Player p={player} n={geo.steps.length} trace={trace} setTrace={setTrace} />
            </div>
          )}
        </section>

        <div className="panel">
          {fromShare && (
            <div className="note">
              <span>Dibuka dari tautan yang dibagikan</span>
              <button className="link" onClick={resetAll}>Mulai dari awal</button>
            </div>
          )}
          <Geo geo={geo} setGeo={setGeo} trace={trace} setTrace={setTrace} adding={adding} setAdding={setAdding} player={player} />
        </div>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
