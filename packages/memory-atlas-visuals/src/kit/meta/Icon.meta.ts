import type { PrimitiveMeta } from './types'

export const IconMeta: PrimitiveMeta = {
  name: 'Icon',
  category: 'structure',
  useWhen:
    'Inline glyph beside a label, card heading, list item or callout. Any lucide icon by kebab-case name; strokes inherit the skin colour automatically (currentColor) — never set a colour.',
  props: {
    name: 'string — any lucide icon, kebab-case (e.g. "git-branch", "circle-check", "sparkles", "shield", "zap"). Legacy kit names ("bulb", "alert-triangle") still resolve. Recommended by use — status: circle-check/circle/triangle-alert/clock; nav: arrow-right/chevron-right/external-link; media: camera/image/film; data: layers/database/git-branch; emphasis: sparkles/zap/star/lightbulb.',
    size: 'number | string? — pixel/CSS size; omit to inherit the .skin-i default sizing',
    strokeWidth: 'number? — default 2',
    className: 'string? — extra class for sizing/positioning',
  },
  example: `<Icon name="git-branch" />
<Icon name="circle-check" className="skin-takeaways-icon" />`,
}
