import { useEffect, useState } from 'react'

export function useCountdown(targetIso: string | undefined): number | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!targetIso) return null
  const diff = new Date(targetIso).getTime() - now
  return diff <= 0 ? 0 : Math.ceil(diff / 1000)
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
