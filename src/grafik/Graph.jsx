import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import JXG from 'jsxgraph'
import { BOX0 } from './config.js'
import { keyPoints, pointLabel } from './points.js'

// Satuan x dan y selalu sama (kotak grid persegi): area pandang dipas ke ukuran papan, pusatnya dipertahankan
const fitBox = ([x1, y1, x2, y2], w, h) => {
  const u = Math.min(w / (x2 - x1), h / (y2 - y1)), cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
  return [cx - w / u / 2, cy + h / u / 2, cx + w / u / 2, cy - h / u / 2]
}

const Graph = forwardRef(function Graph({ fns, view, initBox, extra }, ref) {
  const holder = useRef(null)
  const board = useRef(null)
  const curves = useRef([])
  const [ready, setReady] = useState(0) // naik setiap papan baru selesai dibuat
  const [err, setErr] = useState('')

  useImperativeHandle(ref, () => ({
    getBox: () => (board.current ? board.current.getBoundingBox().map((n) => +n.toFixed(2)) : BOX0),
    setBox: (bb) => { const b = board.current; if (b) b.setBoundingBox(fitBox(bb, b.canvasWidth, b.canvasHeight), false) },
    getBoard: () => board.current,
  }), [])

  // Papan dibuat di elemen baru, dan baru setelah elemen itu punya ukuran nyata.
  useEffect(() => {
    const host = document.createElement('div')
    host.className = 'jxgbox'
    host.style.cssText = 'width:100%;height:100%'
    holder.current.appendChild(host)

    const make = () => {
      try {
        board.current = JXG.JSXGraph.initBoard(host, {
          boundingbox: fitBox(initBox, host.clientWidth, host.clientHeight), keepAspectRatio: true, axis: true, grid: false, showCopyright: false, showNavigation: false,
          pan: { enabled: true, needShift: false }, zoom: { wheel: true, pinch: true, needShift: false, pinchHorizontal: false, pinchVertical: false },
        })
        setReady((n) => n + 1)
      } catch (e) { console.error(e); setErr(String(e)) }
    }
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight
      if (w <= 0 || h <= 0) return
      if (!board.current) make()
      else {
        // ukuran berubah (mis. layar penuh): panjang satuan tetap, area yang terlihat yang bertambah/berkurang
        const b = board.current, [x1, y1, x2, y2] = b.getBoundingBox(), u = b.unitX
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
        b.resizeContainer(w, h, true, true, true)
        b.setBoundingBox([cx - w / u / 2, cy + h / u / 2, cx + w / u / 2, cy - h / u / 2], false)
        b.update()
      }
    })
    ro.observe(host)

    return () => {
      ro.disconnect()
      try { if (board.current) JXG.JSXGraph.freeBoard(board.current) } catch {}
      board.current = null
      curves.current = []
      host.remove()
    }
    // eslint-disable-next-line
  }, [])

  // grid dan sumbu mengikuti pengaturan tampilan
  useEffect(() => {
    const b = board.current
    if (!b) return
    try { b.removeGrids() } catch {}
    if (view.grid) b.create('grid', [], { strokeColor: '#e5e2d6', strokeWidth: 1, highlight: false })
    try {
      for (const ax of [b.defaultAxes.x, b.defaultAxes.y]) {
        ax.setAttribute({ visible: view.axis, strokeColor: '#73726c' })
        ax.defaultTicks?.setAttribute({ visible: view.axis, drawLabels: view.nums, strokeColor: '#c9c6b8' })
      }
    } catch (e) { console.error(e) }
    b.update()
  }, [ready, view.grid, view.axis, view.nums])

  // kurva
  useEffect(() => {
    const b = board.current
    if (!b) return
    try { curves.current.forEach((o) => b.removeObject(o)) } catch {}
    curves.current = []
    for (const f of fns) {
      const at = f.ghost ? { strokeWidth: 2, strokeOpacity: 0.4, dash: 2, layer: 4 } : { strokeWidth: view.width, layer: 5 }
      try { curves.current.push(b.create('functiongraph', [f.f], { strokeColor: f.color, highlight: false, ...at })) }
      catch (e) { console.error('Gagal menggambar kurva:', e) }
    }
    b.update()
  }, [ready, fns, view.width])

  // titik puncak / potong: dihitung ulang saat persamaan, parameter, atau area pandang berubah
  useEffect(() => {
    const b = board.current
    if (!b) return
    let pts = [], raf = 0
    const clear = () => { pts.forEach((o) => { try { b.removeObject(o) } catch {} }); pts = [] }
    const draw = () => {
      clear()
      if (view.ext || view.roots || view.cross) {
        for (const p of keyPoints(fns.filter((f) => !f.ghost), b.getBoundingBox(), view)) {
          try {
            pts.push(b.create('point', [p.x, p.y], {
              name: pointLabel(p.x, p.y), size: 4, fillColor: p.color, strokeColor: '#fff', strokeWidth: 1.5,
              fixed: true, highlight: false, showInfobox: false, layer: 8,
              label: { offset: [7, 7], fontSize: 12, highlight: false },
            }))
          } catch (e) { console.error(e) }
        }
      }
      b.update()
    }
    const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) }
    draw()
    b.on('boundingbox', sched)
    return () => { cancelAnimationFrame(raf); try { b.off('boundingbox', sched) } catch {}; clear() }
  }, [ready, fns, view.ext, view.roots, view.cross])

  // objek tambahan dari mode Transformasi (titik, bayangan, garis bantu)
  useEffect(() => {
    const b = board.current
    if (!b || !extra) return
    let off
    try { off = extra(b, JXG); b.update() } catch (e) { console.error(e) }
    return () => { try { off?.() } catch {} }
  }, [ready, extra])

  return (
    <>
      <div ref={holder} className="holder" />
      {err && <p className="err">Papan grafik gagal dibuat: {err}</p>}
    </>
  )
})

export default Graph
