import { useEffect, useRef, useState } from 'react'
import { fmt } from './math.js'
import { MAX_SHADOWS, VIEW_DEFAULTS } from './config.js'

const svg = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}
const ICON = {
  reset: <svg {...svg}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>,
  layers: <svg {...svg}><path d="M12 3 3 8l9 5 9-5-9-5z" /><path d="m3 13 9 5 9-5" /></svg>,
  sliders: <svg {...svg}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>,
  expand: <svg {...svg}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>,
  shrink: <svg {...svg}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>,
  check: <svg {...svg} width="12" height="12" strokeWidth="3.2"><path d="m5 12 5 5 9-10" /></svg>,
}

function Row({ label, value, min, max, step, onChange }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)))
  return (
    <div className="pop-row">
      <span className="pop-label">{label}</span>
      <div className="pop-ctl">
        <button className="pbtn" aria-label={`Kurangi ${label}`} disabled={value <= min} onClick={() => set(value - step)}>−</button>
        <output aria-live="polite">{fmt(value)}</output>
        <button className="pbtn" aria-label={`Tambah ${label}`} disabled={value >= max} onClick={() => set(value + step)}>+</button>
      </div>
    </div>
  )
}

function Chip({ label, on, disabled, onToggle }) {
  return (
    <button className={on ? 'chip on' : 'chip'} role="switch" aria-checked={on} disabled={disabled} onClick={onToggle}>
      <span className="box">{on && ICON.check}</span>
      {label}
    </button>
  )
}

export default function GraphTools({
  view, setView, full, onFull, onReset, shadowCount, onAddShadow, onClearShadows,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Tutup panel pengaturan saat klik di luar atau tekan Esc
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const set = (part) => setView((v) => ({ ...v, ...part }))
  const toggle = (key) => () => set({ [key]: !view[key] })
  const shadowFull = shadowCount >= MAX_SHADOWS
  const shadowLabel = shadowFull ? `Bayangan penuh (maks. ${MAX_SHADOWS})` : 'Buat bayangan dari grafik ini'

  return (
    <div className="tools" ref={ref}>
      <div className="tools-col">
        <button className="tbtn" aria-label="Atur ulang tampilan grafik" title="Atur ulang tampilan" onClick={onReset}>
          {ICON.reset}
        </button>
        <button className="tbtn" aria-label={shadowLabel} title={shadowLabel} disabled={shadowFull} onClick={onAddShadow}>
          {ICON.layers}
          {shadowCount > 0 && <span className="badge">{shadowCount}</span>}
        </button>
        <button className={open ? 'tbtn on' : 'tbtn'} aria-expanded={open} aria-label="Pengaturan tampilan" title="Pengaturan tampilan"
          onClick={() => setOpen((o) => !o)}>
          {ICON.sliders}
        </button>
        <button className="tbtn" aria-label={full ? 'Keluar layar penuh' : 'Layar penuh'} title={full ? 'Keluar layar penuh' : 'Layar penuh'}
          onClick={onFull}>
          {full ? ICON.shrink : ICON.expand}
        </button>
      </div>

      {open && (
        <div className="pop" role="dialog" aria-label="Pengaturan tampilan grafik">
          <p className="pop-h">Tampilkan</p>
          <div className="chips">
            <Chip label="Grid" on={view.grid} onToggle={toggle('grid')} />
            <Chip label="Sumbu" on={view.axes} onToggle={toggle('axes')} />
            <Chip label="Angka sumbu" on={view.nums} disabled={!view.axes} onToggle={toggle('nums')} />
            <Chip label="Garis simetri" on={view.sym} onToggle={toggle('sym')} />
            <Chip label="Titik" on={view.points} onToggle={toggle('points')} />
            <Chip label="Nama titik" on={view.labels} disabled={!view.points} onToggle={toggle('labels')} />
            <Chip label="Koordinat titik" on={view.coords} disabled={!view.points} onToggle={toggle('coords')} />
            <Chip label="Bayangan" on={view.shadow} onToggle={toggle('shadow')} />
          </div>

          <p className="pop-h">Ukuran</p>
          <Row label="Ukuran titik" value={view.pt} min={3} max={10} step={1} onChange={(pt) => set({ pt })} />
          <Row label="Tebal grafik" value={view.line} min={1} max={8} step={0.5} onChange={(line) => set({ line })} />

          <div className="pop-actions">
            {shadowCount > 0 && (
              <button className="ghost sm" onClick={onClearShadows}>Hapus semua bayangan ({shadowCount})</button>
            )}
            <button className="ghost sm" onClick={() => setView(VIEW_DEFAULTS)}>Kembalikan pengaturan awal</button>
          </div>
        </div>
      )}
    </div>
  )
}
