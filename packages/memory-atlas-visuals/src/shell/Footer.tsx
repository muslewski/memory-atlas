import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { visuals } from '../config'

export function Footer() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const activeSkin = mounted ? theme : visuals.defaultSkin

  return (
    <>
      <style>{`
        .footer-root {
          border-top: var(--skin-border-w, 1px) solid var(--skin-border);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          font-family: var(--skin-font-mono);
          font-size: 11px;
          color: var(--skin-faint);
          letter-spacing: 0.04em;
        }
        .footer-home {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--skin-muted);
          text-decoration: none;
          transition: color 0.12s;
        }
        .footer-home:hover { color: var(--skin-accent); }
        .footer-skin {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--skin-faint);
        }
        .footer-credit {
          color: var(--skin-faint);
          text-align: right;
        }
      `}</style>

      <footer className="footer-root">
        <Link to="/" data-testid="nav-home" className="footer-home">
          ← Home
        </Link>
        <span className="footer-skin">{activeSkin}</span>
        <span className="footer-credit">Atlas Visuals · memory-atlas</span>
      </footer>
    </>
  )
}
