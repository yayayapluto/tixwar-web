import type { RefObject } from 'react'

// Handle to the app shell's ScrollArea viewport, owned by __root.tsx.
// The window itself never scrolls (the shell is h-dvh with internal
// scrolling), so pages scroll the viewport through this handle instead
// of window.scrollTo.
export const appScrollViewportRef: RefObject<HTMLDivElement | null> = {
  current: null,
}

export function scrollAppToTop(behavior: ScrollBehavior = 'auto') {
  appScrollViewportRef.current?.scrollTo({ top: 0, behavior })
}
