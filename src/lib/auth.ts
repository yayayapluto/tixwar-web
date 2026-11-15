import type { components } from '../../docs/api-types'

export type User = components['schemas']['User']

export type Session = {
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const STORAGE_KEY = 'tixwar.session'

type Listener = (session: Session | null) => void
const listeners = new Set<Listener>()

let cache: Session | null | undefined

function read(): Session | null {
  if (cache !== undefined) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? (JSON.parse(raw) as Session) : null
  } catch {
    cache = null
  }
  return cache
}

function emit(session: Session | null) {
  cache = session
  for (const fn of listeners) fn(session)
}

export function getSession(): Session | null {
  return read()
}

export function setSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  emit(session)
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  emit(null)
}

export function getAccessToken(): string | null {
  return read()?.accessToken ?? null
}

export function getRefreshToken(): string | null {
  return read()?.refreshToken ?? null
}

export function subscribeSession(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
