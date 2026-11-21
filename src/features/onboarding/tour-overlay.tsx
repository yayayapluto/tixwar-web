import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TOUR_STEPS } from './tour-steps'

interface SpotRect {
  x: number
  y: number
  width: number
  height: number
}

interface TourOverlayProps {
  stepIndex: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

// How long a missing target is waited for (polling every 100ms) before the
// step is skipped: the first event card only exists once the list loads,
// and the bottom bar never renders for guests (a single nav item is not
// navigation), so those steps must not stall the tour.
const TARGET_WAIT_MS = 2000
const TARGET_POLL_MS = 100
const SPOTLIGHT_PADDING = 8
const TOOLTIP_GAP = 12

export function TourOverlay({ stepIndex, onNext, onBack, onSkip }: TourOverlayProps) {
  const step = TOUR_STEPS[stepIndex]
  const targetId = step?.targetId ?? ''
  const [rect, setRect] = useState<SpotRect | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  // The Next button remounts at every step (the Card is keyed by step),
  // so focusing it on mount walks keyboard users through the tour.
  const focusNextRef = useCallback((el: HTMLButtonElement | null) => {
    el?.focus()
  }, [])
  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const isLast = stepIndex === TOUR_STEPS.length - 1

  // Find the step target, scroll it into the middle of the app viewport
  // (the window itself never scrolls; content scrolls inside ScrollArea),
  // then keep the spotlight on it while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (targetId === '') return
    let cancelled = false
    let timer: number | undefined
    let attempts = 0

    const measure = () => {
      const el = document.getElementById(targetId)
      if (!el) return false
      const r = el.getBoundingClientRect()
      const x = Math.max(0, r.left - SPOTLIGHT_PADDING)
      const y = Math.max(0, r.top - SPOTLIGHT_PADDING)
      setRect({
        x,
        y,
        width: Math.min(window.innerWidth - x, r.width + SPOTLIGHT_PADDING * 2),
        height: Math.min(window.innerHeight - y, r.height + SPOTLIGHT_PADDING * 2),
      })
      return true
    }

    const attempt = () => {
      if (cancelled) return
      if (measure()) return
      attempts += 1
      if (attempts * TARGET_POLL_MS >= TARGET_WAIT_MS) {
        onNext()
        return
      }
      timer = window.setTimeout(attempt, TARGET_POLL_MS)
    }

    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    }
    attempt()

    // Scroll events do not bubble, so capture them at the window to follow
    // the target while the ScrollArea viewport scrolls under the overlay.
    const remeasure = () => {
      if (!cancelled) measure()
    }
    window.addEventListener('scroll', remeasure, true)
    window.addEventListener('resize', remeasure)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('scroll', remeasure, true)
      window.removeEventListener('resize', remeasure)
    }
  }, [targetId, onNext, reducedMotion])

  // Place the tooltip below the spotlight when it fits, above it when it
  // does not, and keep it inside the viewport horizontally.
  useLayoutEffect(() => {
    if (!rect) return
    const tooltip = tooltipRef.current
    if (!tooltip) return
    const width = tooltip.offsetWidth
    const height = tooltip.offsetHeight
    const spaceBelow = window.innerHeight - rect.y - rect.height
    const top =
      spaceBelow >= height + TOOLTIP_GAP
        ? rect.y + rect.height + TOOLTIP_GAP
        : Math.max(8, rect.y - TOOLTIP_GAP - height)
    const left = Math.min(
      Math.max(8, rect.x + rect.width / 2 - width / 2),
      window.innerWidth - width - 8,
    )
    setPos({ top, left })
  }, [rect])

  // Escape skips the tour.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSkip])

  if (!step) return null

  const rx = rect ? Math.min(12, rect.height / 2) : 0
  const holeTransition = reducedMotion
    ? 'none'
    : 'x 300ms ease, y 300ms ease, width 300ms ease, height 300ms ease, rx 300ms ease'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-[90]"
    >
      {rect && (
        <>
          <svg className="absolute inset-0 h-full w-full" onClick={onSkip} aria-hidden="true">
            <defs>
              <mask id="tour-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx={rx}
                  fill="black"
                  style={{ transition: holeTransition }}
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="black"
              fillOpacity={0.65}
              mask="url(#tour-spotlight-mask)"
            />
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx={rx}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2}
              style={{ transition: holeTransition }}
            />
          </svg>
          <div
            ref={tooltipRef}
            className={cn('absolute', !pos && 'invisible')}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
          >
            <Card
              key={step.id}
              className={cn(
                'w-80',
                !reducedMotion && 'animate-in fade-in slide-in-from-bottom-2 duration-200',
              )}
            >
              <CardHeader>
                <CardTitle id="tour-title">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Step {stepIndex + 1} of {TOUR_STEPS.length}
                  </p>
                  <Button variant="ghost" size="sm" onClick={onSkip}>
                    Skip
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={onBack} disabled={stepIndex === 0}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                  </Button>
                  <Button size="sm" onClick={onNext} ref={focusNextRef}>
                    {isLast ? 'Finish' : 'Next'}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
