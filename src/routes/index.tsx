import { createFileRoute, redirect } from '@tanstack/react-router'
import { ListSkeleton } from '@/components/status'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Forward every query param (e.g. ?utm_source=…) so shared links and
    // analytics params survive the redirect instead of landing on a bare /events.
    throw redirect({ to: '/events', search: (prev) => prev })
  },
  // Shown while the redirect resolves, so a slow/cold load shows a loading
  // state (with a screen-reader announcement via role="status") instead of
  // an empty shell with no active nav state.
  pendingComponent: () => <ListSkeleton rows={4} />,
})
