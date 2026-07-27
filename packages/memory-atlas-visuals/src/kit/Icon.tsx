/**
 * Icon.tsx — token-driven icon, backed by the full lucide set.
 *
 * <Icon name="git-branch" />              any lucide icon, kebab-case
 * <Icon name="bulb" />                    legacy names resolve via icon-aliases
 * <Icon name="circle-check" size={20} />  size/strokeWidth passthrough
 *
 * lucide renders stroke="currentColor", so icons inherit the surrounding text
 * colour and respond to var(--skin-*) tokens automatically. DynamicIcon is
 * self-lazy (code-splits each icon); we keep the .skin-i class for sizing CSS.
 */
import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { resolveIconName } from './icon-aliases'

interface IconProps {
  name: string
  size?: number | string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

export function Icon({ name, size, strokeWidth = 2, className, style }: IconProps) {
  const cls = `skin-i${className ? ` ${className}` : ''}`
  return (
    <DynamicIcon
      name={resolveIconName(name) as IconName}
      size={size}
      strokeWidth={strokeWidth}
      className={cls}
      style={style}
      aria-hidden="true"
      fallback={() => <span className={cls} aria-hidden="true" />}
    />
  )
}
