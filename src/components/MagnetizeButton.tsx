import { useEffect, useState, useMemo } from "react"

interface MagnetizeButtonProps {
  onClick?: () => void
  children: React.ReactNode
  particleCount?: number
  disabled?: boolean
  className?: string
  "data-testid"?: string
}

interface Particle {
  id: number
  orbitRadius: number
  orbitSpeed: number
  startAngle: number
  wobbleAmount: number
  wobbleSpeed: number
  size: number
  hue: number
  glowIntensity: number
}

// Button dimensions for border calculations
const BUTTON_HALF_WIDTH = 110
const BUTTON_HALF_HEIGHT = 32
const BORDER_OUTSET = 15

function getBorderPoint(angleDeg: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  const tanAngle = Math.abs(sin / (cos || 0.0001))
  const aspectRatio = BUTTON_HALF_HEIGHT / BUTTON_HALF_WIDTH

  let x: number, y: number

  if (tanAngle < aspectRatio) {
    x = cos > 0 ? BUTTON_HALF_WIDTH + BORDER_OUTSET : -(BUTTON_HALF_WIDTH + BORDER_OUTSET)
    y = sin * Math.abs(x)
  } else {
    y = sin > 0 ? BUTTON_HALF_HEIGHT + BORDER_OUTSET : -(BUTTON_HALF_HEIGHT + BORDER_OUTSET)
    x = cos * Math.abs(y) / (Math.abs(sin) || 0.0001)
    const maxX = BUTTON_HALF_WIDTH + BORDER_OUTSET
    x = Math.max(-maxX, Math.min(maxX, x))
  }

  return { x, y }
}

export function MagnetizeButton({
  onClick,
  children,
  particleCount = 16,
  disabled = false,
  className = "",
  "data-testid": testId,
}: MagnetizeButtonProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [time, setTime] = useState(0)

  useEffect(() => {
    let animationId: number
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000
      lastTime = currentTime
      setTime(t => t + delta)
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      orbitRadius: 100 + Math.random() * 60,
      orbitSpeed: 20 + Math.random() * 15,
      startAngle: (i / particleCount) * 360 + Math.random() * 20,
      wobbleAmount: 10 + Math.random() * 15,
      wobbleSpeed: 0.3 + Math.random() * 0.4,
      size: 6 + Math.random() * 6,
      hue: 120 + Math.random() * 60,
      glowIntensity: 0.7 + Math.random() * 0.6,
    }))
  }, [particleCount])

  return (
    <button
      className={`magnetize-button ${isHovering ? "magnetize-button--attracting" : ""} ${className}`}
      onClick={onClick}
      onMouseEnter={() => !disabled && setIsHovering(true)}
      onMouseLeave={() => !disabled && setIsHovering(false)}
      onTouchStart={() => !disabled && setIsHovering(true)}
      onTouchEnd={() => !disabled && setIsHovering(false)}
      disabled={disabled}
      data-testid={testId}
    >
      {particles.map((particle) => {
        const currentAngle = particle.startAngle + (time / particle.orbitSpeed) * 360
        const wobble = Math.sin(time * particle.wobbleSpeed * Math.PI * 2) * particle.wobbleAmount
        const currentRadius = particle.orbitRadius + wobble

        const angleRad = (currentAngle * Math.PI) / 180
        const orbitX = Math.cos(angleRad) * currentRadius
        const orbitY = Math.sin(angleRad) * currentRadius

        const borderPos = getBorderPoint(currentAngle)

        const x = isHovering ? borderPos.x : orbitX
        const y = isHovering ? borderPos.y : orbitY
        const scale = isHovering ? 1.5 : 1

        return (
          <div
            key={particle.id}
            className={`magnetize-button__particle ${isHovering ? "magnetize-button__particle--attracting" : ""}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              borderRadius: '50%',
              pointerEvents: 'none',
              transform: `translate(${x - particle.size/2}px, ${y - particle.size/2}px) scale(${scale})`,
              transition: isHovering ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              background: `radial-gradient(circle at 30% 30%, hsl(${particle.hue}, 100%, 85%), hsl(${particle.hue}, 100%, 55%))`,
              boxShadow: `0 0 ${8 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 60%, 0.9), 0 0 ${16 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 50%, 0.6)`,
            }}
          />
        )
      })}
      <span className="magnetize-button__content">{children}</span>
    </button>
  )
}
