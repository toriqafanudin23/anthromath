import { useEffect, useRef, useState } from 'react'
import { VIEW_DEFAULTS } from './config.js'

function Switch({ label, on, onChange, disabled }) {
  return (
    <div className={'sw' + (disabled ? ' off' : '')}>
      <span>{label}</span>
      <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className="knobwrap"><i /></button>
    </div>
  )
}

export default function GraphTools({ view, setView, onReset, onFull, full }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const set = (p) => setView((v) => ({ ...v, ...p }))

  useEffect(() => {
    if (!open) return
    const out = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div ref={box}>
      <div className="tools">
        <button className="tb" aria-label="Atur ulang tampilan" title="Atur ulang tampilan" onClick={onReset}>⟲</button>
        <button className="tb" aria-label="Pengaturan tampilan" title="Pengaturan tampilan" aria-expanded={open} onClick={() => setOpen(!open)}>⚙</button>
        <button className="tb" aria-label={full ? 'Keluar layar penuh' : 'Layar penuh'} title="Layar penuh" onClick={onFull}>{full ? '✕' : '⛶'}</button>
      </div>
      {open && (
        <div className="tset">
          <Switch label="Grid" on={view.grid} onChange={(grid) => set({ grid })} />
          <Switch label="Sumbu" on={view.axis} onChange={(axis) => set({ axis })} />
          <Switch label="Angka sumbu" on={view.nums} disabled={!view.axis} onChange={(nums) => set({ nums })} />
          <button className="link" onClick={() => setView(VIEW_DEFAULTS)}>Kembalikan pengaturan awal</button>
        </div>
      )}
    </div>
  )
}
