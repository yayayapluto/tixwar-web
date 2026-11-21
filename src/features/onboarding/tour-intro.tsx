import { useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TourIntroProps {
  onStart: () => void
  onSkip: () => void
}

// The welcome box shown before the tour itself: the user chooses whether
// to take the tour at all, instead of the spotlight starting uninvited.
// Skipping counts as done, so the tour never auto-starts again.
export function TourIntro({ onStart, onSkip }: TourIntroProps) {
  // The Start button is focused on mount so keyboard users land on the
  // choice, not on the page behind the backdrop.
  const focusStartRef = useCallback((el: HTMLButtonElement | null) => {
    el?.focus()
  }, [])
  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // Escape skips, like the tour overlay.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSkip])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-intro-title"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
    >
      <div aria-hidden="true" onClick={onSkip} className="absolute inset-0 bg-black/65" />
      <Card
        className={cn(
          'relative w-80',
          !reducedMotion && 'animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        <CardHeader>
          <CardTitle id="tour-intro-title">Take a quick tour?</CardTitle>
          <CardDescription>
            We will point out the main things on this page: searching, categories, and buying a
            ticket. It takes less than a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
          <Button size="sm" onClick={onStart} ref={focusStartRef}>
            Start tour
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
