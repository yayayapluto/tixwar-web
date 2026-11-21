import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CopyButton } from '@/components/copy-button'
import { TicketDetailSkeleton } from '@/components/skeletons'
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
  pendingComponent: TicketDetailSkeleton,
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

function RefreshQrButton({
  label,
  isRefreshing,
  onRefresh,
}: {
  label: string
  isRefreshing: boolean
  onRefresh: () => void
}) {
  return (
    <Button className="w-full" onClick={onRefresh} disabled={isRefreshing}>
      <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} aria-hidden="true" />
      {isRefreshing ? 'Memperbarui QR…' : label}
    </Button>
  )
}

function TicketDetailPage() {
  const { ticketId } = Route.useParams()
  const query = useTicket(ticketId)
  const eventQuery = useEvent(query.data?.data.ticket.eventId ?? '')
  const [failedQrUrl, setFailedQrUrl] = useState<string | null>(null)
  const [refetchError, setRefetchError] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  // QR mana yang sudah di-auto-refresh: satu URL hanya di-refresh otomatis sekali,
  // supaya refetch yang gagal tidak memicu loop.
  const autoRefreshedFor = useRef<string | null>(null)

  // Deadline dihitung dari waktu data diterima, bukan dari rantai setTimeout:
  // interval menghitung ulang dari deadline setiap detik, jadi tidak tertinggal
  // saat tab di-background.
  const qrDeadlineIso =
    query.data === undefined
      ? undefined
      : new Date(query.dataUpdatedAt + query.data.data.qrExpiresIn * 1000).toISOString()
  const qrSecondsLeft = useCountdown(qrDeadlineIso)

  const ticketDetail = query.data?.data
  const qrExpired = qrSecondsLeft !== null && qrSecondsLeft <= 0
  const qrLowTime = qrSecondsLeft !== null && qrSecondsLeft > 0 && qrSecondsLeft < 60
  // Refresh pre-emptively at ~30s remaining, while the <60s warning is
  // already showing, so the displayed QR never reaches zero mid-scan.
  // The expired box below stays as a fallback (e.g. a failed refresh).
  const qrRefreshDue = qrSecondsLeft !== null && qrSecondsLeft <= 30
  const qrUrl = ticketDetail?.qrUrl

  const handleRefresh = useCallback(async () => {
    setRefetchError(false)
    const result = await query.refetch()
    if (result.isError) {
      setRefetchError(true)
      toast('Gagal memperbarui QR. Coba lagi.')
    } else {
      setFailedQrUrl(null)
      toast('QR baru dibuat', { variant: 'success' })
    }
  }, [query.refetch])

  // Auto-refresh saat QR hampir kedaluwarsa: user yang mengantre tidak
  // terjebak di kotak kedaluwarsa dan QR tidak hilang di tengah pemindaian.
  // Dijaga oleh autoRefreshedFor + isFetching supaya tidak loop.
  useEffect(() => {
    if (!qrRefreshDue || qrUrl === undefined || query.isFetching) return
    if (autoRefreshedFor.current === qrUrl) return
    autoRefreshedFor.current = qrUrl
    void handleRefresh()
  }, [qrRefreshDue, qrUrl, query.isFetching, handleRefresh])

  if (query.isPending) return <TicketDetailSkeleton />
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        onRetry={() => query.refetch()}
        fallbackTitle="Terjadi kesalahan."
        retryLabel="Coba lagi"
        formatRetryAfter={(seconds) => `Coba lagi dalam ${seconds} detik`}
      />
    )

  const detail = query.data.data
  const ticket = detail.ticket
  const event = eventQuery.data?.data
  const tier = event?.tiers?.find((t) => t.id === ticket.tierId)
  const qrError = failedQrUrl !== null && failedQrUrl === detail.qrUrl
  const isRefreshing = query.isFetching
  // Pengumuman screen reader hanya berubah di batas menit dan di bawah 60 detik,
  // supaya live region tidak membacakan tiap detik.
  const qrAnnouncement =
    qrSecondsLeft === null
      ? ''
      : qrSecondsLeft >= 60
        ? `QR kedaluwarsa dalam ${Math.ceil(qrSecondsLeft / 60)} menit`
        : 'QR hampir kedaluwarsa, kurang dari satu menit lagi'

  async function handleDownload() {
    // Guard ganda: tombol disabled saat mengunduh, tapi ketukan yang lolos
    // sebelum React me-render ulang tetap ditolak di sini.
    if (isDownloading) return
    setIsDownloading(true)
    try {
      await downloadQr(detail.qrUrl, `tixwar-${ticket.code}.png`)
      toast('QR berhasil diunduh', { variant: 'success' })
    } catch {
      toast('Gagal mengunduh QR. Coba lagi.')
    } finally {
      setIsDownloading(false)
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
      {eventQuery.isPending ? (
        <Skeleton className="h-8 w-2/3" />
      ) : (
        <h1 className="min-w-0 truncate text-2xl font-semibold">{event?.name ?? 'Tiket'}</h1>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          {/*
            No truncate: the code is the only fallback when the QR won't
            scan, so it wraps (break-all) instead of clipping. leading-snug
            overrides the primitive's leading-none via twMerge, so wrapped
            lines and descenders stay readable. title shows the full code
            on hover.
          */}
          <CardTitle
            title={ticket.code}
            className="min-w-0 break-all font-mono text-sm leading-snug"
          >
            {ticket.code}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="success">Tiket valid</Badge>
            <CopyButton
              value={ticket.code}
              label="Kode tiket"
              copyLabel="Salin kode tiket"
              copiedLabel="Kode tiket disalin"
              textLabel="Salin kode"
              onCopied={() => toast('Kode tiket disalin', { variant: 'success' })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventQuery.isPending ? (
            // Same two text-sm rows as the loaded state (20px each):
            // h-5 bars, not h-4, inside the same min-h-11 slot.
            <div className="min-h-11 space-y-1" aria-busy="true">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : eventQuery.isError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                Acara tidak dapat dimuat. QR di bawah tetap valid.
              </p>
              <Button variant="outline" size="sm" onClick={() => eventQuery.refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : event ? (
            // min-h-11 reserves both rows (44px) even when the ticket
            // has no tier, so the QR box below never moves.
            <div className="min-h-11 space-y-1 text-sm text-muted-foreground">
              <p>
                {formatDate(event.startsAt)} · {event.venue}, {event.city}
              </p>
              <p className="min-h-5">{tier ? `Tier: ${tier.name}` : ''}</p>
            </div>
          ) : null}
          {/*
            QR slot: fixed 258px in every state (224px image + 2x16px
            padding + 2px border). The expired / load-error alert renders
            inside the same slot, so swapping QR -> alert (on expiry,
            on image error, or when a fresh QR arrives) never moves the
            countdown, the hint, or the button below. Previously the
            expired and qrError branches were two separate boxes of
            ~70-110px, which collapsed the card by ~150px.
          */}
          <div className="h-[258px]">
            {qrExpired || qrError ? (
              <div
                role="alert"
                className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
              >
                <p className="text-sm font-medium text-destructive">
                  {refetchError
                    ? 'Gagal membuat QR baru. Periksa koneksimu lalu coba lagi — tiketmu tetap valid.'
                    : qrExpired
                      ? 'Link QR kedaluwarsa — tiketmu tetap valid. Refresh untuk QR baru.'
                      : 'QR gagal dimuat. Refresh untuk QR baru.'}
                </p>
                <p className="text-sm text-destructive/80">
                  Kalau QR tidak terbaca, tunjukkan kode tiket di atas ke petugas.
                </p>
              </div>
            ) : (
              <div className="flex h-full justify-center rounded-lg border bg-white p-4">
                {/* White background is required for QR scannability */}
                <img
                  src={detail.qrUrl}
                  alt={`Kode QR untuk tiket ${ticket.code}`}
                  width={224}
                  height={224}
                  className="size-56 object-contain"
                  onError={() => setFailedQrUrl(detail.qrUrl)}
                />
              </div>
            )}
          </div>
          {qrExpired || qrError ? (
            <RefreshQrButton
              label={refetchError ? 'Coba lagi' : 'Refresh QR'}
              isRefreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
            />
          ) : (
            <>
              <div
                className={cn(
                  'rounded-lg border p-3 text-center',
                  qrLowTime ? 'border-destructive/30 bg-destructive/5' : 'border-transparent',
                )}
              >
                <p
                  aria-live="off"
                  className={cn(
                    'text-3xl font-semibold tabular-nums',
                    qrLowTime ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {qrSecondsLeft === null
                    ? formatCountdown(detail.qrExpiresIn)
                    : formatCountdown(qrSecondsLeft)}
                </p>
                {/*
                  min-h-10 reserves two text-sm lines: the <60s warning
                  ("Segera tunjukkan QR ini — hampir kedaluwarsa") wraps
                  to two lines on narrow screens, and without the reserve
                  the Download button below would jump 20px at the 60s
                  threshold. The number above is already tabular-nums.
                */}
                <p
                  className={cn(
                    'min-h-10 text-sm',
                    qrLowTime ? 'font-medium text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {qrLowTime
                    ? 'Segera tunjukkan QR ini — hampir kedaluwarsa'
                    : 'QR kedaluwarsa dalam'}
                </p>
                <p aria-live="polite" className="sr-only">
                  {qrAnnouncement}
                </p>
              </div>
              <p className="text-center text-sm">Tunjukkan QR ini di pintu masuk.</p>
              <p className="text-center text-sm text-muted-foreground">
                Kalau QR tidak terbaca, tunjukkan kode tiket di atas ke petugas.
              </p>
              <Button className="w-full" onClick={handleDownload} disabled={isDownloading}>
                <Download
                  className={cn('size-4', isDownloading && 'animate-spin')}
                  aria-hidden="true"
                />
                {isDownloading ? 'Mengunduh…' : 'Download QR'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
