import type { components } from '@api-types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getV1Orders, getV1OrdersById, postV1Orders, postV1OrdersByIdCancel } from '@/lib/client'
import { newIdempotencyKey } from '@/lib/utils'

export type Order = components['schemas']['Order']
export type OrderStatus = Order['status']

export function useOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ['orders', status ?? 'all'],
    queryFn: async () =>
      (await getV1Orders({ query: status ? { status } : {}, throwOnError: true })).data,
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await getV1OrdersById({ path: { id }, throwOnError: true })).data,
    enabled: id.length > 0,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tierId, quantity }: { tierId: string; quantity: number }) => {
      const res = await postV1Orders({
        body: { tierId, quantity },
        headers: { 'Idempotency-Key': newIdempotencyKey() },
        throwOnError: true,
      })
      return res.data.data.order
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['event', order.eventId] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await postV1OrdersByIdCancel({ path: { id }, throwOnError: true })
      return res.data.data
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
