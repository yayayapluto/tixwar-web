import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

// The async Clipboard API needs a secure context, so on plain-http origins
// (like the public tunnel URL) navigator.clipboard is undefined and every
// copy fails. Fall back to the legacy textarea + execCommand path, which
// still works there. Only report success when the copy really happened,
// otherwise the Check icon would lie about a value the user never got.
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path below.
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export function CopyButton({
  value,
  label,
  className,
  onCopied,
  copyLabel,
  copiedLabel,
  textLabel,
}: {
  value: string
  label: string
  className?: string
  onCopied?: () => void
  /** aria-label before copying; English default, pass Indonesian per page. */
  copyLabel?: string
  /** aria-label after copying; English default, pass Indonesian per page. */
  copiedLabel?: string
  /** Visible text next to the icon, e.g. "Salin kode". Omit for icon-only. */
  textLabel?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    if (!(await copyText(value))) {
      toast(`Gagal menyalin ${label}. Coba lagi.`, { variant: 'error' })
      return
    }
    setCopied(true)
    onCopied?.()
  }

  return (
    <Button
      variant="ghost"
      size={textLabel ? 'sm' : 'icon'}
      onClick={handleCopy}
      aria-label={copied ? (copiedLabel ?? `${label} copied`) : (copyLabel ?? `Copy ${label}`)}
      className={className}
    >
      {copied ? (
        <Check
          key="check"
          className="size-4 animate-in text-primary duration-150 ease-out fade-in zoom-in-95"
          aria-hidden="true"
        />
      ) : (
        <Copy
          key="copy"
          className="size-4 animate-in duration-150 ease-out fade-in zoom-in-95"
          aria-hidden="true"
        />
      )}
      {textLabel}
    </Button>
  )
}
