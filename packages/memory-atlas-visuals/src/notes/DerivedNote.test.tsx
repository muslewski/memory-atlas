import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DerivedNote } from './DerivedNote'

afterEach(cleanup)

const body = '## Stakes\n\ntext\n\n## Architecture\n\ntext\n'

describe('DerivedNote', () => {
  it('renders a derived Hero from frontmatter', () => {
    render(<DerivedNote data={{ title: 'A Spec', type: 'spec', status: 'draft' }} body={body} />)
    expect(screen.getByRole('heading', { level: 1, name: 'A Spec' })).toBeTruthy()
  })

  it('renders a derived TOC from the h2s', () => {
    render(<DerivedNote data={{ title: 'A Spec' }} body={body} />)
    expect(screen.getByRole('link', { name: 'Stakes' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Architecture' })).toBeTruthy()
  })

  it('renders no TOC when the note has no h2/h3', () => {
    render(<DerivedNote data={{ title: 'Stub' }} body="just prose" />)
    expect(screen.queryByTestId('derived-toc')).toBeNull()
  })

  it('renders no metrics strip when frontmatter is empty', () => {
    render(<DerivedNote data={{}} body="prose" />)
    expect(screen.queryByTestId('derived-metrics')).toBeNull()
  })
})
