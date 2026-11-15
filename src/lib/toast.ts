import { useSyncExternalStore } from 'react'

export type Toast = {
  id: number
  message: string
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

export function toast(message: string, duration = 6000) {
  const id = nextId++
  toasts = [...toasts, { id, message }]
  emit()
  setTimeout(() => dismissToast(id), duration)
  return id
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  )
}
