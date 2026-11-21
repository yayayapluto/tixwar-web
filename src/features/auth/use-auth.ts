import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { clearSession, getSession, type Session, setSession, subscribeSession } from '@/lib/auth'
import {
  postV1AuthForgotPassword,
  postV1AuthLogin,
  postV1AuthLogout,
  postV1AuthRegister,
  postV1AuthResetPassword,
} from '@/lib/client'

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession)
}

type Credentials = { email: string; password: string; rememberMe?: boolean }

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: Credentials) => {
      const res = await postV1AuthLogin({ body: { email, password }, throwOnError: true })
      const session = res.data.data
      setSession(
        {
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresIn: session.expiresIn,
        },
        rememberMe,
      )
      return session.user
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({ email, password }: Credentials) => {
      const res = await postV1AuthRegister({ body: { email, password }, throwOnError: true })
      const session = res.data.data
      // Register has no "remember me" checkbox, so it keeps the previous
      // behaviour: the session is stored persistently in localStorage.
      setSession(
        {
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresIn: session.expiresIn,
        },
        true,
      )
      return session.user
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const res = await postV1AuthForgotPassword({ body: { email }, throwOnError: true })
      return res.data.data
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const res = await postV1AuthResetPassword({
        body: { token, password },
        throwOnError: true,
      })
      return res.data.data
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async () => {
      const session = getSession()
      if (session?.refreshToken) {
        try {
          await postV1AuthLogout({
            body: { refreshToken: session.refreshToken },
            throwOnError: true,
          })
        } catch {
          // revoke may fail if token already invalid; local logout still proceeds
        }
      }
      clearSession()
    },
    onSuccess: async () => {
      queryClient.clear()
      await navigate({ to: '/login' })
    },
  })
}
