'use client'

import hljs from 'highlight.js/lib/common'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { Card } from '../components/ui/card'

interface CodeBlockProps {
  children: ReactNode
  lang?: string
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    // React element — cast via unknown to access children safely
    const el = node as unknown as { props: { children?: ReactNode } }
    return extractText(el.props?.children)
  }
  return ''
}

// Map the digest's lang label to a highlight.js language id.
function hljsLang(lang?: string): string | null {
  if (!lang) return null
  const l = lang.toLowerCase()
  if (l === 'tsx' || l === 'ts' || l === 'typescript') return 'typescript'
  if (l === 'jsx' || l === 'js' || l === 'javascript') return 'javascript'
  if (l === 'bash' || l === 'sh' || l === 'shell' || l === 'zsh') return 'bash'
  if (l === 'json') return 'json'
  if (l === 'css') return 'css'
  if (l === 'html' || l === 'xml') return 'xml'
  return hljs.getLanguage(l) ? l : null
}

export function CodeBlock({ children, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const code = useMemo(() => extractText(children), [children])

  // Highlight at render (sync). On any failure, fall back to escaped plain text.
  const html = useMemo(() => {
    try {
      const id = hljsLang(lang)
      return id ? hljs.highlight(code, { language: id }).value : hljs.highlightAuto(code).value
    } catch {
      return null
    }
  }, [code, lang])

  const handleCopy = useCallback(() => {
    if (!navigator?.clipboard?.writeText) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }, [code])

  return (
    <Card className="skin-codeblock">
      <div className="skin-codeblock-header">
        {lang && <span className="skin-codeblock-lang">{lang}</span>}
        <button
          className="skin-codeblock-copy"
          onClick={handleCopy}
          data-testid="copy-code"
          aria-label={copied ? 'Copied!' : 'Copy code'}
          type="button"
        >
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      <pre className="skin-codeblock-pre">
        {html !== null ? (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax-highlighted HTML from highlight.js, content is sanitized
          <code className="skin-codeblock-code hljs" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code className="skin-codeblock-code hljs">{code}</code>
        )}
      </pre>
    </Card>
  )
}
