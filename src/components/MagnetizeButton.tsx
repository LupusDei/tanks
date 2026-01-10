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
  baseOffset: number // How far beyond min safe distance (8-25px)
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
const MIN_BUFFER = 11 // Minimum distance outside button edge when orbiting
const HOVER_INSET = 8 // Distance inside button edge when hovering

// Get distance from center to button edge at a given angle
function getEdgeDistance(angleDeg: number): number {
  const angleRad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  const tanAngle = Math.abs(sin / (cos || 0.0001))
  const aspectRatio = BUTTON_HALF_HEIGHT / BUTTON_HALF_WIDTH

  if (tanAngle < aspectRatio) {
    // Hits left or right edge
    return Math.abs(BUTTON_HALF_WIDTH / cos)
  } else {
    // Hits top or bottom edge
    return Math.abs(BUTTON_HALF_HEIGHT / sin)
  }
}

// Get point just inside button border for hover state
function getBorderPoint(angleDeg: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  const distance = getEdgeDistance(angleDeg) - HOVER_INSET
  return {
    x: Math.cos(angleRad) * distance,
    y: Math.sin(angleRad) * distance,
  }
}

export function MagnetizeButton({
  onClick,
  children,
  particleCount = 56,
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
      baseOffset: MIN_BUFFER + Math.random() * 36, // 11-47px beyond button edge (+50% outer)
      orbitSpeed: 25 + Math.random() * 20, // Slower orbit (25-45 sec per rotation)
      startAngle: (i / particleCount) * 360 + Math.random() * 15,
      wobbleAmount: 3 + Math.random() * 6, // Smaller wobble (3-9px)
      wobbleSpeed: 0.2 + Math.random() * 0.3,
      size: 0.75 + Math.random() * 0.75, // Tiny particles (0.75-1.5px)
      hue: 120 + Math.random() * 60,
      glowIntensity: 0.5 + Math.random() * 0.5,
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

        // Calculate orbit radius based on edge distance at current angle
        const edgeDist = getEdgeDistance(currentAngle)
        const orbitRadius = edgeDist + particle.baseOffset + wobble

        const angleRad = (currentAngle * Math.PI) / 180
        const orbitX = Math.cos(angleRad) * orbitRadius
        const orbitY = Math.sin(angleRad) * orbitRadius

        const borderPos = getBorderPoint(currentAngle)

        const x = isHovering ? borderPos.x : orbitX
        const y = isHovering ? borderPos.y : orbitY
        const scale = isHovering ? 1.3 : 1

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
              transition: isHovering ? 'transform 0.2s ease-in-out' : 'none',
              background: `radial-gradient(circle at 30% 30%, hsl(${particle.hue}, 100%, 85%), hsl(${particle.hue}, 100%, 55%))`,
              boxShadow: `0 0 ${6 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 60%, 0.9), 0 0 ${10 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 50%, 0.5)`,
            }}
          />
        )
      })}
      <span className="magnetize-button__content">{children}</span>
    </button>
  )
}
