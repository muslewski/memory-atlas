import { Outlet } from 'react-router-dom'
import './theme/index.css'
import { useScrollSmootherLifecycle } from './kit/gsap/scroll-smoother'
import { useScrollTriggerLifecycle } from './kit/gsap/scrolltrigger-lifecycle'
import CommentFab from './shell/CommentFab'
import { Footer } from './shell/Footer'
import { Nav } from './shell/Nav'

export default function App() {
  // Keep GSAP ScrollTrigger positions correct across font-load / images / skin switch.
  useScrollTriggerLifecycle()
  // Momentum smooth-scroll over #smooth-wrapper/#smooth-content (handles route scroll-to-top;
  // reduced-motion → native scroll). Replaces react-router <ScrollRestoration />.
  useScrollSmootherLifecycle()

  return (
    <>
      {/* Nav + the TOC overlay live OUTSIDE #smooth-wrapper so their position:fixed is
          viewport-relative — ScrollSmoother transforms #smooth-content, which would
          otherwise drag fixed descendants along. */}
      <Nav />
      <div id="toc-layer" aria-hidden="false" />
      <CommentFab />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          {/* padding-top tracks --header-h so content never hides under the sticky nav */}
          <main
            style={{
              paddingTop: 'var(--header-h, 52px)',
              minHeight: 'calc(100vh - var(--header-h, 52px))',
            }}
          >
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </>
  )
}
