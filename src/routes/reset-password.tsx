import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { AuthPageSkeleton } from '@/components/skeletons'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFormError, MIN_PASSWORD_LENGTH } from '@/features/auth/auth-form'
import { useResetPassword } from '@/features/auth/use-auth'
import { getSession } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => {
    if (typeof search.token === 'string') return { token: search.token }
    return {}
  },
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: '/events' })
  },
  component: ResetPasswordPage,
  pendingComponent: () => <AuthPageSkeleton variant="reset" />,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const reset = useResetPassword()
  const { token } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const tokenExpired = reset.error instanceof ApiError && reset.error.status === 401
  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setClientError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    // The mismatch is already shown live under the confirm field.
    if (passwordsMismatch) return
    setClientError(null)
    reset.mutate(
      { token, password },
      {
        onSuccess: () => {
          setDone(true)
          // The token has served its purpose: drop it from the address bar
          // (same route, so the success state stays rendered in place).
          navigate({ to: '/reset-password', replace: true })
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Choose a new password for your account. Links expire after 1 hour. If this link is old,
            request a new one.
          </CardDescription>
          <p
            aria-hidden={done || !token}
            className={cn('min-h-5 text-sm text-muted-foreground', (done || !token) && 'invisible')}
          >
            Use the password for the account this link was sent to.
          </p>
        </CardHeader>
        <CardContent>
          <div className="min-h-[348px]">
            {done ? (
              <div className="space-y-4">
                <p role="status" className="text-sm">
                  Your password has been reset. Log in with your new password.
                </p>
                <Link to="/login" className={buttonVariants({ className: 'w-full' })}>
                  Log in
                </Link>
              </div>
            ) : !token ? (
              <div className="space-y-4">
                <p role="alert" className="text-sm text-destructive">
                  This reset link is missing its token. It may have been copied incompletely —
                  request a new reset link.
                </p>
                <Link
                  to="/forgot-password"
                  className={buttonVariants({ variant: 'outline', className: 'w-full' })}
                >
                  Request a new reset link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      enterKeyHint="next"
                      autoComplete="new-password"
                      aria-describedby="password-hint"
                      autoFocus
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setClientError(null)
                      }}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff
                          key="hide"
                          className="size-4 animate-in duration-150 ease-out fade-in"
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          key="show"
                          className="size-4 animate-in duration-150 ease-out fade-in"
                          aria-hidden="true"
                        />
                      )}
                    </Button>
                  </div>
                  <p id="password-hint" className="text-xs text-muted-foreground">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      enterKeyHint="go"
                      autoComplete="new-password"
                      aria-describedby="confirm-password-hint"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setClientError(null)
                      }}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      aria-label={showConfirmPassword ? 'Hide confirmation' : 'Show confirmation'}
                      className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff
                          key="hide"
                          className="size-4 animate-in duration-150 ease-out fade-in"
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye
                          key="show"
                          className="size-4 animate-in duration-150 ease-out fade-in"
                          aria-hidden="true"
                        />
                      )}
                    </Button>
                  </div>
                  <p id="confirm-password-hint" className="min-h-4 text-xs text-muted-foreground">
                    {passwordsMismatch ? (
                      <span role="alert" className="text-destructive">
                        Passwords don&apos;t match.
                      </span>
                    ) : (
                      'Re-enter your new password.'
                    )}
                  </p>
                </div>
                <div className="min-h-10">
                  {clientError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {clientError}
                    </p>
                  ) : tokenExpired ? (
                    <div role="alert" className="space-y-1">
                      <p className="text-sm text-destructive">
                        This reset link is invalid or has expired — links last 1 hour.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Link to="/forgot-password" className="underline underline-offset-4">
                          Request a new reset link
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <AuthFormError error={reset.error} />
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={reset.isPending}>
                  {reset.isPending ? 'Loading…' : 'Reset password'}
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
