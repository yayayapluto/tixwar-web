import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm } from '@/features/auth/auth-form'
import { useRegister } from '@/features/auth/use-auth'
import { getSession } from '@/lib/auth'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: '/events' })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Already registered?{' '}
            <Link to="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            mode="register"
            submitLabel="Create account"
            isPending={register.isPending}
            onSubmit={(email, password) =>
              register.mutate({ email, password }, { onSuccess: () => navigate({ to: '/events' }) })
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
