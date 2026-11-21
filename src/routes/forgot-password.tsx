import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { AuthPageSkeleton } from '@/components/skeletons'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFormError } from '@/features/auth/auth-form'
import { useForgotPassword } from '@/features/auth/use-auth'
import { getSession } from '@/lib/auth'

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: '/events' })
  },
  component: ForgotPasswordPage,
  pendingComponent: () => <AuthPageSkeleton variant="forgot" />,
})

function ForgotPasswordPage() {
  const forgot = useForgotPassword()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    forgot.mutate({ email }, { onSuccess: () => setSentTo(email) })
  }

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-56">
            {sentTo ? (
              <div className="space-y-4">
                <p role="status" className="text-sm">
                  Check your inbox — if an account exists for {sentTo}, we&apos;ve sent a reset
                  link. The link expires in 1 hour.
                </p>
                <Link
                  to="/login"
                  className={buttonVariants({ variant: 'outline', className: 'w-full' })}
                >
                  Back to log in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    enterKeyHint="send"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="min-h-10">
                  <AuthFormError error={forgot.error} />
                </div>
                <Button type="submit" className="w-full" disabled={forgot.isPending}>
                  {forgot.isPending ? 'Loading…' : 'Send reset link'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Remembered it?{' '}
                  <Link to="/login" className="underline underline-offset-4">
                    Log in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
