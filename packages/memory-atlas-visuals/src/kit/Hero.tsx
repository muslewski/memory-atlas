import type { ReactNode } from 'react'
import { visuals } from '../config'
import { resolveHero } from '../lib/heroes'
import { SplitText } from './gsap/setup'
import { useKitGsap } from './gsap/useKitGsap'
import { useMotion } from './gsap/useMotion'

interface HeroProps {
  title: string
  /** The 1–2 sentence stakes line under the title. `summary` is a forgiving
   *  alias — agents reach for it constantly, and dropping it loses the hook
   *  silently; both render identically. `hook` wins if both are given. */
  hook?: ReactNode
  summary?: ReactNode
  eyebrow?: string
  /** Visuals-relative stock image path (frontmatter `hero`). Rendered as a
   *  banner above the title so the headline and the image read as one hero. */
  hero?: string
  children?: ReactNode
}

export function Hero({ title, hook, summary, eyebrow, hero, children }: HeroProps) {
  const heroUrl = visuals.features.hero ? resolveHero(hero) : undefined
  const lead = hook ?? summary
  const motion = useMotion()

  // Cinematic mount entrance: banner clip-reveal → eyebrow → split title → hook.
  // The title reveal follows the active skin's PERSONALITY (split unit/mask/blur/
  // ease/stagger from motion-profile) — blog breathes a masked line wipe,
  // brutalist snaps words in hard with no blur, frontier assembles characters
  // out of a deep blur. Reduced-motion: the fn never runs → final state.
  const scope = useKitGsap<HTMLElement>(
    ({ gsap, scope }) => {
      const q = gsap.utils.selector(scope)
      const titleEl = q('.skin-hero-title')[0] as HTMLElement | undefined
      const unit = motion.splitUnit
      const masked = motion.splitMask
      const split = titleEl
        ? SplitText.create(titleEl, { type: unit, mask: masked ? unit : undefined })
        : null
      const titleUnits = split ? (split[unit] as HTMLElement[]) : []
      // Blur is the one filter we animate (never a colour token); 0 on sharp skins.
      // Pass it only when present — gsap.from chokes on `filter: undefined`.
      const softBlur = motion.enterBlur ? { filter: 'blur(6px)' } : {}

      const tl = gsap.timeline({ defaults: { ease: motion.enterEase, duration: motion.enterDur } })
      const banner = q('.skin-hero-banner-img')
      const bannerImg = q('.skin-hero-banner-img img')
      // Banner: clip-reveal the frame + slow zoom-out of the image (cinematic settle).
      if (banner.length) tl.from(banner, { clipPath: 'inset(0 0 100% 0)', duration: 0.8 }, 0)
      if (bannerImg.length)
        tl.from(bannerImg, { scale: 1.14, duration: 1.4, ease: 'power2.out' }, 0)
      if (q('.skin-hero-eyebrow').length)
        tl.from(q('.skin-hero-eyebrow'), { y: 14, opacity: 0, ...softBlur }, 0.15)
      if (titleUnits.length) {
        // Per-unit reveal = TRANSFORM ONLY (GPU-cheap), so a big H1 split into many
        // chars stays smooth. yPercent via the clip mask, or y+opacity unmasked.
        const titleVars: gsap.TweenVars = { stagger: motion.heroStagger }
        if (masked) titleVars.yPercent = motion.enterYPercent
        else {
          titleVars.y = motion.enterY
          titleVars.opacity = 0
        }
        tl.from(titleUnits, titleVars, 0.2)
        // Blur-in as a SINGLE filter on the whole title (one paint layer), NOT per
        // char: animating blur per-char on a large H1 (e.g. 64px Orbitron × 17 chars,
        // frontier) thrashes paint every frame and stutters. One element-level blur
        // keeps the holographic settle and costs one promoted layer. will-change is
        // set for the tween then cleared so the title doesn't stay layer-promoted.
        if (titleEl && motion.enterBlur) {
          tl.from(
            titleEl,
            {
              filter: `blur(${motion.enterBlur}px)`,
              onStart: () => {
                titleEl.style.willChange = 'filter'
              },
              onComplete: () => {
                titleEl.style.willChange = ''
              },
            },
            0.2,
          )
        }
      }
      if (q('.skin-hero-hook').length)
        tl.from(q('.skin-hero-hook'), { y: 18, opacity: 0, ...softBlur }, '-=0.4')
      // No scroll parallax on the banner: a scrubbed transform on the image fights
      // ScrollSmoother's own momentum transform over the same pixels → visible jitter.
      // The mount entrance (clip-reveal + zoom-settle) above is the cinematic moment;
      // on scroll the image stays put.
      return () => {
        if (split) split.revert()
      }
    },
    [motion],
  )

  return (
    <header ref={scope} className={`skin-hero${heroUrl ? ' skin-hero--banner' : ''}`}>
      {heroUrl && (
        <div className="skin-hero-banner-img">
          <img src={heroUrl} alt="" loading="eager" />
        </div>
      )}
      {eyebrow && <p className="skin-hero-eyebrow">{eyebrow}</p>}
      <h1 className="skin-hero-title">{title}</h1>
      {lead && <p className="skin-hero-hook">{lead}</p>}
      {children && <div className="skin-hero-visual">{children}</div>}
    </header>
  )
}
