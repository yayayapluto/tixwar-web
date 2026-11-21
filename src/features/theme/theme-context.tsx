import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

type Theme = 'light' | 'dark'

const THEME_KEY = 'tixwar.theme'
// Fallback color fade, used only where the browser has no View Transitions.
const FADE_DURATION_MS = 300

function initialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const ThemeContext = createContext<{
  theme: Theme
  toggle: (origin?: { x: number; y: number }) => void
} | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const mountedRef = useRef(false)
  // How the next theme change should animate. The effect reads and clears
  // this after the state lands: 'wipe' means the View Transition already
  // handled it, 'fade' means the effect should run the color fade.
  const pendingTransitionRef = useRef<'wipe' | 'fade' | 'none'>('none')
  const fadeTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const root = document.documentElement
    const firstPaint = !mountedRef.current
    mountedRef.current = true
    const transition = firstPaint ? 'none' : pendingTransitionRef.current
    pendingTransitionRef.current = 'none'
    if (transition === 'fade') {
      // The class must be on before the dark class flips, or the colors
      // change before the transition exists.
      window.clearTimeout(fadeTimerRef.current)
      root.classList.add('theme-animating')
      fadeTimerRef.current = window.setTimeout(
        () => root.classList.remove('theme-animating'),
        FADE_DURATION_MS,
      )
    }
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#09090b' : '#ffffff')
  }, [theme])

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      const next = theme === 'dark' ? 'light' : 'dark'
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Preferred path: a circular wipe spreading from the toggle button.
      // The dark class is flipped inside the callback too, because the
      // passive effect may not have run when the browser captures the new
      // snapshot; the effect re-applies the same value later.
      if (!reducedMotion && origin && typeof document.startViewTransition === 'function') {
        const root = document.documentElement
        root.style.setProperty('--theme-wipe-x', `${origin.x}px`)
        root.style.setProperty('--theme-wipe-y', `${origin.y}px`)
        pendingTransitionRef.current = 'wipe'
        try {
          document.startViewTransition(() => {
            flushSync(() => setTheme(next))
            root.classList.toggle('dark', next === 'dark')
          })
          return
        } catch {
          // Fall through to the fade below.
        }
      }
      pendingTransitionRef.current = reducedMotion ? 'none' : 'fade'
      setTheme(next)
    },
    [theme],
  )

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
