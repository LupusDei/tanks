import { motion } from "framer-motion"
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
  // Orbital parameters
  orbitRadius: number // Base distance from center
  orbitSpeed: number // Angular velocity (seconds per full rotation)
  startAngle: number // Starting angle in degrees
  wobbleAmount: number // How much the radius varies
  wobbleSpeed: number // Wobble frequency
  // Visual properties
  size: number
  hue: number
  glowIntensity: number
}

// Button dimensions for border calculations
const BUTTON_HALF_WIDTH = 110
const BUTTON_HALF_HEIGHT = 32
const BORDER_OUTSET = 12 // Distance outside button edge

// Calculate the point just OUTSIDE the button border for a given angle
function getBorderPoint(angleDeg: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  // Find where ray intersects rectangle, then push outward
  let x: number, y: number

  // Determine which edge the ray hits first
  const tanAngle = Math.abs(sin / (cos || 0.0001))
  const aspectRatio = BUTTON_HALF_HEIGHT / BUTTON_HALF_WIDTH

  if (tanAngle < aspectRatio) {
    // Hits left or right edge
    x = cos > 0 ? BUTTON_HALF_WIDTH + BORDER_OUTSET : -(BUTTON_HALF_WIDTH + BORDER_OUTSET)
    y = sin * (BUTTON_HALF_WIDTH + BORDER_OUTSET)
  } else {
    // Hits top or bottom edge
    y = sin > 0 ? BUTTON_HALF_HEIGHT + BORDER_OUTSET : -(BUTTON_HALF_HEIGHT + BORDER_OUTSET)
    x = cos * (BUTTON_HALF_HEIGHT + BORDER_OUTSET) / (Math.abs(sin) || 0.0001)
    // Clamp x to not exceed the corners
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

  // Animation loop for orbital motion
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

  // Generate particles once
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      orbitRadius: 90 + Math.random() * 50, // 90-140px from center
      orbitSpeed: 15 + Math.random() * 10, // 15-25 seconds per rotation
      startAngle: (i / particleCount) * 360 + Math.random() * 20, // Spread around + jitter
      wobbleAmount: 8 + Math.random() * 12, // 8-20px wobble
      wobbleSpeed: 0.5 + Math.random() * 0.5, // Wobble frequency
      size: 5 + Math.random() * 5, // 5-10px
      hue: 120 + Math.random() * 60, // Green-cyan spectrum
      glowIntensity: 0.6 + Math.random() * 0.8,
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
      style={{ overflow: 'visible' }}
    >
      {particles.map((particle) => {
        // Calculate current orbital position
        const currentAngle = particle.startAngle + (time / particle.orbitSpeed) * 360
        const wobble = Math.sin(time * particle.wobbleSpeed * Math.PI * 2) * particle.wobbleAmount
        const currentRadius = particle.orbitRadius + wobble

        // Convert to cartesian for orbital position
        const angleRad = (currentAngle * Math.PI) / 180
        const orbitX = Math.cos(angleRad) * currentRadius
        const orbitY = Math.sin(angleRad) * currentRadius

        // Get border position for attraction
        const borderPos = getBorderPoint(currentAngle)

        // Choose position based on hover state
        const targetX = isHovering ? borderPos.x : orbitX
        const targetY = isHovering ? borderPos.y : orbitY

        return (
          <motion.div
            key={particle.id}
            animate={{
              x: targetX,
              y: targetY,
              scale: isHovering ? 1.4 : 1,
            }}
            transition={
              isHovering
                ? { type: "spring", stiffness: 120, damping: 14 }
                : { type: "tween", duration: 0.05, ease: "linear" }
            }
            className={`magnetize-button__particle ${isHovering ? "magnetize-button__particle--attracting" : ""}`}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              marginLeft: `${-particle.size / 2}px`,
              marginTop: `${-particle.size / 2}px`,
              background: `radial-gradient(circle at 30% 30%, hsl(${particle.hue}, 100%, 80%), hsl(${particle.hue}, 100%, 50%))`,
              boxShadow: `0 0 ${6 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 60%, 0.8), 0 0 ${12 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 50%, 0.5)`,
            }}
          />
        )
      })}
      <span className="magnetize-button__content">{children}</span>
    </button>
  )
}
