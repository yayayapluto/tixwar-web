import { useSyncExternalStore } from 'react'

export type Toast = {
  id: number
  message: string
  variant: 'error' | 'success'
}

const listeners = new Set<() => void>()
let toasts: Toast[] = []
let nextId = 1

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

export function toast(
  message: string,
  opts?: { duration?: number; variant?: 'error' | 'success' },
) {
  const id = nextId++
  toasts = [...toasts, { id, message, variant: opts?.variant ?? 'error' }]
  emit()
  setTimeout(() => dismissToast(id), opts?.duration ?? 6000)
  return id
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  )
}
