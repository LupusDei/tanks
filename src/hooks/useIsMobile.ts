import { useState, useEffect } from 'react'

const MOBILE_WIDTH_BREAKPOINT = 768
const MOBILE_HEIGHT_BREAKPOINT = 500

function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false

  // Check if either dimension is small (handles both portrait and landscape)
  const isSmallWidth = window.innerWidth < MOBILE_WIDTH_BREAKPOINT
  const isSmallHeight = window.innerHeight < MOBILE_HEIGHT_BREAKPOINT

  // Also check for touch capability to help distinguish mobile from small desktop windows
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Mobile if: small width OR (small height AND has touch)
  return isSmallWidth || (isSmallHeight && hasTouch)
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
