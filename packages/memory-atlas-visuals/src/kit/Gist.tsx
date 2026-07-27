import type { ReactNode } from 'react'

// children (typically a <ul> of points) is canonical; `items` is a forgiving
// alias so `items={['point', …]}` renders as a bullet list instead of empty.
interface GistProps {
  children?: ReactNode
  items?: ReactNode[]
}

function IconBulb() {
  return (
    <svg className="skin-gist-bulb-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5a5.5 5.5 0 0 1 3.5 9.72V14a.5.5 0 0 1-.5.5h-6A.5.5 0 0 1 6.5 14v-1.78A5.5 5.5 0 0 1 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.5 17h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8.5 15h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function Gist({ children, items }: GistProps) {
  return (
    <aside className="skin-gist" role="note">
      <div className="skin-gist-bulb">
        <IconBulb />
        <span className="skin-gist-label">takeaway</span>
      </div>
      <div className="skin-gist-body">
        {children ??
          (items ? (
            <ul>
              {items.map((it, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed
                <li key={i}>{it}</li>
              ))}
            </ul>
          ) : null)}
      </div>
    </aside>
  )
}
