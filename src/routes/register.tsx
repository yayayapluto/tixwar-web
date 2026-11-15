import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
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
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/login" className="underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
      <AuthForm
        mode="register"
        submitLabel="Create account"
        isPending={register.isPending}
        onSubmit={(email, password) =>
          register.mutate({ email, password }, { onSuccess: () => navigate({ to: '/events' }) })
        }
      />
    </div>
  )
}
