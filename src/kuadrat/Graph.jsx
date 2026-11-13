import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import JXG from 'jsxgraph'
import { LIM, fmt, r2 } from './math.js'

export const COLORS = { curve: '#c6613f', vertex: '#3d3929', root: '#4a7ba6', y: '#5b8a5f' }
const BBOX = [-10, 10, 10, -10]
const GRID_ATTR = { strokeColor: '#ebe9df', strokeOpacity: 1, strokeWidth: 1 }

const axisAttr = (drawLabels) => ({
  strokeColor: '#73726c',
  withLabel: false,
  ticks: {
    strokeColor: '#b8b5a9', majorHeight: 10, minorHeight: 4, // tanda pendek, bukan garis penuh
    drawLabels,
    label: { strokeColor: '#73726c', fontSize: 12 },
  },
})

// Teks label titik: nama dan/atau koordinat sesuai pengaturan
const labelText = (view, name, x, y) =>
  [view.labels ? name : '', view.coords ? `(${fmt(x)}, ${fmt(y)})` : ''].filter(Boolean).join(' ')

const Graph = forwardRef(function Graph({ d, mode, roots, step, onChange, resetKey, view, full, shadows, initBox }, ref) {
  const box = useRef(null)
  const g = useRef({})
  const live = useRef({})
  live.current = { mode, step, onChange }

  // Buat papan sekali
  useEffect(() => {
    const board = JXG.JSXGraph.initBoard(box.current, {
      boundingBox: initBox || BBOX,
      keepAspectRatio: true,
      axis: false, // sumbu dibuat sendiri agar bisa disembunyikan sepenuhnya
      showCopyright: false,
      showNavigation: false,
      pan: { enabled: true, needShift: false, needTwoFingers: false }, // seret layar tanpa Shift
      zoom: { wheel: true, pinch: true, needShift: false, pinchHorizontal: false, pinchVertical: false },
      resize: { enabled: false }, // ukuran diatur sendiri (lihat efek ResizeObserver) agar panjang satuan tetap
    })
    const cur = { a: 1, b: 0, c: 0, vx: 0 }
    const curve = board.create('functiongraph', [(x) => cur.a * x * x + cur.b * x + cur.c], {
      strokeColor: COLORS.curve, strokeWidth: 3.5, highlight: false, fixed: true, layer: 5,
    })
    const sym = board.create('line', [[() => cur.vx, 0], [() => cur.vx, 1]], {
      strokeColor: COLORS.vertex, strokeOpacity: 0.55, strokeWidth: 1.5, dash: 2,
      fixed: true, highlight: false,
    })

    const pt = (name, color, off) =>
      board.create('point', [0, 0], {
        name, size: 6, face: 'o', fillColor: color, strokeColor: color, strokeWidth: 0,
        highlightFillColor: color, highlightStrokeColor: color, highlightStrokeWidth: 0, showInfobox: false,
        label: { offset: off, fontSize: 13, strokeColor: color },
      })
    const v = pt('Puncak', COLORS.vertex, [10, 14])
    const r1 = pt('x₁', COLORS.root, [-6, 16])
    const r2p = pt('x₂', COLORS.root, [-6, 16])
    const y = pt('c', COLORS.y, [10, 12])

    const sn = (val, [lo, hi]) => {
      const s = live.current.step
      return Math.min(hi, Math.max(lo, r2(Math.round(val / s) * s)))
    }
    v.on('drag', () => {
      if (live.current.mode !== 'vertex') return
      const h = sn(v.X(), LIM.h), k = sn(v.Y(), LIM.k)
      v.moveTo([h, k])
      live.current.onChange({ h, k })
    })
    r1.on('drag', () => {
      if (live.current.mode !== 'factor') return
      const x1 = sn(r1.X(), LIM.x1)
      r1.moveTo([x1, 0])
      live.current.onChange({ x1 })
    })
    r2p.on('drag', () => {
      if (live.current.mode !== 'factor') return
      const x2 = sn(r2p.X(), LIM.x2)
      r2p.moveTo([x2, 0])
      live.current.onChange({ x2 })
    })
    y.on('drag', () => {
      if (live.current.mode !== 'general') return
      const c = sn(y.Y(), LIM.c)
      y.moveTo([0, c])
      live.current.onChange({ c })
    })

    g.current = { board, cur, v, r1, r2: r2p, y, sym, grid: null, axes: [], curve }
    return () => JXG.JSXGraph.freeBoard(board)
  }, [])

  // Sinkronkan titik dengan parameter dan pengaturan tampilan
  useEffect(() => {
    const { board, cur, v, r1, r2: r2p, y, sym } = g.current
    if (!board) return
    Object.assign(cur, { a: d.a, b: d.b, c: d.c, vx: d.vx })

    const put = (p, { x, y: py, name, show, drag }) => {
      p.moveTo([x, py])
      p.setAttribute({
        fixed: !drag, size: drag ? view.pt + 2 : Math.max(2, view.pt - 1), highlight: drag,
      })
      if (p.label) p.label.setText(labelText(view, name, x, py))
      if (show && view.points) p.show(); else p.hide()
    }

    // Titik puncak: untuk garis lurus hanya tampil di bentuk Puncak (sebagai titik (h, k))
    const vVisible = !d.linear || mode === 'vertex'
    put(v, { x: d.vx, y: d.vy, name: d.linear ? 'Titik' : 'Puncak', show: vVisible, drag: mode === 'vertex' })
    put(y, { x: 0, y: d.c, name: 'c', show: true, drag: mode === 'general' })

    const factor = mode === 'factor'
    const rootName = d.linear && !factor ? 'Akar' : null
    const has1 = roots.length > 0
    const has2 = roots.length > 1 && (factor || Math.abs(roots[0] - roots[1]) > 1e-9)
    put(r1, { x: has1 ? roots[0] : 0, y: 0, name: rootName || 'x₁', show: has1, drag: factor })
    put(r2p, { x: has2 ? roots[1] : 0, y: 0, name: 'x₂', show: has2, drag: factor })

    sym.setAttribute({ visible: view.sym && !d.linear })
    board.update()
  }, [d, mode, roots, view.pt, view.points, view.labels, view.coords, view.sym])

  // Grid: saat disembunyikan, objek grid dihapus seluruhnya dari papan
  useEffect(() => {
    const { board } = g.current
    if (!board) return
    board.removeGrids()
    g.current.grid = view.grid ? board.create('grid', [], GRID_ATTR) : null
    board.update()
  }, [view.grid])

  // Sumbu koordinat dan angkanya: dibuat ulang saat pengaturan berubah
  useEffect(() => {
    const { board } = g.current
    if (!board) return
    g.current.axes.forEach((a) => board.removeObject(a))
    g.current.axes = view.axes
      ? [
          board.create('axis', [[0, 0], [1, 0]], axisAttr(view.nums)),
          board.create('axis', [[0, 0], [0, 1]], axisAttr(view.nums)),
        ]
      : []
    board.update()
  }, [view.axes, view.nums])

  // Tebal grafik
  useEffect(() => {
    const { board, curve } = g.current
    if (!board) return
    curve.setAttribute({ strokeWidth: view.line })
    board.update()
  }, [view.line])

  // Bayangan statis: salinan grafik yang tidak ikut berubah
  useEffect(() => {
    const { board } = g.current
    if (!board) return
    const made = []
    if (view.shadow) {
      shadows.forEach((s) => {
        const { a, b, c } = s
        const curve = board.create('functiongraph', [(x) => a * x * x + b * x + c], {
          strokeColor: s.color, strokeWidth: Math.max(2, view.line - 1), strokeOpacity: 0.8,
          dash: 2, highlight: false, fixed: true, layer: 4,
        })
        made.push(curve)
        if (a !== 0 && view.points) {
          const vx = -b / (2 * a)
          made.push(
            board.create('point', [vx, a * vx * vx + b * vx + c], {
              size: 3.5, face: 'o', fillColor: s.color, strokeColor: s.color, strokeWidth: 0,
              withLabel: false, fixed: true, highlight: false, showInfobox: false,
            })
          )
        }
      })
    }
    board.update()
    return () => {
      try { made.forEach((o) => board.removeObject(o)) } catch { /* papan sudah dilepas */ }
    }
  }, [shadows, view.shadow, view.line, view.points])

  // Ukuran papan berubah (layar penuh, rotasi, jendela): panjang satuan tetap 1:1, yang bertambah/berkurang adalah area yang terlihat
  useEffect(() => {
    const { board } = g.current
    const el = box.current
    if (!board || !el) return
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight
      if (w <= 0 || h <= 0) return
      try {
        const [x1, y1, x2, y2] = board.getBoundingBox(), u = board.unitX
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
        board.resizeContainer(w, h, true, undefined, true)
        board.setBoundingBox([cx - w / u / 2, cy + h / u / 2, cx + w / u / 2, cy - h / u / 2], false)
        board.update()
      } catch (e) { console.error(e) }
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (resetKey && g.current.board) g.current.board.setBoundingBox(BBOX, true)
  }, [resetKey])

  // Dipakai fitur berbagi: baca dan atur area pandang (hasil geser/zoom)
  useImperativeHandle(ref, () => ({
    getBox: () => (g.current.board ? g.current.board.getBoundingBox() : null),
    setBox: (b) => { if (g.current.board) g.current.board.setBoundingBox(b, true) },
  }), [])

  return <div ref={box} className="jxgbox graph" />
})

export default Graph
