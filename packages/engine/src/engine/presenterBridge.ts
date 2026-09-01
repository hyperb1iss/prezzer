import { useCallback, useEffect, useRef } from 'react'
import { useDeck } from './DeckContext'

/**
 * The presenter window is the same artifact opened with `?presenter`, so
 * the transport is postMessage over the window.open pair: it works from
 * `file://`, where BroadcastChannel's same-origin model gets flaky, and the
 * opener relationship gives both sides a window to verify senders against.
 */

export interface PresenterNavState {
  slideIndex: number
  beat: number
  direction: number
}

export type PresenterCommand =
  | { prezzer: 'command'; action: 'next' | 'prev' | 'nextSlide' | 'prevSlide' }
  | { prezzer: 'command'; action: 'toggleDeny' | 'fireAutoplay' }
  | { prezzer: 'command'; action: 'goToSlide'; index: number }

export type PresenterMessage =
  | { prezzer: 'hello' }
  | { prezzer: 'state'; nav: PresenterNavState; denyMode: boolean }
  | PresenterCommand

export function isPresenterMessage(data: unknown): data is PresenterMessage {
  return typeof data === 'object' && data !== null && 'prezzer' in data
}

export function isPresenterWindow(): boolean {
  return (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('presenter')
  )
}

export function presenterUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.set('presenter', '1')
  return url.toString()
}

const commandActions = new Set([
  'next',
  'prev',
  'nextSlide',
  'prevSlide',
  'toggleDeny',
  'fireAutoplay',
  'goToSlide',
])

export interface PresenterAudienceOptions {
  /**
   * The widget-intercepting advance the shell already uses for keyboard and
   * touch — remote forward advances must share the same ordering guarantee.
   */
  advance: () => void
}

/**
 * Audience half: publishes navigation state to the presenter window and
 * applies the commands it sends back. Commands are only accepted from the
 * window this side opened (or that introduced itself with a hello).
 */
export function usePresenterAudience({ advance }: PresenterAudienceOptions): {
  openPresenter: () => void
} {
  const deck = useDeck()
  const presenterRef = useRef<Window | null>(null)

  const latestDeck = useRef(deck)
  const latestAdvance = useRef(advance)
  useEffect(() => {
    latestDeck.current = deck
    latestAdvance.current = advance
  })

  const postState = useCallback((target: Window) => {
    const { slideIndex, beat, direction, denyMode } = latestDeck.current
    target.postMessage(
      {
        prezzer: 'state',
        nav: { slideIndex, beat, direction },
        denyMode,
      } satisfies PresenterMessage,
      '*'
    )
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: the deps are the publish triggers; the body reads through latestDeck
  useEffect(() => {
    const target = presenterRef.current
    if (target && !target.closed) postState(target)
  }, [deck.slideIndex, deck.beat, deck.denyMode, postState])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isPresenterMessage(event.data)) return
      const message = event.data

      if (message.prezzer === 'hello') {
        // Adopt the caller: this also reconnects a presenter window that
        // outlived an audience reload.
        const source = event.source
        if (source && 'postMessage' in source) {
          presenterRef.current = source as Window
          postState(source as Window)
        }
        return
      }

      if (message.prezzer === 'command') {
        if (event.source !== presenterRef.current) return
        if (!commandActions.has(message.action)) return
        const actions = latestDeck.current
        if (message.action === 'goToSlide') {
          if (Number.isFinite(message.index)) actions.goToSlide(message.index)
        } else if (message.action === 'next') {
          // Forward advances start pending widgets before the deck moves,
          // exactly like keyboard and touch.
          latestAdvance.current()
        } else {
          actions[message.action]()
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [postState])

  const openPresenter = useCallback(() => {
    const existing = presenterRef.current
    if (existing && !existing.closed) {
      existing.focus()
      return
    }
    presenterRef.current = window.open(presenterUrl(), 'prezzer-presenter')
  }, [])

  return { openPresenter }
}
