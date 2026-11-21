import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { AuthPageSkeleton } from '@/components/skeletons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm, clearAuthEmailDraft } from '@/features/auth/auth-form'
import { useLogin } from '@/features/auth/use-auth'
import { getSession } from '@/lib/auth'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; reason?: string } => {
    const out: { redirect?: string; reason?: string } = {}
    if (typeof search.redirect === 'string') out.redirect = search.redirect
    if (search.reason === 'session-expired') out.reason = 'session-expired'
    return out
  },
  beforeLoad: ({ search }) => {
    if (getSession()) throw redirect({ to: search.redirect ?? '/events' })
  },
  component: LoginPage,
  pendingComponent: () => <AuthPageSkeleton variant="login" />,
})

function redirectLabel(redirect: string): string {
  if (redirect.startsWith('/events/')) return 'the event you were viewing'
  if (redirect === '/events') return 'the event list'
  if (redirect.startsWith('/orders')) return 'your orders'
  if (redirect.startsWith('/tickets')) return 'your tickets'
  if (redirect === '/api-keys') return 'API keys'
  return 'where you left off'
}

function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const { redirect: redirectTo, reason } = Route.useSearch()
  const isGateRedirect =
    redirectTo !== undefined &&
    (redirectTo.startsWith('/events/') || redirectTo.startsWith('/orders'))

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription className="min-h-10">
            {redirectTo ? (
              <>Log in to continue to {redirectLabel(redirectTo)}. New here? </>
            ) : (
              <>New here? </>
            )}
            <Link
              to="/register"
              search={redirectTo ? { redirect: redirectTo } : undefined}
              className="underline underline-offset-4"
            >
              Create an account
            </Link>
          </CardDescription>
          {isGateRedirect && (
            <p className="text-sm">
              You&apos;re one step from checkout — log in to keep your place.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {reason === 'session-expired' && (
            <p role="status" className="mb-4 rounded-md border bg-muted px-3 py-2 text-sm">
              Your session ended after 7 days. Log in again to continue.
            </p>
          )}
          <AuthForm
            mode="login"
            submitLabel="Log in"
            isPending={login.isPending}
            error={login.error}
            onSubmit={(email, password, rememberMe) =>
              login.mutate(
                { email, password, rememberMe },
                {
                  onSuccess: () => {
                    clearAuthEmailDraft()
                    toast(
                      redirectTo
                        ? `You're in — back to ${redirectLabel(redirectTo)}`
                        : "You're in — welcome back",
                      { variant: 'success' },
                    )
                    navigate({ to: redirectTo ?? '/events' })
                  },
                },
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
