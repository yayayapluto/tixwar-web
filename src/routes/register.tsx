import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { AuthPageSkeleton } from '@/components/skeletons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm } from '@/features/auth/auth-form'
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
    if (getSession()) throw redirect({ to: search.redirect ?? '/events' })
  },
  component: RegisterPage,
  pendingComponent: () => <AuthPageSkeleton variant="register" />,
})

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
          <CardDescription>
            Create an account to buy before it sells out. Already registered?{' '}
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
                    toast("You're in — pick your event", { variant: 'success' })
                    navigate({ to: redirectTo ?? '/events' })
                  },
                },
              )
            }
          />
          {emailTaken && (
            <p className="pt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                search={redirectTo ? { redirect: redirectTo } : undefined}
                className="underline underline-offset-4"
              >
                Log in instead
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
