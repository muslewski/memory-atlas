/**
 * config/index.ts — resolved Vellum config for the app to consume.
 *
 * Import `{ visuals }` anywhere (`@/config`) to read the merged config; import
 * `defineVisuals` only in visuals.config.ts. The app-root visuals.config.ts is the
 * single edit surface.
 */
import config from '../../visuals.config'

export const visuals = config
export type { ContentMode, VisualsConfig, VisualsConfigInput } from './types'
