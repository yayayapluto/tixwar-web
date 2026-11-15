import { type DependencyList, useEffect, useRef } from 'react'

export type SseMessage<T = unknown> = { data: T; event?: string; id?: string }

export type SseRunner = (signal: AbortSignal) => Promise<{ stream: AsyncIterable<unknown> }>

export function useSse(enabled: boolean, deps: DependencyList, run: SseRunner) {
  const runRef = useRef(run)
  runRef.current = run

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void (async () => {
      try {
        const { stream } = await runRef.current(controller.signal)
        for await (const _ of stream) {
          if (controller.signal.aborted) break
        }
      } catch {
        // aborted or connection reset; the generated client reconnects itself
      }
    })()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])
}
