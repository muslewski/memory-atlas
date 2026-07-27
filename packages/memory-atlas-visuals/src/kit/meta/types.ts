// src/kit/meta/types.ts — PrimitiveMeta contract (Task B1).
// Used by the D1 catalog. Do not change the shape without updating all meta files.

export interface PrimitiveMeta {
  name: string
  category: 'typography' | 'data' | 'orientation' | 'motion' | 'structure'
  useWhen: string // one line: when an author should reach for it
  props: Record<string, string> // prop name -> type/desc
  example: string // a minimal MDX usage snippet
}
