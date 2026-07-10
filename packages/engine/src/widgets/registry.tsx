import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react'

/**
 * Imperative widgets implement this handle (via useImperativeHandle) and
 * register with useWidgetRegistration. The spacebar then starts widgets in
 * registration order before it advances the deck. This is the push model for
 * widgets that own their own timeline. Beat-driven widgets skip all of this
 * and just read useBeat().
 */
export interface DeckWidgetHandle {
  start: () => void
  isStarted: () => boolean
}

interface SlideWidgetContextValue {
  registerWidget: (id: string, ref: RefObject<DeckWidgetHandle | null>) => void
  unregisterWidget: (id: string) => void
  /** Starts the first unstarted widget; false when all have run */
  startNextWidget: () => boolean
}

const SlideWidgetContext = createContext<SlideWidgetContextValue | null>(null)

export function SlideWidgetProvider({ children }: { children: ReactNode }) {
  const widgetsRef = useRef<Map<string, RefObject<DeckWidgetHandle | null>>>(new Map())
  const startOrderRef = useRef<string[]>([])

  const registerWidget = useCallback((id: string, ref: RefObject<DeckWidgetHandle | null>) => {
    widgetsRef.current.set(id, ref)
    if (!startOrderRef.current.includes(id)) {
      startOrderRef.current.push(id)
    }
  }, [])

  const unregisterWidget = useCallback((id: string) => {
    widgetsRef.current.delete(id)
    startOrderRef.current = startOrderRef.current.filter((i) => i !== id)
  }, [])

  const startNextWidget = useCallback(() => {
    for (const id of startOrderRef.current) {
      const ref = widgetsRef.current.get(id)
      if (ref?.current && !ref.current.isStarted()) {
        ref.current.start()
        return true
      }
    }
    return false
  }, [])

  const value = useMemo(
    () => ({ registerWidget, unregisterWidget, startNextWidget }),
    [registerWidget, unregisterWidget, startNextWidget]
  )

  return <SlideWidgetContext.Provider value={value}>{children}</SlideWidgetContext.Provider>
}

export function useSlideWidgets(): SlideWidgetContextValue {
  const context = useContext(SlideWidgetContext)
  if (!context) {
    throw new Error('useSlideWidgets must be used within a SlideWidgetProvider')
  }
  return context
}

export function useSlideWidgetContext(): SlideWidgetContextValue | null {
  return useContext(SlideWidgetContext)
}

/** Registers an imperative widget; pass the returned ref to your component. */
export function useWidgetRegistration(): RefObject<DeckWidgetHandle | null> {
  const context = useSlideWidgetContext()
  const id = useId()
  const ref = useRef<DeckWidgetHandle | null>(null)

  useEffect(() => {
    if (!context) return
    context.registerWidget(id, ref)
    return () => context.unregisterWidget(id)
  }, [context, id])

  return ref
}
