import type { components } from '@api-types'
import { useMutation } from '@tanstack/react-query'
import { getDebugStream, postDebugChaos, postDebugLoad } from '@/lib/client'
import { useSse } from '@/lib/sse'

export type DebugLoadRequest = components['schemas']['DebugLoadRequest']
export type DebugChaosRequest = components['schemas']['DebugChaosRequest']

export function useDebugLoad() {
  return useMutation({
    mutationFn: async (input: DebugLoadRequest) => {
      const res = await postDebugLoad({ body: input, throwOnError: true })
      return res
    },
  })
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
