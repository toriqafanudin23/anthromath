// Logika murni (tanpa React/mathjs): mengubah angka pada persamaan LaTeX menjadi parameter.
export const NAMES = 'abcdfghjkmnpqrstuvwz'.split('') // tanpa e, i, x, y, l, o
export const validName = (n) => /^[a-df-hj-wz]$/.test(n)
export const MAX_PARAMS = NAMES.length

// ambil isi {...} mulai dari indeks kurung buka
export function grp(s, i) {
  let d = 0
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') d++
    else if (s[j] === '}' && --d === 0) return [s.slice(i + 1, j), j + 1]
  }
  throw new Error('Kurung { } tidak seimbang')
}

// 2x^{2}+3x-1  ->  tex: ax^{2}+bx+c, params: a=2, b=3, c=-1
// Eksponen dan indeks akar tidak dijadikan parameter. Tanda minus ikut ke nilai parameter.
export function parametrize(tex, taken = []) {
  const used = new Set([...taken, ...(tex.replace(/\\[a-zA-Z]+/g, '').match(/[a-zA-Z]/g) || [])])
  const free = NAMES.filter((n) => !used.has(n))
  const params = []
  let out = ''
  for (let i = 0; i < tex.length; ) {
    const ch = tex[i]
    if (ch === '^') {
      out += ch; i++
      if (tex[i] === '{') { const [, k] = grp(tex, i); out += tex.slice(i, k); i = k }
      else if (i < tex.length) out += tex[i++]
    } else if (tex.startsWith('\\sqrt[', i)) {
      const e = tex.indexOf(']', i)
      out += tex.slice(i, e + 1); i = e + 1
    } else if (ch === '\\') {
      const m = tex.slice(i).match(/^\\([a-zA-Z]+|.)/)
      out += m[0]; i += m[0].length
    } else if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(tex[i + 1] || ''))) {
      const num = tex.slice(i).match(/^(\d+(\.\d+)?|\.\d+)/)[0]
      i += num.length
      if (!free.length) { out += num; continue }
      let value = parseFloat(num)
      let lead = ''
      const t = out.trimEnd()
      if (t.slice(-1) === '-') {
        const before = t.slice(0, -1).trimEnd().slice(-1)
        const unary = before === '' || '(={,+-'.includes(before)
        value = -value
        out = t.slice(0, -1).trimEnd()
        lead = unary ? '' : '+'
      }
      const name = free.shift()
      params.push({ name, value })
      out += lead + name
    } else { out += ch; i++ }
  }
  return { tex: out, params }
}

// ---- Mode parameter untuk persamaan apa pun ----
// Suku tanpa koefisien angka (x^2, -x, \sin(x), (x-1)^2, ...) diberi koefisien tersirat 1
// agar ikut menjadi parameter. Argumen fungsi (\sin(...), \sqrt{...}) diproses rekursif.
const FN_SRC = '\\\\(?:sinh|cosh|tanh|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|ln|log|exp)\\s*(?:\\\\left)?\\(|\\\\sqrt(?:\\[[^\\]]*\\])?\\{'

// pecah menjadi suku tingkat atas: [{ sign, body }]
function terms(s) {
  const out = []
  let depth = 0, abs = false, sign = '', body = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if ('{(['.includes(c)) depth++
    else if ('})]'.includes(c)) depth--
    else if (c === '|') abs = !abs
    const isSign = (c === '+' || c === '-') && depth === 0 && !abs
    const tb = body.trimEnd()
    if (isSign && tb !== '' && tb.slice(-1) !== '^' && !/\\(left|cdot|times|div)$/.test(tb)) {
      out.push({ sign, body }); sign = c; body = ''
    } else if (isSign && tb === '' && sign === '') sign = c
    else body += c
  }
  out.push({ sign, body })
  return out
}

function inner(body) {
  const re = new RegExp(FN_SRC, 'g')
  let out = '', last = 0, m
  while ((m = re.exec(body))) {
    const open = m.index + m[0].length
    const [oc, cc] = m[0].endsWith('{') ? ['{', '}'] : ['(', ')']
    let d = 1, j = open
    for (; j < body.length && d > 0; j++) { if (body[j] === oc) d++; else if (body[j] === cc) d-- }
    if (d !== 0) break
    out += body.slice(last, open) + augment(body.slice(open, j - 1))
    last = j - 1
    re.lastIndex = j
  }
  return out + body.slice(last)
}

export function augment(expr) {
  return terms(expr).map(({ sign, body }) => {
    let b = inner(body)
    const lead = b.match(/^\s*/)[0]
    const t = b.slice(lead.length)
    const hasX = /x/.test(t.replace(/\\[a-zA-Z]+/g, ''))
    const need = t !== '' && !/^[0-9.]/.test(t) && !t.startsWith('\\frac') && !t.startsWith('\\pi') && !validName(t[0]) && hasX
    return sign + lead + (need ? '1' : '') + t
  }).join('')
}

export function toParamMode(tex, taken = []) {
  const m = tex.match(/^\s*[a-zA-Z]\w*\s*(\(\s*x\s*\))?\s*=/)
  const pre = m ? m[0] : ''
  return parametrize(pre + augment(tex.slice(pre.length)), taken)
}

// Substitusi nilai ke bentuk umum: ax^{2}+bx+c, a=1,b=-2,c=-3 -> x^{2}-2x-3
// Koefisien 1 di depan x/fungsi dihilangkan, dan tanda ganda (+-) dirapikan.
export function fill(tex, scope) {
  const num = (n) => String(+n.toFixed(2))
  let out = ''
  for (let i = 0; i < tex.length; ) {
    const cmd = tex.slice(i).match(/^\\([a-zA-Z]+|.)/)
    if (cmd) { out += cmd[0]; i += cmd[0].length; continue }
    const ch = tex[i++]
    if (!validName(ch) || !(ch in scope)) { out += ch; continue }
    const v = scope[ch], a = Math.abs(v)
    const next = tex.slice(i).trimStart()[0] || ''
    const digits = a === 1 && /[x\\(]/.test(next) ? '' : num(a)
    const t = out.trimEnd(), prev = t.slice(-1)
    if (v >= 0) out += digits
    else if (prev === '+') out = t.slice(0, -1) + '-' + digits
    else if (prev === '-') out = t.slice(0, -1) + '+' + digits
    else if (prev === '' || '(={,'.includes(prev)) out += '-' + digits
    else out += '(-' + (digits || '1') + ')'
  }
  return out
}
