import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Download, QrCode, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { ErrorState } from '@/components/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { requireCustomer } from '@/features/auth/route-guard'
import { useEvent } from '@/features/events/queries'
import { useTicket } from '@/features/tickets/queries'
import { toast } from '@/lib/toast'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'
import { cn, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/tickets/$ticketId')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: TicketDetailPage,
})

async function downloadQr(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`QR download failed: ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}

function TicketDetailPage() {
  const { ticketId } = Route.useParams()
  const query = useTicket(ticketId)
  const eventQuery = useEvent(query.data?.data.ticket.eventId ?? '')
  const [failedQrUrl, setFailedQrUrl] = useState<string | null>(null)

  // Deadline dihitung dari waktu data diterima, bukan dari rantai setTimeout:
  // interval menghitung ulang dari deadline setiap detik, jadi tidak tertinggal
  // saat tab di-background.
  const qrDeadlineIso =
    query.data === undefined
      ? undefined
      : new Date(query.dataUpdatedAt + query.data.data.qrExpiresIn * 1000).toISOString()
  const qrSecondsLeft = useCountdown(qrDeadlineIso)

  if (query.isPending)
    return (
      <div role="status" aria-busy="true" className="space-y-4">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-8 w-2/3" />
        <div className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mx-auto aspect-square w-full max-w-56" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const detail = query.data.data
  const ticket = detail.ticket
  const event = eventQuery.data?.data
  const tier = event?.tiers?.find((t) => t.id === ticket.tierId)
  const qrExpired = qrSecondsLeft !== null && qrSecondsLeft <= 0
  const qrLowTime = qrSecondsLeft !== null && qrSecondsLeft > 0 && qrSecondsLeft < 60
  const qrError = failedQrUrl !== null && failedQrUrl === detail.qrUrl

  async function handleDownload() {
    try {
      await downloadQr(detail.qrUrl, `tixwar-${ticket.code}.png`)
      toast('QR berhasil diunduh', { variant: 'success' })
    } catch {
      toast('Gagal mengunduh QR. Coba lagi.')
    }
  }

  return (
    <div className="space-y-4">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke tiket
      </Link>
      <div className="flex items-start justify-between gap-2">
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">{event?.name ?? 'Tiket'}</h1>
        <QrCode className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="min-w-0 truncate font-mono text-sm">{ticket.code}</CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="success">Tiket valid</Badge>
            <CopyButton
              value={ticket.code}
              label="Kode tiket"
              onCopied={() => toast('Kode tiket disalin', { variant: 'success' })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Event:{' '}
              {event ? (
                <Link
                  to="/events/$eventId"
                  params={{ eventId: ticket.eventId }}
                  className="underline underline-offset-4"
                >
                  {event.name}
                </Link>
              ) : (
                'Acara tidak dapat dimuat'
              )}
            </p>
            {event && (
              <p>
                {formatDate(event.startsAt)} · {event.venue}, {event.city}
              </p>
            )}
            {tier && <p>Tier: {tier.name}</p>}
            <p>Diterbitkan {formatDate(ticket.issuedAt)}</p>
          </div>
          {qrExpired ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="text-sm font-medium text-destructive">
                  Link QR kedaluwarsa — tiketmu tetap valid. Refresh untuk QR baru.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Refresh QR
              </Button>
            </div>
          ) : qrError ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="text-sm font-medium text-destructive">
                  QR gagal dimuat. Refresh untuk QR baru.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Refresh QR
              </Button>
            </div>
          ) : (
            <>
              {/* White background is required for QR scannability */}
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img
                  src={detail.qrUrl}
                  alt={`QR code for ticket ${ticket.code}`}
                  width={224}
                  height={224}
                  className="size-56 object-contain"
                  onError={() => setFailedQrUrl(detail.qrUrl)}
                />
              </div>
              <p className="text-center text-sm">Tunjukkan QR ini di pintu masuk.</p>
              <Button className="w-full" onClick={handleDownload}>
                <Download className="size-4" aria-hidden="true" />
                Download QR
              </Button>
              <p
                aria-live="polite"
                className={cn(
                  'text-center text-xs',
                  qrLowTime ? 'font-medium text-destructive' : 'text-muted-foreground',
                )}
              >
                Link QR kedaluwarsa dalam{' '}
                <span className="tabular-nums">
                  {qrSecondsLeft === null
                    ? `${detail.qrExpiresIn}s`
                    : formatCountdown(qrSecondsLeft)}
                </span>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
