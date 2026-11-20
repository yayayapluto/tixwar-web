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
  const seconds = Math.max(0, Math.floor(totalSeconds))
  // One scheme for every deadline in the app (sale end, order expiry, QR
  // expiry), so a list of cards never mixes total-minutes with HH:MM:SS:
  // under an hour "MM:SS", 1-24 hours "H:MM:SS", beyond a day "Nd Nh".
  if (seconds > 86400) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
