import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { AuthForm } from '@/features/auth/auth-form'
import { useLogin, useSession } from '@/features/auth/use-auth'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    if (typeof search.redirect === 'string') return { redirect: search.redirect }
    return {}
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const session = useSession()
  const login = useLogin()
  const { redirect: redirectTo } = Route.useSearch()

  if (session) {
    throw redirect({ to: redirectTo ?? '/events' })
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/register" className="underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
      <AuthForm
        mode="login"
        submitLabel="Log in"
        isPending={login.isPending}
        error={login.error}
        onSubmit={(email, password) =>
          login.mutate(
            { email, password },
            { onSuccess: () => navigate({ to: redirectTo ?? '/events' }) },
          )
        }
      />
    </div>
  )
}
