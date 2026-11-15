import type { components } from '../../docs/api-types'

export type Problem = components['schemas']['Problem']

export type DomainCode =
  | 'SOLD_OUT'
  | 'SALE_NOT_STARTED'
  | 'SALE_ENDED'
  | 'LIMIT_EXCEEDED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_IN_PROGRESS'
  | 'ORDER_EXPIRED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INVALID_STATE_TRANSITION'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE'

export class ApiError extends Error {
  readonly status: number
  readonly code: DomainCode | string
  readonly title: string
  readonly detail: string
  readonly requestId?: string
  readonly errors?: Array<{ field?: string; message: string; value?: string }>
  retryAfterSeconds?: number

  constructor(problem: Problem, retryAfterSeconds?: number) {
    super(problem.detail ?? problem.title)
    this.name = 'ApiError'
    this.status = problem.status
    this.code = problem.code
    this.title = problem.title
    this.detail = problem.detail ?? problem.title
    this.requestId = problem.requestId
    this.errors = problem.errors
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export function toApiError(raw: unknown): ApiError {
  if (raw instanceof ApiError) return raw
  if (raw instanceof Response)
    return new ApiError({
      status: raw.status,
      title: raw.statusText,
      detail: raw.statusText,
      code: 'HTTP_ERROR',
      type: 'about:blank',
    })

  const p = raw as Partial<Problem>
  if (p && typeof p.status === 'number' && typeof p.title === 'string') {
    return new ApiError(p as Problem)
  }
  return new ApiError({
    status: 0,
    title: 'Network Error',
    detail: raw instanceof Error ? raw.message : 'Unexpected error',
    code: 'NETWORK_ERROR',
    type: 'about:blank',
  })
}

export function retryAfterFromResponse(response: Response): number | undefined {
  const header = response.headers.get('Retry-After')
  if (!header) return undefined
  const seconds = Number(header)
  return Number.isFinite(seconds) ? seconds : undefined
}
