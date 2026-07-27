/// <reference types="vite/client" />

declare module 'virtual:atlas-diagrams' {
  const map: Record<string, string>
  export default map
}

declare module 'virtual:atlas-diagram-svgs' {
  const map: Record<string, string>
  export default map
}

declare module 'virtual:atlas-heroes' {
  const map: Record<string, string>
  export default map
}

declare module 'virtual:atlas-mdx-loaders' {
  const map: Record<string, () => Promise<{ default: import('react').ComponentType }>>
  export default map
}

declare const __VAULT_DIR__: string
declare const __VISUALS_DIR__: string
