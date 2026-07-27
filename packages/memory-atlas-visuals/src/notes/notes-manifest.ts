import type { NoteMeta } from '../../scripts/build-notes-manifest'
import data from './notes-manifest.json'

export type { NoteMeta }
// NoteMeta uses `illustrated` / `illustratedRoute` (renamed in Task 2)
export const notesManifest = data as { generated: string; notes: NoteMeta[] }
