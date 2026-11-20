import type { components } from '@api-types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteV1ApiKeysById, getV1ApiKeys, postV1ApiKeys } from '@/lib/client'
import { toast } from '@/lib/toast'

export type ApiKey = components['schemas']['ApiKey']
export type ApiKeyCreated = components['schemas']['ApiKeyCreated']

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => (await getV1ApiKeys({ throwOnError: true })).data,
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await postV1ApiKeys({ body: { name }, throwOnError: true })
      return res.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteV1ApiKeysById({ path: { id }, throwOnError: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast('API key revoked', { variant: 'success' })
    },
  })
}
