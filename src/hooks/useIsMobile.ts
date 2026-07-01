import { useState, useEffect } from 'react'

const MOBILE_WIDTH_BREAKPOINT = 768
const MOBILE_HEIGHT_BREAKPOINT = 500

function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false

  // Check if either dimension is small (handles both portrait and landscape)
  const isSmallWidth = window.innerWidth < MOBILE_WIDTH_BREAKPOINT
  const isSmallHeight = window.innerHeight < MOBILE_HEIGHT_BREAKPOINT

  // Touch capability (helps distinguish real touch devices from small desktop windows)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // A coarse *primary* pointer means a touch-first device (phone/tablet), NOT a
  // desktop that merely has a touchscreen. This is what catches iPads and large
  // tablets, whose width (>=768) previously fell through as "desktop" and left the
  // game canvas unscaled and overflowing the screen with no way to scroll.
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches

  // Use the mobile/tablet layout (compact controls + auto-fit-to-screen scaling)
  // when: small width, OR small height on a touch device, OR any touch-first
  // (coarse-pointer) device regardless of size — i.e. phones AND iPads/tablets.
  return isSmallWidth || (isSmallHeight && hasTouch) || (hasTouch && hasCoarsePointer)
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(checkIsMobile)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}
