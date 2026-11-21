import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useSession } from '@/features/auth/use-auth'
import { TourOverlay } from './tour-overlay'
import { TOUR_STEPS, TOUR_STORAGE_KEY } from './tour-steps'

interface TourContextValue {
  startTour: () => void
  isActive: boolean
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const context = useContext(TourContext)
  if (!context) throw new Error('useTour must be used inside TourProvider')
  return context
}

// The guided tour for regular users (guests and logged-in non-admins).
// The provider wraps the app shell so any page (for example Settings) can
// start the tour, and the overlay renders above the shell.
export function TourProvider({ children }: { children: ReactNode }) {
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const session = useSession()

  const finishTour = useCallback(() => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, 'done')
    setStepIndex(null)
  }, [])

  const goNext = useCallback(() => {
    if (stepIndex === null) return
    if (stepIndex + 1 >= TOUR_STEPS.length) {
      finishTour()
    } else {
      setStepIndex(stepIndex + 1)
    }
  }, [stepIndex, finishTour])

  const goBack = useCallback(() => {
    if (stepIndex === null || stepIndex === 0) return
    setStepIndex(stepIndex - 1)
  }, [stepIndex])

  // Starting from another route (Settings) goes to /events first, then
  // starts once the route has changed; the step effect waits for its
  // target to appear, so a still-loading list is fine.
  const startTour = useCallback(async () => {
    if (pathname !== '/events') {
      await navigate({ to: '/events' })
    }
    setStepIndex(0)
  }, [navigate, pathname])

  // Auto-start on the first visit to /events (or / which redirects there),
  // for guests and logged-in non-admins only. Finishing or skipping sets
  // the flag, so this never runs twice on the same device. The tour only
  // starts once the search input is actually in the DOM: starting while
  // the skeleton is up would burn every step's retry budget and finish
  // the tour before the user sees anything.
  useEffect(() => {
    if (pathname !== '/events' && pathname !== '/') return
    if (session?.user.role === 'admin') return
    if (stepIndex !== null) return
    if (window.localStorage.getItem(TOUR_STORAGE_KEY)) return
    let cancelled = false
    let timer: number | undefined
    let poll: number | undefined
    let waited = 0
    const startWhenReady = () => {
      if (cancelled) return
      if (document.getElementById('tour-search')) {
        setStepIndex(0)
        return
      }
      waited += 200
      if (waited >= 3000) return
      poll = window.setTimeout(startWhenReady, 200)
    }
    timer = window.setTimeout(startWhenReady, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.clearTimeout(poll)
    }
  }, [pathname, session, stepIndex])

  const value = useMemo(() => ({ startTour, isActive: stepIndex !== null }), [startTour, stepIndex])

  return (
    <TourContext.Provider value={value}>
      {children}
      {stepIndex !== null && (
        <TourOverlay stepIndex={stepIndex} onNext={goNext} onBack={goBack} onSkip={finishTour} />
      )}
    </TourContext.Provider>
  )
}
