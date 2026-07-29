import test from 'node:test'
import assert from 'node:assert/strict'
import { hasConflictMarkers, decideMerge } from '../lib/merge-index.mjs'

test('hasConflictMarkers finds all three git markers', () => {
  assert.equal(hasConflictMarkers('a\n<<<<<<< HEAD\nb\n'), true)
  assert.equal(hasConflictMarkers('a\n=======\nb\n'), true)
  assert.equal(hasConflictMarkers('a\n>>>>>>> branch\nb\n'), true)
  assert.equal(hasConflictMarkers('a\nnormal text\nb\n'), false)
})

test('a table row that merely starts with = is not a conflict marker', () => {
  assert.equal(hasConflictMarkers('| zone | =====not a marker |\n'), false)
})

test('decideMerge refuses when a zone card is conflicted', () => {
  const r = decideMerge({ zoneTexts: ['ok', '<<<<<<< HEAD\nx'] })
  assert.equal(r.ok, false)
  assert.match(r.reason, /zone/i)
})

test('decideMerge regenerates when zones are clean', () => {
  const r = decideMerge({ zoneTexts: ['ok', 'also ok'] })
  assert.equal(r.ok, true)
  assert.equal(r.action, 'regenerate')
})
