import type { components } from '@api-types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postV1OrdersByIdPay } from '@/lib/client'
import { newIdempotencyKey } from '@/lib/utils'

export type PayResult = components['schemas']['PayResult']

export function usePayOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await postV1OrdersByIdPay({
        path: { id },
        body: {},
        headers: { 'Idempotency-Key': newIdempotencyKey() },
        throwOnError: true,
      })
      return res.data.data
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
