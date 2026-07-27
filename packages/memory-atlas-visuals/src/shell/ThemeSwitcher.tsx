import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { visuals } from '../config'
import { SKINS, type SkinId } from '../theme/skins'

// Only the skins enabled in visuals.config.ts are selectable.
const ENABLED_SKINS = SKINS.filter((s) => visuals.skins.includes(s.id))
const DEFAULT_ENTRY = ENABLED_SKINS.find((s) => s.id === visuals.defaultSkin) ?? ENABLED_SKINS[0]

// Accent dot colors per skin — decorative preview in the trigger + items
const SKIN_ACCENT: Record<SkinId, string> = {
  blog: '#185fa5',
  brutalist: '#000000',
  magazine: '#8b3a1a',
  frontier: '#00ffe0',
  blueprint: '#00b4d8',
  tor: '#7d4698',
}

function SkinDot({ skinId, size = 8 }: { skinId: SkinId; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: SKIN_ACCENT[skinId],
        flexShrink: 0,
        border: 'var(--skin-border-w, 1px) solid var(--skin-border)',
      }}
    />
  )
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeSkin = (mounted ? theme : visuals.defaultSkin) as SkinId
  const activeEntry = ENABLED_SKINS.find((s) => s.id === activeSkin) ?? DEFAULT_ENTRY

  // Stable placeholder prevents CLS before mount
  if (!mounted) {
    return (
      <button
        type="button"
        data-testid="skin-switcher"
        className="skin-switcher-trigger"
        aria-label="Switch skin"
        disabled
      >
        <span className="skin-switcher-dots">
          <span className="skin-switcher-dot" style={{ background: 'var(--skin-accent)' }} />
        </span>
        <span className="skin-switcher-label">{DEFAULT_ENTRY.label}</span>
        <span className="skin-switcher-caret" aria-hidden>
          ▾
        </span>
      </button>
    )
  }

  return (
    <>
      <style>{`
        .skin-switcher-trigger {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 11px 5px 9px;
          border: var(--skin-border-w, 1px) solid var(--skin-border);
          border-radius: 99px;
          background: var(--skin-surface);
          color: var(--skin-muted);
          font-family: var(--skin-font-mono);
          font-size: 11.5px;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: border-color 0.12s, color 0.12s, background 0.12s;
          user-select: none;
          white-space: nowrap;
        }
        .skin-switcher-trigger:hover:not(:disabled) {
          border-color: var(--skin-muted);
          color: var(--skin-text);
        }
        .skin-switcher-trigger:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .skin-switcher-dots {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .skin-switcher-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: var(--skin-border-w, 1px) solid var(--skin-border);
          flex-shrink: 0;
        }
        .skin-switcher-label {
          font-size: 11px;
          font-family: var(--skin-font-mono);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .skin-switcher-caret {
          font-size: 9px;
          opacity: 0.55;
          margin-left: 1px;
        }

        /* Dropdown content */
        .skin-switcher-content {
          min-width: 240px;
          background: var(--skin-card);
          border: var(--skin-border-w, 1px) solid var(--skin-border);
          border-radius: var(--skin-radius-lg);
          box-shadow: var(--skin-shadow-popover);
          padding: 6px;
          animation: skin-switcher-in 0.12s ease-out;
          z-index: 9999;
        }
        @keyframes skin-switcher-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header label inside dropdown */
        .skin-switcher-heading {
          font-family: var(--skin-font-mono);
          font-size: 9.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--skin-faint);
          padding: 6px 10px 4px;
        }

        /* Item */
        .skin-switcher-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: calc(var(--skin-radius) - 2px);
          cursor: pointer;
          outline: none;
          transition: background 0.09s;
        }
        .skin-switcher-item[data-highlighted] {
          background: var(--skin-surface);
        }
        .skin-switcher-item[data-active="true"] {
          background: var(--skin-surface);
        }
        .skin-switcher-item-body {
          flex: 1;
          min-width: 0;
        }
        .skin-switcher-item-name {
          font-family: var(--skin-font-mono);
          font-size: 12px;
          font-weight: 500;
          color: var(--skin-text);
          letter-spacing: 0.01em;
          line-height: 1.3;
        }
        .skin-switcher-item[data-active="true"] .skin-switcher-item-name {
          color: var(--skin-accent);
        }
        .skin-switcher-item-blurb {
          font-family: var(--skin-font);
          font-size: 11px;
          color: var(--skin-faint);
          margin-top: 2px;
          line-height: 1.4;
        }
        .skin-switcher-check {
          font-size: 10px;
          color: var(--skin-accent);
          flex-shrink: 0;
          width: 14px;
          text-align: right;
        }
        .skin-switcher-separator {
          height: 1px;
          background: var(--skin-border);
          margin: 4px 6px;
        }
      `}</style>

      {/* modal={false}: a skin picker is not a true modal. Radix's default modal mode
          activates react-remove-scroll (scroll-lock + focus trap), which fights
          ScrollSmoother — the real scroll position gets yanked toward the top when the
          menu opens. Non-modal keeps scroll put; it still closes on outside click. */}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            data-testid="skin-switcher"
            className="skin-switcher-trigger"
            aria-label="Switch skin"
          >
            <span className="skin-switcher-dots">
              <SkinDot skinId={activeSkin} />
            </span>
            <span className="skin-switcher-label">{activeEntry.label}</span>
            <span className="skin-switcher-caret" aria-hidden>
              ▾
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content className="skin-switcher-content" align="end" sideOffset={6}>
            <div className="skin-switcher-heading">Skin</div>
            <DropdownMenu.Separator className="skin-switcher-separator" />

            {ENABLED_SKINS.map((skin) => (
              <DropdownMenu.Item
                key={skin.id}
                className="skin-switcher-item"
                data-active={activeSkin === skin.id ? 'true' : 'false'}
                onSelect={() => setTheme(skin.id)}
              >
                <SkinDot skinId={skin.id} size={10} />
                <span className="skin-switcher-item-body">
                  <div className="skin-switcher-item-name">{skin.label}</div>
                  <div className="skin-switcher-item-blurb">{skin.blurb}</div>
                </span>
                <span className="skin-switcher-check">{activeSkin === skin.id ? '✓' : ''}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  )
}
