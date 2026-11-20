import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { AuthPageSkeleton } from '@/components/skeletons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm } from '@/features/auth/auth-form'
import { useLogin } from '@/features/auth/use-auth'
import { getSession } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    if (typeof search.redirect === 'string') return { redirect: search.redirect }
    return {}
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
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
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
        </CardHeader>
        <CardContent>
          <AuthForm
            mode="login"
            submitLabel="Log in"
            isPending={login.isPending}
            error={login.error}
            onSubmit={(email, password, rememberMe) =>
              login.mutate(
                { email, password, rememberMe },
                { onSuccess: () => navigate({ to: redirectTo ?? '/events' }) },
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
