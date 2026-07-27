import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { SplitReveal } from './SplitReveal'

interface SectionProps {
  id?: string
  title?: string
  /** Renders a fractional marker like "02 / 07" beside the section title. */
  marker?: string
  /** Any lucide name (kebab-case); renders before the title to anchor the section. */
  icon?: string
  /** When true, the title reveals word-by-word on scroll-enter (GSAP SplitReveal). */
  animateTitle?: boolean
  children: ReactNode
}

export function Section({ id, title, marker, icon, animateTitle, children }: SectionProps) {
  return (
    <section id={id} className="skin-section">
      {(title || marker) && (
        <div className="skin-section-header">
          {marker && <span className="skin-section-marker">{marker}</span>}
          {icon && <Icon name={icon} className="skin-section-icon" size={20} />}
          {title && (
            <h2 className="skin-section-title">
              {animateTitle ? <SplitReveal>{title}</SplitReveal> : title}
            </h2>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
