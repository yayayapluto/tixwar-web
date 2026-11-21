import type { components } from '@api-types'
import { useMutation } from '@tanstack/react-query'
import { getDebugStream, postDebugChaos, postDebugLoad } from '@/lib/client'
import { useSse } from '@/lib/sse'

export type DebugLoadRequest = components['schemas']['DebugLoadRequest']
export type DebugChaosRequest = components['schemas']['DebugChaosRequest']

export function useDebugLoad() {
  return useMutation({
    mutationFn: async ({ input, signal }: { input: DebugLoadRequest; signal?: AbortSignal }) => {
      // The generated client passes `signal` through to fetch (its Config
      // extends RequestInit), so aborting cancels the in-flight request.
      const res = await postDebugLoad({ body: input, signal, throwOnError: true })
      return res
    },
  })
}

// fetch rejects an aborted request with a DOMException named AbortError;
// the client error interceptor only runs for HTTP responses, so it reaches
// the mutation untouched (and is not an ApiError, so the global
// MutationCache.onError does not toast it either).
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useDebugChaos() {
  return useMutation({
    mutationFn: async (input: DebugChaosRequest) => {
      const res = await postDebugChaos({ body: input, throwOnError: true })
      return res.data
    },
  })
}

export function useDebugStream(enabled: boolean, onMessage: (trace: unknown) => void) {
  useSse(enabled, [], (signal) =>
    getDebugStream({
      signal,
      onSseEvent: (ev) => {
        if (ev.event === 'message') onMessage(ev.data)
      },
    }),
  )
}
