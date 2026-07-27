import { NavLink } from 'react-router-dom'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Nav() {
  return (
    <>
      <style>{`
        .nav-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--header-h, 52px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          /* Solid, full-colour bar — NO backdrop-filter. A blurred translucent nav
             re-rasterizes the strip behind it on every scroll frame (its backdrop
             changes as content scrolls under), a real per-frame cost. Opaque = the
             compositor just slides the content layer beneath a static bar. */
          background: var(--skin-bg);
          border-bottom: var(--skin-border-w, 1px) solid var(--skin-border);
        }
        .nav-left {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .nav-brand {
          font-family: var(--skin-font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--skin-text);
          letter-spacing: -0.01em;
          text-decoration: none;
          line-height: 1;
        }
        .nav-brand:hover { opacity: 0.75; }
        .nav-divider {
          width: 1px;
          height: 14px;
          background: var(--skin-border);
          display: inline-block;
          vertical-align: middle;
        }
        .nav-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .nav-tab {
          font-family: var(--skin-font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--skin-faint);
          text-decoration: none;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
        }
        .nav-tab:hover { color: var(--skin-text); }
        .nav-tab.active {
          color: var(--skin-text);
          background: var(--skin-surface);
        }
      `}</style>

      {/* biome-ignore lint/a11y/useSemanticElements: internal gallery app, a11y refactor out of scope */}
      <nav className="nav-root" role="banner">
        <div className="nav-left">
          <NavLink to="/" className="nav-brand">
            Atlas Visuals
          </NavLink>
          <span className="nav-divider" aria-hidden="true" />
          <div className="nav-tabs">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
              data-testid="tab-notes"
            >
              Notes
            </NavLink>
            <NavLink
              to="/comments"
              className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
              data-testid="tab-comments"
            >
              Comments
            </NavLink>
          </div>
        </div>
        <ThemeSwitcher />
      </nav>
    </>
  )
}
