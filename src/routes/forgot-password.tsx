import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { AuthPageSkeleton } from '@/components/skeletons'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFormError } from '@/features/auth/auth-form'
import { useForgotPassword } from '@/features/auth/use-auth'
import { getSession } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/document-title'

const RESEND_COOLDOWN_SECONDS = 60

// Long email addresses render truncated with the full address on hover, so a
// very long email never widens the card or adds lines to the success state.
function TruncatedEmail({ email }: { email: string }) {
  return (
    <span className="inline-block max-w-full truncate align-bottom" title={email}>
      {email}
    </span>
  )
}

export const Route = createFileRoute('/forgot-password')({
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: '/events' })
  },
  component: ForgotPasswordPage,
  pendingComponent: () => <AuthPageSkeleton variant="forgot" />,
})

function ForgotPasswordPage() {
  useDocumentTitle('Forgot password')
  const forgot = useForgotPassword()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const successRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sentTo) successRef.current?.focus()
  }, [sentTo])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    forgot.mutate(
      { email: trimmedEmail },
      {
        onSuccess: () => {
          setSentTo(trimmedEmail)
          setResendCooldown(RESEND_COOLDOWN_SECONDS)
        },
      },
    )
  }

  function handleResend() {
    if (!sentTo || resendCooldown > 0) return
    forgot.mutate(
      { email: sentTo },
      { onSuccess: () => setResendCooldown(RESEND_COOLDOWN_SECONDS) },
    )
  }

  function handleDifferentEmail() {
    setSentTo(null)
    setResendCooldown(0)
  }

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <CardHeader>
          {sentTo ? (
            <>
              <CardTitle>Check your email</CardTitle>
              <CardDescription className="min-h-10">
                We sent a reset link to <TruncatedEmail email={sentTo} />.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Forgot password</CardTitle>
              <CardDescription className="min-h-10">
                Enter your email and we&apos;ll send you a link to reset your password.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {/* Fixed slot sized to the taller success state (372px: 352px measured
              in headless Chromium with the production CSS, +20px for the error
              slot min-h-10 -> min-h-15): the form state (240px) fits inside it,
              so the card keeps its height across the transition instead of
              growing. */}
          <div className="min-h-[372px]">
            {sentTo ? (
              <div ref={successRef} tabIndex={-1} className="space-y-4 outline-none">
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p role="status" className="text-sm">
                    Check your inbox — if an account exists for <TruncatedEmail email={sentTo} />,
                    we&apos;ve sent a reset link. The link expires in 1 hour.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t see it? Check your spam or junk folder. Still nothing after a few
                  minutes, request a new link.
                </p>
                <div className="min-h-15">
                  <AuthFormError error={forgot.error} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={forgot.isPending || resendCooldown > 0}
                >
                  {forgot.isPending
                    ? 'Loading…'
                    : resendCooldown > 0
                      ? `Resend link in ${resendCooldown}s`
                      : 'Resend link'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={handleDifferentEmail}
                >
                  Use a different email
                </Button>
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
                <div className="min-h-15">
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
