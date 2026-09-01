import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from 'react'

type RegisterBeat = (at: number) => () => void

const BeatAuditContext = createContext<RegisterBeat | null>(null)

interface BeatAuditProps {
  id: string
  beats: number
  children: ReactNode
}

/**
 * Dev-only drift check between a slide's declared `beats` and the `<Beat at>`
 * values actually mounted inside it. A Beat past the declared range can never
 * reveal, and the drift is silent without this. Conditionally rendered Beats
 * can hide from the audit, so it only ever warns about what it saw mounted.
 */
export function BeatAudit({ id, beats, children }: BeatAuditProps) {
  const seen = useRef(new Set<number>())
  const warned = useRef(false)

  const register = useCallback<RegisterBeat>((at) => {
    seen.current.add(at)
    return () => {
      seen.current.delete(at)
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || warned.current) return
    const highest = Math.max(0, ...seen.current)
    if (highest > beats - 1) {
      warned.current = true
      console.warn(
        `[prezzer] slide "${id}" declares beats: ${beats}, but a <Beat at={${highest}}> is mounted — ` +
          `it can never reveal. Declare beats: ${highest + 1} (the count includes the initial state).`
      )
    }
  })

  return <BeatAuditContext.Provider value={register}>{children}</BeatAuditContext.Provider>
}

/** Registers a Beat's `at` with the surrounding audit; a no-op outside one. */
export function useBeatAudit(at: number): void {
  const register = useContext(BeatAuditContext)
  useEffect(() => register?.(at), [register, at])
}
