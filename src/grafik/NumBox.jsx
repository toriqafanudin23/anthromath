import { useState } from 'react'
import { fmt } from './math.js'

// ketuk angka untuk mengetik nilai persis (mis. 2.5 atau -4)
export default function NumBox({ name, value, onCommit }) {
  const [t, setT] = useState(null)
  const done = () => {
    const n = parseFloat(String(t).replace(',', '.').replace('−', '-'))
    if (t !== null && Number.isFinite(n)) onCommit(n)
    setT(null)
  }
  return (
    <input
      className="nb" aria-label={`Ketik nilai ${name}`} value={t ?? fmt(value)}
      onFocus={(e) => { const el = e.target; setT(String(value)); requestAnimationFrame(() => el.select()) }}
      onChange={(e) => setT(e.target.value)} onBlur={done}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
    />
  )
}
