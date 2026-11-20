import { Link } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/errors'

export const MIN_PASSWORD_LENGTH = 10

export function AuthFormError({ error }: { error: unknown }) {
  if (!error) return null
  const message =
    error instanceof ApiError ? error.detail : 'Something went wrong. Please try again.'
  const retryAfter = error instanceof ApiError ? error.retryAfterSeconds : undefined
  return (
    <div role="alert" className="space-y-1">
      <p className="text-sm text-destructive">{message}</p>
      {retryAfter !== undefined && (
        <p className="text-xs text-muted-foreground">Try again in {retryAfter}s</p>
      )}
    </div>
  )
}

export function AuthForm({
  mode,
  submitLabel,
  onSubmit,
  isPending,
  error,
}: {
  mode: 'login' | 'register'
  submitLabel: string
  onSubmit: (email: string, password: string, rememberMe?: boolean) => void
  isPending: boolean
  error?: unknown
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Checked by default: an unchecked box silently drops the session when the
  // browser closes, while register already persists for 7 days.
  const [rememberMe, setRememberMe] = useState(true)
  const [clientError, setClientError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      setClientError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setClientError(null)
    onSubmit(email, password, rememberMe)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          enterKeyHint="next"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            enterKeyHint="go"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            aria-describedby={mode === 'register' ? 'password-hint' : undefined}
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
        {mode === 'register' && (
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        )}
        {mode === 'login' && (
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
        )}
      </div>
      {mode === 'login' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember-me" className="cursor-pointer font-normal">
              Remember me
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Stay logged in on this device for up to 7 days. If unchecked, you&apos;ll be logged out
            when you close the browser.
          </p>
        </div>
      )}
      {clientError ? (
        <p role="alert" className="text-sm text-destructive">
          {clientError}
        </p>
      ) : (
        <AuthFormError error={error} />
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Loading…' : submitLabel}
      </Button>
    </form>
  )
}
