import { createFileRoute, Link } from '@tanstack/react-router'
import { Download, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorState, ListSkeleton } from '@/components/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCustomer } from '@/features/auth/route-guard'
import { useEvent } from '@/features/events/queries'
import { useTicket } from '@/features/tickets/queries'
import { formatCountdown } from '@/lib/use-countdown'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/tickets/$ticketId')({
  beforeLoad: ({ location }) => {
    requireCustomer(location.href)
  },
  component: TicketDetailPage,
})

async function downloadQr(url: string, filename: string) {
  const res = await fetch(url)
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
  const eventQuery = useEvent(query.data?.data.ticket.eventId ?? '', false)
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!query.data) return
    setQrSecondsLeft(query.data.data.qrExpiresIn)
  }, [query.data])

  useEffect(() => {
    if (qrSecondsLeft === null || qrSecondsLeft <= 0) return
    const id = setTimeout(() => setQrSecondsLeft((s) => (s === null ? s : s - 1)), 1000)
    return () => clearTimeout(id)
  }, [qrSecondsLeft])

  if (query.isPending) return <ListSkeleton rows={2} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const detail = query.data.data
  const ticket = detail.ticket
  const qrExpired = qrSecondsLeft !== null && qrSecondsLeft <= 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">
          {eventQuery.data?.data.name ?? 'Ticket'}
        </h1>
        <QrCode className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="min-w-0 truncate font-mono text-sm">{ticket.code}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Event:{' '}
            {eventQuery.data ? (
              <Link
                to="/events/$eventId"
                params={{ eventId: ticket.eventId }}
                className="underline underline-offset-4"
              >
                {eventQuery.data.data.name}
              </Link>
            ) : (
              ticket.eventId
            )}{' '}
            · Issued {formatDate(ticket.issuedAt)}
          </p>
          {/* White background is required for QR scannability */}
          <div className="flex justify-center rounded-lg border bg-white p-4">
            <img
              src={detail.qrUrl}
              alt={`QR code for ticket ${ticket.code}`}
              width={224}
              height={224}
              className="size-56 object-contain"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => downloadQr(detail.qrUrl, `tixwar-${ticket.code}.png`)}
          >
            <Download className="size-4" aria-hidden="true" />
            Download QR
          </Button>
          {qrExpired ? (
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-destructive">QR link expired.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
              >
                Refresh QR
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              QR link expires in{' '}
              {qrSecondsLeft === null ? `${detail.qrExpiresIn}s` : formatCountdown(qrSecondsLeft)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
