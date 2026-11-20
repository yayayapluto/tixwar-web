import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

export function CopyButton({
  value,
  label,
  className,
  onCopied,
}: {
  value: string
  label: string
  className?: string
  onCopied?: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      // Clipboard can reject (permission denied, non-secure context):
      // only report success when the copy really happened, otherwise the
      // Check icon would lie about a code the user never got.
      await navigator.clipboard.writeText(value)
    } catch {
      toast(`Gagal menyalin ${label}. Coba lagi.`, { variant: 'error' })
      return
    }
    setCopied(true)
    onCopied?.()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
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
    </Button>
  )
}
