import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { AuthPageSkeleton } from '@/components/skeletons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm, clearAuthEmailDraft } from '@/features/auth/auth-form'
import { useRegister } from '@/features/auth/use-auth'
import { getSession } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    if (typeof search.redirect === 'string') return { redirect: search.redirect }
    return {}
  },
  beforeLoad: ({ search }) => {
    if (getSession()) {
      // The destination varies (search.redirect ?? '/events'), so there is
      // no single destination route that could consume a ?reason= param —
      // say it here instead. The Toaster lives in the root route, so the
      // toast survives the redirect, and the app configures no route
      // preloading, so beforeLoad only runs on a real navigation.
      toast("You're already logged in", { variant: 'success' })
      throw redirect({ to: search.redirect ?? '/events' })
    }
  },
  component: RegisterPage,
  pendingComponent: () => <AuthPageSkeleton variant="register" />,
})

function redirectLabel(redirect: string): string {
  if (redirect.startsWith('/events/')) return 'the event you were viewing'
  if (redirect === '/events') return 'the event list'
  if (redirect.startsWith('/orders')) return 'your orders'
  if (redirect.startsWith('/tickets')) return 'your tickets'
  if (redirect === '/api-keys') return 'API keys'
  return 'where you left off'
}

function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()
  const { redirect: redirectTo } = Route.useSearch()
  const emailTaken = register.error instanceof ApiError && register.error.status === 409

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription className="min-h-10">
            {redirectTo ? (
              <>
                Create an account to continue to {redirectLabel(redirectTo)}. Already registered?{' '}
              </>
            ) : (
              <>Create an account to buy before it sells out. Already registered? </>
            )}
            <Link
              to="/login"
              search={redirectTo ? { redirect: redirectTo } : undefined}
              className="underline underline-offset-4"
            >
              Log in
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            mode="register"
            submitLabel="Create account"
            isPending={register.isPending}
            error={register.error}
            onSubmit={(email, password) =>
              register.mutate(
                { email, password },
                {
                  onSuccess: () => {
                    clearAuthEmailDraft()
                    toast(
                      redirectTo
                        ? `You're in — back to ${redirectLabel(redirectTo)}`
                        : "You're in — pick your event",
                      { variant: 'success' },
                    )
                    navigate({ to: redirectTo ?? '/events' })
                  },
                },
              )
            }
          />
          <div className="min-h-9 pt-4 text-center text-sm text-muted-foreground">
            {emailTaken && (
              <>
                Already have an account?{' '}
                <Link
                  to="/login"
                  search={redirectTo ? { redirect: redirectTo } : undefined}
                  className="underline underline-offset-4"
                >
                  Log in instead
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
