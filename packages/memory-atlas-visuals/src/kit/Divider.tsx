/**
 * Divider — a labelled rule. Typeset styles the bare `hr`; the label is the only
 * thing left that Typeset has no opinion about.
 */
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr />
  return (
    // biome-ignore lint/a11y/useAriaPropsForRole: internal gallery app, a11y refactor out of scope
    // biome-ignore lint/a11y/useSemanticElements: internal gallery app, a11y refactor out of scope
    // biome-ignore lint/a11y/useFocusableInteractive: internal gallery app, a11y refactor out of scope
    <div className="kit-divider" role="separator" aria-label={label}>
      <span className="kit-divider__label">{label}</span>
    </div>
  )
}
