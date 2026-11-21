import { useEffect } from 'react'

// Every page sets its own browser tab title; the static index.html title
// ("TixWar — Flash Sale Tickets") is only the first paint. The suffix
// keeps the product name on every tab.
export function useDocumentTitle(page: string) {
  useEffect(() => {
    document.title = `${page} — TixWar`
  }, [page])
}
