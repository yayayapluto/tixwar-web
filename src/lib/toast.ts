import { toast as sonnerToast } from 'sonner'

// Thin adapter over Sonner, shadcn's toast primitive. Call sites keep the
// old `toast(message, { variant, duration })` API; dedupe and the 4-toast
// cap live here, while hover-pause, the close button and stacking above
// Radix overlays are Sonner defaults.
export type ToastVariant = 'error' | 'success'

const MAX_TOASTS = 4
const DEFAULT_DURATION_MS = 6000

// Active toasts in insertion order, keyed by message+variant for dedupe.
// Entries are forgotten when a toast is dismissed or auto-closes.
const active = new Map<string, number | string>()
const order: Array<string> = []

function toastKey(message: string, variant: ToastVariant): string {
  return `${variant}:${message}`
}

function forget(key: string) {
  active.delete(key)
  const index = order.indexOf(key)
  if (index !== -1) order.splice(index, 1)
}

export function dismissToast(id: number | string) {
  sonnerToast.dismiss(id)
}

export function toast(
  message: string,
  opts?: { duration?: number; variant?: ToastVariant },
): number | string {
  const variant = opts?.variant ?? 'error'
  const key = toastKey(message, variant)
  const existing = active.get(key)
  if (existing !== undefined) return existing
  // Cap the stack so a burst of errors can't fill the screen: drop the
  // oldest toast instead of queueing it behind the visible ones.
  while (order.length >= MAX_TOASTS) {
    const oldest = order[0]
    if (oldest === undefined) break
    const oldestId = active.get(oldest)
    if (oldestId !== undefined) sonnerToast.dismiss(oldestId)
    forget(oldest)
  }
  const cleanup = () => forget(key)
  const data = {
    duration: opts?.duration ?? DEFAULT_DURATION_MS,
    onDismiss: cleanup,
    onAutoClose: cleanup,
  }
  const id =
    variant === 'success' ? sonnerToast.success(message, data) : sonnerToast.error(message, data)
  active.set(key, id)
  order.push(key)
  return id
}
