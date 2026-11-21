import { useEffect, useRef } from 'react'

// A smooth cursor follower: a small dot tracks the pointer tightly while a
// ring eases toward it, so the cursor feels like it glides instead of
// snapping. The native cursor stays visible (forms keep their I-beam); the
// follower is a pointer-events-none accent only. Hidden on touch devices and
// when the user prefers reduced motion.
export function SmoothCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mouseX = -100
    let mouseY = -100
    let ringX = -100
    let ringY = -100
    let ringScale = 1
    let ringTargetScale = 1
    let shown = false
    let raf = 0

    const loop = () => {
      ringX += (mouseX - ringX) * 0.16
      ringY += (mouseY - ringY) * 0.16
      ringScale += (ringTargetScale - ringScale) * 0.2
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${ringScale.toFixed(3)})`
      raf = requestAnimationFrame(loop)
    }

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      if (!shown) {
        shown = true
        ringX = mouseX
        ringY = mouseY
        dot.style.opacity = '1'
        ring.style.opacity = '1'
      }
      const target = e.target instanceof Element ? e.target : null
      ringTargetScale = target?.closest(
        'a, button, input, select, textarea, label, [role="button"]',
      )
        ? 1.6
        : 1
    }
    const onLeave = () => {
      shown = false
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[100] size-1.5 rounded-full bg-primary opacity-0 transition-opacity duration-200 [@media(pointer:coarse)]:hidden motion-reduce:hidden"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[100] size-8 rounded-full border border-primary/50 opacity-0 transition-opacity duration-200 [@media(pointer:coarse)]:hidden motion-reduce:hidden"
      />
    </>
  )
}
