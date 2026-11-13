import { useMemo } from 'react'
import katex from 'katex'

// Rumus ditulis dengan KaTeX memakai font bawaan LaTeX (Computer Modern)
export default function Tex({ children, className, display = false }) {
  const html = useMemo(
    () => katex.renderToString(String(children), { throwOnError: false, displayMode: display }),
    [children, display]
  )
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
