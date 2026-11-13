import { useMemo } from 'react'
import katex from 'katex'

export default function Tex({ children }) {
  const html = useMemo(
    () => katex.renderToString(String(children || '\\;'), { throwOnError: false }),
    [children]
  )
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
