import { useEffect, useRef, useCallback } from 'react'

export interface CanvasProps {
  width?: number
  height?: number
  onRender?: (ctx: CanvasRenderingContext2D, deltaTime: number) => void
  className?: string
  maintainAspectRatio?: boolean
}

export function Canvas({
  width = 800,
  height = 600,
  onRender,
  className = '',
  maintainAspectRatio = true,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const lastFrameTimeRef = useRef<number>(0)

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    if (maintainAspectRatio) {
      const aspectRatio = width / height
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const containerAspectRatio = containerWidth / containerHeight

      let newWidth: number
      let newHeight: number

      if (containerAspectRatio > aspectRatio) {
        newHeight = containerHeight
        newWidth = containerHeight * aspectRatio
      } else {
        newWidth = containerWidth
        newHeight = containerWidth / aspectRatio
      }

      canvas.style.width = `${newWidth}px`
      canvas.style.height = `${newHeight}px`
    } else {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }

    canvas.width = width
    canvas.height = height
  }, [width, height, maintainAspectRatio])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Failed to get 2D context')
      return
    }

    handleResize()

    let isRunning = true

    const renderFrame = (timestamp: number) => {
      if (!isRunning) return

      const deltaTime = timestamp - lastFrameTimeRef.current
      lastFrameTimeRef.current = timestamp

      ctx.clearRect(0, 0, width, height)

      if (onRender) {
        onRender(ctx, deltaTime)
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame)
    }

    lastFrameTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(renderFrame)

    window.addEventListener('resize', handleResize)

    return () => {
      isRunning = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [width, height, onRender, handleResize])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: 'block',
        margin: '0 auto',
      }}
    />
  )
}
