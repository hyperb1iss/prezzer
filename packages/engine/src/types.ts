import type { ComponentType } from 'react'
import type { TransitionType } from './motion/animations'

export interface SlideDef {
  /** Outline id, e.g. "S9", stable across reorders */
  id: string
  title: string
  component: ComponentType
  /** Act number; drives progress-rail grouping and grid colors */
  act?: number
  /** Total in-slide states including the initial one; 1 = no in-slide advancement */
  beats?: number
  transition?: TransitionType
  /** Speaker notes shown by the `n` overlay */
  notes?: string[]
  /** ▽ deep slide, first to compress when time runs short */
  deep?: boolean
  /** Honest status stamp rendered top-right, e.g. "GA" or "IN FLIGHT" */
  badge?: RolloutStatus | (string & {})
}

/** SlideDef with every optional field resolved; what the engine works with. */
export interface ResolvedSlideDef extends SlideDef {
  act: number
  beats: number
  transition: TransitionType
  notes: string[]
}

export interface ActDef {
  number: number
  title: string
  color: string
}

/**
 * The badge vocabulary the built-in stamp styles cover; any string works.
 * The `string & {}` union half keeps autocomplete for these without
 * closing the type to custom stamps.
 */
export type RolloutStatus = 'GA' | 'DEV ONLY' | 'NOT ROLLED OUT' | 'COMING SOON' | 'IN FLIGHT'

export function resolveSlide(def: SlideDef): ResolvedSlideDef {
  return {
    ...def,
    act: def.act ?? 0,
    beats: Math.max(1, Math.floor(def.beats ?? 1)),
    transition: def.transition ?? 'morph',
    notes: def.notes ?? [],
  }
}
