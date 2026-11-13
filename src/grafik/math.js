import { compile } from 'mathjs'
import { grp } from './param.js'

export const fmt = (n) => String(+(+n).toFixed(2)).replace('-', '−') // tampilan UI

const KNOWN = new Set('sin cos tan sec csc cot sinh cosh tanh asin acos atan log exp sqrt abs nthRoot pi e x'.split(' '))

const FUNCS = new Set([...KNOWN].filter((w) => !['pi', 'e', 'x'].includes(w)))

function conv(s) {
  let out = ''
  for (let i = 0; i < s.length; ) {
    if (s.startsWith('\\frac', i)) {
      const [a, j] = grp(s, s.indexOf('{', i))
      const [b, k] = grp(s, s.indexOf('{', j))
      out += `((${conv(a)})/(${conv(b)}))`
      i = k
    } else if (s.startsWith('\\sqrt', i)) {
      let j = i + 5, n = null
      if (s[j] === '[') { const e = s.indexOf(']', j); n = s.slice(j + 1, e); j = e + 1 }
      const [a, k] = grp(s, s.indexOf('{', j))
      out += n ? `nthRoot(${conv(a)},${conv(n)})` : `sqrt(${conv(a)})`
      i = k
    } else if (s[i] === '^' && s[i + 1] === '{') {
      const [a, k] = grp(s, i + 1)
      out += `^(${conv(a)})`
      i = k
    } else if (s[i] === '{') {
      const [a, k] = grp(s, i)
      out += `(${conv(a)})`
      i = k
    } else out += s[i++]
  }
  return out
}

// LaTeX -> { fn: (x, scope) => y, vars: huruf selain x yang dipakai (harus berupa parameter) }
export function latexToFn(src) {
  let s = src.trim().replace(/^[a-zA-Z]\w*\s*(\(\s*x\s*\))?\s*=/, '')
  if (!s.trim()) throw new Error('Persamaan kosong')
  s = conv(s)
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pi/g, ' pi ')
    .replace(/\\arc(sin|cos|tan)/g, ' a$1')
    .replace(/\\ln/g, ' log')
    .replace(/\\log/g, ' log10')
    .replace(/\\(sinh|cosh|tanh|sin|cos|tan|sec|csc|cot|exp|abs)/g, ' $1')
    .replace(/\b(sinh|cosh|tanh|sin|cos|tan|asin|acos|atan|sec|csc|cot|log10|log|exp|sqrt|abs)\s+([a-zA-Z0-9.]+)/g, '$1($2)')
    .replace(/\|([^|]+)\|/g, 'abs($1)')
    .replace(/[a-zA-Z]+/g, (w) => (KNOWN.has(w) ? w : w.split('').join(' '))) // bx -> b x
    .replace(/\\[,;! ]/g, ' ')
    .replace(/\)\s*\(/g, ')*(') // (x+b)(x+c)
    .replace(/([a-zA-Z]+)\s*\(/g, (m, w) => (FUNCS.has(w) ? m : w + '*(')) // a(x+b), x(x-1) = perkalian, bukan fungsi
  const code = compile(s)
  const vars = [...new Set((s.match(/[a-zA-Z]+/g) || []).filter((w) => !KNOWN.has(w)))]
  const fn = (x, scope) => {
    try {
      const r = code.evaluate({ x, ...scope })
      return typeof r === 'number' ? r : NaN
    } catch { return NaN }
  }
  return { fn, vars }
}
