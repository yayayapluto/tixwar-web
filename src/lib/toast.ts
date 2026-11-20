import { useSyncExternalStore } from 'react'

export type Toast = {
  id: number
  message: string
  variant: 'error' | 'success'
}

const MAX_TOASTS = 4
const DEFAULT_DURATION_MS = 6000

const listeners = new Set<() => void>()
let toasts: Toast[] = []
let nextId = 1

// Auto-dismiss timers, keyed by toast id. Each entry tracks how much time is
// left so a toast can pause while the user hovers or focuses it.
type ToastTimer = {
  timeout: ReturnType<typeof setTimeout>
  startedAt: number
  remainingMs: number
  paused: boolean
}
const timers = new Map<number, ToastTimer>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function clearTimer(id: number) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer.timeout)
    timers.delete(id)
  }
}

function armTimer(id: number, remainingMs: number) {
  clearTimer(id)
  const timeout = setTimeout(() => dismissToast(id), remainingMs)
  timers.set(id, { timeout, startedAt: Date.now(), remainingMs, paused: false })
}

export function dismissToast(id: number) {
  clearTimer(id)
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

/** Pause the auto-dismiss countdown (hover/focus). No-op if already paused. */
export function pauseToast(id: number) {
  const timer = timers.get(id)
  if (!timer || timer.paused) return
  clearTimeout(timer.timeout)
  timer.remainingMs = Math.max(0, timer.remainingMs - (Date.now() - timer.startedAt))
  timer.paused = true
}

/** Resume the auto-dismiss countdown with the remaining time. */
export function resumeToast(id: number) {
  const timer = timers.get(id)
  if (!timer?.paused) return
  if (timer.remainingMs <= 0) {
    dismissToast(id)
    return
  }
  armTimer(id, timer.remainingMs)
}

export function toast(
  message: string,
  opts?: { duration?: number; variant?: 'error' | 'success' },
) {
  const variant = opts?.variant ?? 'error'
  // Don't stack the same message twice (e.g. a failure toasted by both the
  // global MutationCache.onError and a local handler).
  const existing = toasts.find((t) => t.message === message && t.variant === variant)
  if (existing) return existing.id
  const id = nextId++
  toasts = [...toasts, { id, message, variant }]
  // Cap the stack so a burst of errors can't fill the screen.
  if (toasts.length > MAX_TOASTS) {
    const dropped = toasts.slice(0, toasts.length - MAX_TOASTS)
    for (const item of dropped) clearTimer(item.id)
    toasts = toasts.slice(-MAX_TOASTS)
  }
  emit()
  armTimer(id, opts?.duration ?? DEFAULT_DURATION_MS)
  return id
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  )
}
