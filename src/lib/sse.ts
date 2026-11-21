import { type DependencyList, useEffect, useRef, useState } from 'react'

export type SseMessage<T = unknown> = { data: T; event?: string; id?: string }

export type SseRunner = (signal: AbortSignal) => Promise<{ stream: AsyncIterable<unknown> }>

/**
 * Connection state of an SSE stream.
 *
 * - `idle`: streaming disabled.
 * - `connecting`: waiting for the first event from the server.
 * - `connected`: at least one event arrived (the server sends a `ready` event
 *   on connect and a heartbeat every 15s, so a live connection reaches this
 *   quickly and stays here).
 * - `error`: the stream ended or failed without being aborted. Note the
 *   generated client retries internally, so callers that need per-attempt
 *   errors should also pass `onSseError` to the SSE call itself.
 */
export type SseStatus = 'idle' | 'connecting' | 'connected' | 'error'

export function useSse(enabled: boolean, deps: DependencyList, run: SseRunner): SseStatus {
  const runRef = useRef(run)
  runRef.current = run
  const [status, setStatus] = useState<SseStatus>('idle')

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    let cancelled = false
    setStatus('connecting')
    void (async () => {
      try {
        const { stream } = await runRef.current(controller.signal)
        if (cancelled) return
        for await (const _ of stream) {
          if (cancelled) return
          setStatus('connected')
        }
        // The stream ended without an abort: the server closed the connection.
        if (!cancelled) setStatus('error')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  return status
}
