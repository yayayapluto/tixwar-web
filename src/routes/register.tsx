import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { AuthForm } from '@/features/auth/auth-form'
import { useRegister, useSession } from '@/features/auth/use-auth'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const session = useSession()
  const register = useRegister()

  if (session) {
    throw redirect({ to: '/events' })
  }

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
        error={register.error}
        onSubmit={(email, password) =>
          register.mutate({ email, password }, { onSuccess: () => navigate({ to: '/events' }) })
        }
      />
    </div>
  )
}
