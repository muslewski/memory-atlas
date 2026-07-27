import { iconNames } from 'lucide-react/dynamic'
import { describe, expect, it } from 'vitest'
import { ICON_ALIASES, resolveIconName } from './icon-aliases'

describe('resolveIconName', () => {
  it('maps a legacy alias to its lucide name', () => {
    expect(resolveIconName('bulb')).toBe('lightbulb')
    expect(resolveIconName('alert-triangle')).toBe('triangle-alert')
  })

  it('passes through a name with no alias', () => {
    expect(resolveIconName('git-branch')).toBe('git-branch')
  })

  it('every alias target is a real lucide icon', () => {
    const set = new Set(iconNames as string[])
    for (const target of Object.values(ICON_ALIASES)) {
      expect(set.has(target), `alias target "${target}" must be a lucide icon`).toBe(true)
    }
  })

  it('every legacy sprite name resolves to a real lucide icon', () => {
    const set = new Set(iconNames as string[])
    const legacy = [
      'camera',
      'circle',
      'circle-check',
      'arrow-right',
      'alert-triangle',
      'gavel',
      'lock',
      'shield',
      'external-link',
      'layers',
      'file',
      'bulb',
      'clock',
      'chevron-right',
    ]
    for (const name of legacy) {
      expect(set.has(resolveIconName(name)), `legacy "${name}" -> "${resolveIconName(name)}"`).toBe(
        true,
      )
    }
  })
})
