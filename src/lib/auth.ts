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

// Which storage holds the current session. A remembered session lives in
// localStorage (survives a browser restart); a session without "remember me"
// lives in sessionStorage (cleared when the browser session ends). Only one
// storage ever holds the session — writing to one removes the entry from the
// other, so a stale token in the other storage can never win.
let storage: Storage | null = null

function read(): Session | null {
  if (cache !== undefined) return cache
  // localStorage first: the remembered session is the long-lived one. A
  // sessionStorage entry only exists when no remembered session was written
  // (setSession always clears the other storage), so this order is only a
  // tiebreak for a state that should not occur.
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(STORAGE_KEY)
      if (raw) {
        cache = JSON.parse(raw) as Session
        storage = store
        return cache
      }
    } catch {
      // unreadable entry in this storage; try the other one
    }
  }
  cache = null
  storage = null
  return cache
}

function emit(session: Session | null) {
  cache = session
  for (const fn of listeners) fn(session)
}

export function getSession(): Session | null {
  return read()
}

/** True when the current session is stored persistently (remember me). */
export function isSessionPersistent(): boolean {
  read()
  return storage === localStorage
}

export function setSession(session: Session, remember = isSessionPersistent()) {
  // Default keeps the current storage: a token refresh must write the new
  // token pair back to the same storage the session came from, so a
  // sessionStorage session never leaks into localStorage on refresh.
  const store = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  other.removeItem(STORAGE_KEY)
  store.setItem(STORAGE_KEY, JSON.stringify(session))
  storage = store
  emit(session)
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  storage = null
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
