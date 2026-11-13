import { useEffect, useState } from 'react'
import Tex from '../shared/Tex.jsx'
import NumBox from '../shared/NumBox.jsx'
import { AXES, NEW_STEP, TITLES, chainTo, rule } from './geo.js'

const fmt = (n) => String(r2(n)).replace('-', '−')
const r2 = (n) => Math.round(n * 100) / 100
const nm = (i) => String.fromCharCode(65 + (i % 26))

function Num({ label, v, set, step = 1 }) {
  return (
    <div className="nm">
      <span>{label}</span>
      <span className="pm s">
        <button aria-label={`Kurangi ${label}`} onClick={() => set(r2(v - step))}>−</button>
        <NumBox name={label} value={v} onCommit={set} />
        <button aria-label={`Tambah ${label}`} onClick={() => set(r2(v + step))}>+</button>
      </span>
    </div>
  )
}

export function usePlayer({ geo, trace, tRef, graph }) {
  const n = geo.steps.length
  const [prog, setProg] = useState(n)
  const [playing, setPlaying] = useState(false)
  const board = () => graph.current?.getBoard()
  const refresh = () => { const b = board(); if (b) { b.update() } }

  // setiap perubahan bangun/langkah: tampilkan hasil akhir, hapus jejak lama
  useEffect(() => {
    tRef.current = n; setProg(n); setPlaying(false)
    const b = board(); if (b) { b.update(); b.clearTraces() }
  }, [geo, trace])

  useEffect(() => {
    if (!playing) return
    let raf, last = performance.now()
    const tick = (now) => {
      tRef.current = Math.min(n, tRef.current + (now - last) / 1000 / 1.8); last = now
      setProg(tRef.current); refresh()
      if (tRef.current >= n) setPlaying(false); else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const play = () => {
    if (playing) return setPlaying(false)
    if (tRef.current >= n) { tRef.current = 0; setProg(0); board()?.clearTraces(); refresh() }
    setPlaying(true)
  }
  const scrub = (v) => { setPlaying(false); board()?.clearTraces(); tRef.current = v; setProg(v); refresh() }

  return { prog, playing, play, scrub }
}

export function Player({ p, n, trace, setTrace }) {
  const { prog, playing, play, scrub } = p
  return (
    <>
        <div className="bar">
          <button className="mk" disabled={!n} onClick={play}>{playing ? '❚❚ Jeda' : prog >= n && n ? '▶ Putar ulang' : '▶ Putar'}</button>
          <button className={'mk' + (trace ? '' : ' alt')} aria-pressed={trace} onClick={() => setTrace(!trace)}>Jejak</button>
        </div>
        <div className="prow">
          <input type="range" aria-label="Kemajuan animasi" disabled={!n} min={0} max={n || 1} step={0.01} value={n ? prog : 0} onChange={(e) => scrub(+e.target.value)} />
        </div>
    </>
  )
}

export default function Geo({ geo, setGeo, trace, setTrace, adding, setAdding, player }) {
  const { pts, steps } = geo, n = steps.length
  const setPt = (i, p) => setGeo((g) => ({ ...g, pts: g.pts.map((q, k) => (k === i ? { ...q, ...p } : q)) }))
  const upd = (i, p) => setGeo((g) => ({ ...g, steps: g.steps.map((s, k) => (k === i ? { ...s, ...p } : s)) }))
  const addStep = (t) => n < 6 && setGeo((g) => ({ ...g, steps: [...g.steps, { ...NEW_STEP[t] }] }))

  return (
    <>
      <section>
        <h2 className="sh">Bangun datar</h2>
        {pts.map((p, i) => (
          <div key={i} className="prow s">
            <span className="pl">{nm(i)}</span>
            <span className="pm s"><button aria-label={`Kurangi x ${nm(i)}`} onClick={() => setPt(i, { x: r2(p.x - 1) })}>−</button><NumBox name={`x ${nm(i)}`} value={p.x} onCommit={(x) => setPt(i, { x })} /><button aria-label={`Tambah x ${nm(i)}`} onClick={() => setPt(i, { x: r2(p.x + 1) })}>+</button></span>
            <span className="pm s"><button aria-label={`Kurangi y ${nm(i)}`} onClick={() => setPt(i, { y: r2(p.y - 1) })}>−</button><NumBox name={`y ${nm(i)}`} value={p.y} onCommit={(y) => setPt(i, { y })} /><button aria-label={`Tambah y ${nm(i)}`} onClick={() => setPt(i, { y: r2(p.y + 1) })}>+</button></span>
            {pts.length > 1 && <button className="ib" aria-label={`Hapus titik ${nm(i)}`} onClick={() => setGeo((g) => ({ ...g, pts: g.pts.filter((_, k) => k !== i) }))}>✕</button>}
          </div>
        ))}
        <div className="bar">
          <button className="mk" disabled={pts.length >= 8} onClick={() => setGeo((g) => ({ ...g, pts: [...g.pts, { x: -4 + g.pts.length, y: -3 }] }))}>+ Titik</button>
          <button className={'mk' + (adding ? '' : ' alt')} aria-pressed={adding} onClick={() => setAdding(!adding)}>{adding ? 'Ketuk grafik…' : 'Ketuk grafik untuk titik'}</button>
        </div>
        <p className="hint">Titik juga bisa digeser langsung pada grafik.</p>
      </section>

      <section>
        <h2 className="sh">Transformasi</h2>
        <div className="chips w">{Object.entries(TITLES).map(([t, l]) => <button key={t} disabled={n >= 6} onClick={() => addStep(t)}>+ {l}</button>)}</div>
        {n === 0 && <p className="hint">Pilih transformasi di atas. Beberapa transformasi dapat dirangkai berurutan.</p>}
        {steps.map((s, i) => (
          <div key={i} className="item gs">
            <div className="gh"><b>{i + 1}. {TITLES[s.type]}</b><button className="ib" aria-label={`Hapus ${TITLES[s.type]}`} onClick={() => setGeo((g) => ({ ...g, steps: g.steps.filter((_, k) => k !== i) }))}>✕</button></div>
            <div className="live" style={{ margin: 0 }}><Tex>{rule(s)}</Tex></div>
            <div className="gf">
              {s.type === 'translate' && <><Num label="Δx" v={s.dx} set={(dx) => upd(i, { dx })} /><Num label="Δy" v={s.dy} set={(dy) => upd(i, { dy })} /></>}
              {s.type === 'reflect' && (
                <>
                  <div className="nm"><span>Cermin</span><select className="sel" value={s.axis} onChange={(e) => upd(i, { axis: e.target.value })}>{Object.entries(AXES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  {(s.axis === 'xh' || s.axis === 'yk') && <Num label={s.axis === 'xh' ? 'h' : 'k'} v={s.v || 0} set={(v) => upd(i, { v })} />}
                </>
              )}
              {(s.type === 'rotate' || s.type === 'dilate') && <><Num label="Pusat x" v={s.cx} set={(cx) => upd(i, { cx })} /><Num label="Pusat y" v={s.cy} set={(cy) => upd(i, { cy })} /></>}
              {s.type === 'rotate' && <Num label="Sudut °" v={s.deg} step={15} set={(deg) => upd(i, { deg })} />}
              {s.type === 'dilate' && <Num label="Faktor k" v={s.k} step={0.5} set={(k) => upd(i, { k })} />}
            </div>
            {s.type === 'rotate' && <div className="chiprow" style={{ paddingLeft: 0 }}>{[90, 180, 270, -90].map((d) => <button key={d} className="mk alt" onClick={() => upd(i, { deg: d })}>{d}°</button>)}</div>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="sh">Animasi</h2>
        <Player p={player} n={n} trace={trace} setTrace={setTrace} />
      </section>

      <section>
        <h2 className="sh">Koordinat</h2>
        {pts.map((p, i) => (
          <div key={i} className="ct">
            {[[p.x, p.y], ...steps.map((_, j) => chainTo(p.x, p.y, steps, j + 1, n))].map((q, j) => `${nm(i)}${'′'.repeat(j)}(${fmt(q[0])}, ${fmt(q[1])})`).join(' → ')}
          </div>
        ))}
      </section>
    </>
  )
}
