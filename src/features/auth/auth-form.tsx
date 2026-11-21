import { Link } from '@tanstack/react-router'
import { Check, Eye, EyeOff, LoaderCircle, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/errors'

export const MIN_PASSWORD_LENGTH = 10

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Raw API messages are Zod wording ("must be a valid email address or
// "admin""); users only ever see these plain versions.
function friendlyFieldMessage(
  field: string,
  rawMessage: string,
  mode: 'login' | 'register',
): string | null {
  const lower = field.toLowerCase()
  if (lower.includes('email')) {
    return mode === 'login'
      ? 'Enter a valid email address or username.'
      : 'Enter a valid email address.'
  }
  if (lower.includes('password')) {
    const min = rawMessage.match(/at least (\d+)/)?.[1]
    if (min) return `Password must be at least ${min} characters.`
    return 'Check your password and try again.'
  }
  return null
}

// Pull the API's field errors (if any) out of an error and translate them;
// anything unmapped stays with the global error slot.
function extractFieldErrors(
  error: unknown,
  mode: 'login' | 'register',
): { email?: string; password?: string } {
  if (!(error instanceof ApiError)) return {}
  const out: { email?: string; password?: string } = {}
  for (const fieldError of error.errors ?? []) {
    if (!fieldError.field) continue
    const message = friendlyFieldMessage(fieldError.field, fieldError.message, mode)
    if (!message) continue
    const lower = fieldError.field.toLowerCase()
    if (lower.includes('email') && !out.email) out.email = message
    if (lower.includes('password') && !out.password) out.password = message
  }
  return out
}

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
  mode = 'register',
}: {
  error: unknown
  showResetLink?: boolean
  mode?: 'login' | 'register'
}) {
  if (!error) return null
  const isApiError = error instanceof ApiError
  const isUnauthorized = isApiError && (error.status === 401 || error.code === 'UNAUTHORIZED')
  const retryAfter = isApiError ? error.retryAfterSeconds : undefined
  const isValidation = isApiError && error.code === 'VALIDATION_FAILED'
  const friendlyFields = (isApiError ? (error.errors ?? []) : [])
    .map((fieldError) =>
      fieldError.field ? friendlyFieldMessage(fieldError.field, fieldError.message, mode) : null,
    )
    .filter((message): message is string => message !== null)
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
      ) : isValidation && friendlyFields.length > 0 ? (
        <ul className="space-y-0.5">
          {friendlyFields.map((message) => (
            <li key={message} className="text-xs text-destructive">
              {message}
            </li>
          ))}
        </ul>
      ) : isValidation ? (
        <p className="text-sm text-destructive">
          Please check the details you entered and try again.
        </p>
      ) : (
        <p className="text-sm text-destructive">
          {isApiError ? error.detail : 'Something went wrong. Please try again.'}
        </p>
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
  // Inline field errors: client-side first, then the server's field errors
  // translated to the same plain wording. A field error clears as soon as
  // the user edits that field.
  const [clientEmailError, setClientEmailError] = useState<string | null>(null)
  const [clientPasswordError, setClientPasswordError] = useState<string | null>(null)
  const [serverEmailError, setServerEmailError] = useState<string | null>(null)
  const [serverPasswordError, setServerPasswordError] = useState<string | null>(null)
  useEffect(() => {
    const mapped = extractFieldErrors(error, mode)
    setServerEmailError(mapped.email ?? null)
    setServerPasswordError(mapped.password ?? null)
  }, [error, mode])
  const emailError = clientEmailError ?? serverEmailError
  const passwordError = clientPasswordError ?? serverPasswordError
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
    // Validated here (not with `required`) so an empty or mistyped field
    // gets the same friendly inline message instead of the browser's
    // generic bubble.
    const trimmedEmail = email.trim()
    let emailProblem: string | null = null
    if (trimmedEmail === '') {
      emailProblem = isLogin ? 'Enter your email address or username.' : 'Enter your email address.'
    } else if (
      isLogin
        ? !(trimmedEmail.toLowerCase() === 'admin' || EMAIL_PATTERN.test(trimmedEmail))
        : !EMAIL_PATTERN.test(trimmedEmail)
    ) {
      emailProblem = isLogin
        ? 'Enter a valid email address or username.'
        : 'Enter a valid email address.'
    }
    let passwordProblem: string | null = null
    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      passwordProblem = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    } else if (isLogin && password === '') {
      passwordProblem = 'Enter your password.'
    }
    setClientEmailError(emailProblem)
    setClientPasswordError(passwordProblem)
    if (emailProblem || passwordProblem) return
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
            setClientEmailError(null)
            setServerEmailError(null)
          }}
          aria-invalid={emailError !== null}
          aria-describedby="email-error"
          disabled={isPending}
        />
        {/* Reserved one-line slot so an inline error never pushes the form down. */}
        <p id="email-error" className="min-h-4 text-xs text-destructive" role="alert">
          {emailError ?? ''}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            enterKeyHint="go"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            aria-describedby={mode === 'register' ? 'password-hint' : 'password-error'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setClientPasswordError(null)
              setServerPasswordError(null)
              setPasswordTouched(true)
            }}
            onBlur={() => setPasswordTouched(true)}
            aria-invalid={passwordError !== null}
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
          (passwordError ? (
            <p
              id="password-hint"
              className="flex items-center gap-1.5 text-xs text-destructive"
              role="alert"
            >
              <X className="size-3.5" aria-hidden="true" />
              {passwordError}
            </p>
          ) : passwordTouched ? (
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
          <>
            {/* Reserved one-line slot so an inline error never pushes the form down. */}
            <p id="password-error" className="min-h-4 text-xs text-destructive" role="alert">
              {passwordError ?? ''}
            </p>
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
          </>
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
          submit button down. Field errors already show under their inputs;
          this slot only carries whole-form errors (wrong password, rate
          limit, ...). */}
      <div className="min-h-15">
        {emailError || passwordError ? null : (
          <AuthFormError error={error} showResetLink={mode === 'login'} mode={mode} />
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
