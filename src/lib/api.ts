import { clearSession, getAccessToken, getRefreshToken, getSession, setSession } from './auth'
import { client } from './client/client.gen'
import { postV1AuthRefresh } from './client/sdk.gen'
import { type ApiError, retryAfterFromResponse, toApiError } from './errors'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

client.setConfig({
  baseUrl: API_BASE_URL,
  auth: (auth) => {
    if (auth.scheme === 'bearer') return getAccessToken() ?? undefined
    return undefined
  },
})

const AUTH_WHITELIST = ['/v1/auth/login', '/v1/auth/register', '/v1/auth/refresh']

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await postV1AuthRefresh({ body: { refreshToken }, throwOnError: true })
    const result = res.data.data
    const session = getSession()
    if (!session) return null
    setSession({
      ...session,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    })
    return result.accessToken
  } catch {
    clearSession()
    return null
  }
}

function refreshSingleFlight(): Promise<string | null> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

client.interceptors.response.use(async (response, request) => {
  if (response.status !== 401) return response
  if (AUTH_WHITELIST.some((p) => request.url.includes(p))) return response
  const token = await refreshSingleFlight()
  if (!token) return response
  const headers = new Headers(request.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const fetchImpl = client.getConfig().fetch ?? globalThis.fetch
  return fetchImpl(new Request(request, { headers }))
})

client.interceptors.error.use(async (error, response) => {
  const mapped = toApiError(error)
  if (response && mapped.retryAfterSeconds === undefined) {
    const retryAfter = retryAfterFromResponse(response)
    if (retryAfter !== undefined) mapped.retryAfterSeconds = retryAfter
  }
  return mapped
})

export type { ApiError }
export { client }
