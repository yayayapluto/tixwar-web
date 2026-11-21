import { Link } from '@tanstack/react-router'
import { Check, Eye, EyeOff, LoaderCircle, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/errors'

export const MIN_PASSWORD_LENGTH = 10

// The email the user typed, kept in sessionStorage so a refresh or a trip to
// the other auth page doesn't wipe the form. Never the password.
const EMAIL_DRAFT_KEY = 'tixwar.auth.email-draft'

function readEmailDraft(): string {
  try {
    return sessionStorage.getItem(EMAIL_DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function clearAuthEmailDraft() {
  try {
    sessionStorage.removeItem(EMAIL_DRAFT_KEY)
  } catch {
    // Storage unavailable; the draft simply isn't kept.
  }
}

function persistEmailDraft(email: string) {
  try {
    sessionStorage.setItem(EMAIL_DRAFT_KEY, email)
  } catch {
    // Storage unavailable; the draft simply isn't kept.
  }
}

export function AuthFormError({
  error,
  showResetLink,
}: {
  error: unknown
  showResetLink?: boolean
}) {
  if (!error) return null
  const isApiError = error instanceof ApiError
  const isUnauthorized = isApiError && (error.status === 401 || error.code === 'UNAUTHORIZED')
  const retryAfter = isApiError ? error.retryAfterSeconds : undefined
  const fieldErrors = isApiError ? (error.errors ?? []) : []
  return (
    <div role="alert" className="space-y-1">
      {isUnauthorized ? (
        <p className="text-sm text-destructive">
          Wrong email or password. Try again, or{' '}
          {showResetLink ? (
            <Link to="/forgot-password" className="underline underline-offset-4">
              reset your password
            </Link>
          ) : (
            'reset your password'
          )}
          .
        </p>
      ) : (
        <p className="text-sm text-destructive">
          {isApiError ? error.detail : 'Something went wrong. Please try again.'}
        </p>
      )}
      {fieldErrors.length > 0 && (
        <ul className="space-y-0.5">
          {fieldErrors.map((fieldError) => (
            <li
              key={`${fieldError.field ?? 'field'}-${fieldError.message}`}
              className="text-xs text-destructive"
            >
              {fieldError.field ? <span className="capitalize">{fieldError.field}: </span> : null}
              {fieldError.message}
            </li>
          ))}
        </ul>
      )}
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
  const [email, setEmail] = useState(readEmailDraft)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Checked by default: an unchecked box silently drops the session when the
  // browser closes, while register already persists for 7 days.
  const [rememberMe, setRememberMe] = useState(true)
  const [clientError, setClientError] = useState<string | null>(null)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const passwordLengthMet = password.length >= MIN_PASSWORD_LENGTH
  // In login mode the identifier can be an email address or the admin alias
  // "admin", so the field must not be an email input (the browser would
  // block a non-email value). Register still requires a real email.
  const isLogin = mode === 'login'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Enter submits the form even while the button is disabled, so guard
    // here too — otherwise a second submit can fire a duplicate mutation.
    if (isPending) return
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
        <Label htmlFor="email">{isLogin ? 'Email or username' : 'Email'}</Label>
        <Input
          id="email"
          type={isLogin ? 'text' : 'email'}
          inputMode={isLogin ? 'text' : 'email'}
          enterKeyHint="next"
          autoComplete={isLogin ? 'username' : 'email'}
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            persistEmailDraft(e.target.value)
          }}
          required
          disabled={isPending}
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
              setPasswordTouched(true)
            }}
            onBlur={() => setPasswordTouched(true)}
            required
            disabled={isPending}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            disabled={isPending}
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
        {mode === 'register' &&
          (passwordTouched ? (
            <p id="password-hint" className="flex items-center gap-1.5 text-xs">
              {passwordLengthMet ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
              )}
              <span className={passwordLengthMet ? 'text-success' : 'text-muted-foreground'}>
                At least {MIN_PASSWORD_LENGTH} characters
              </span>
            </p>
          ) : (
            <p id="password-hint" className="text-xs text-muted-foreground">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          ))}
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
              disabled={isPending}
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
      {/* Error slot reserves the worst-case height (detail 2 lines 40px +
          retry line 16px + gap 4px = 60px) so an API error cannot push the
          submit button down. */}
      <div className="min-h-15">
        {clientError ? (
          <p role="alert" className="text-sm text-destructive">
            {clientError}
          </p>
        ) : (
          <AuthFormError error={error} showResetLink={mode === 'login'} />
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isPending} aria-busy={isPending}>
        {isPending ? (
          <>
            <LoaderCircle className="animate-spin" aria-hidden="true" />
            Loading…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}
